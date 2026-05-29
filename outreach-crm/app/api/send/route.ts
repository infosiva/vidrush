import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { leads, threads, messages } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Rate limit: 10 sends/min per user (in-memory, resets on cold start)
const sendCounts = new Map<string, { count: number; reset: number }>()
function checkRateLimit(userId: string, max = 10) {
  const now = Date.now()
  const entry = sendCounts.get(userId)
  if (!entry || now > entry.reset) {
    sendCounts.set(userId, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json({ error: 'Rate limit: 10 emails/min' }, { status: 429 })
  }

  const { leadIds, subject, body, scheduleFollowUp } = await req.json() as {
    leadIds: number[]
    subject: string
    body: string
    scheduleFollowUp?: boolean
  }

  if (!leadIds?.length || !subject || !body) {
    return NextResponse.json({ error: 'leadIds, subject, body required' }, { status: 400 })
  }

  const targetLeads = await db.query.leads.findMany({
    where: (l, { inArray: inArr, eq: eqFn, and }) =>
      and(inArr(l.id, leadIds), eqFn(l.userId, session.user!.id!)),
  })

  const results = []

  for (const lead of targetLeads) {
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.FROM_EMAIL ?? 'siva@outreach.app',
        to:   lead.email,
        subject,
        text: body.replace(/\{name\}/g, lead.name).replace(/\{city\}/g, lead.city ?? ''),
        headers: {
          'X-Lead-Id': String(lead.id),
        },
      })

      if (error) throw new Error(error.message)

      // Create thread
      const [thread] = await db.insert(threads).values({
        leadId:      lead.id,
        userId:      session.user!.id!,
        subject,
        status:      'sent',
        resendId:    data?.id ?? null,
        followUpAt:  scheduleFollowUp ? new Date(Date.now() + 3 * 86400_000) : null,
      }).returning()

      // Save outbound message
      await db.insert(messages).values({
        threadId:  thread.id,
        direction: 'outbound',
        from:      process.env.FROM_EMAIL ?? 'siva@outreach.app',
        to:        lead.email,
        subject,
        body:      body.replace(/\{name\}/g, lead.name).replace(/\{city\}/g, lead.city ?? ''),
        resendId:  data?.id ?? null,
      })

      // Update lead status
      await db.update(leads).set({ status: 'contacted', updatedAt: new Date() })
        .where(eq(leads.id, lead.id))

      results.push({ leadId: lead.id, ok: true, resendId: data?.id })
    } catch (e: any) {
      results.push({ leadId: lead.id, ok: false, error: e.message })
    }
  }

  return NextResponse.json({ results })
}
