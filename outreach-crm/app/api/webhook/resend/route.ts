export const dynamic = 'force-dynamic'
// Resend webhook — handles opens, clicks, bounces, inbound replies
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { threads, messages, leads, emailEvents } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('svix-secret') ?? req.headers.get('webhook-secret')
  if (secret !== process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = await req.json()
  const type: string = event.type ?? ''
  const resendId: string = event.data?.email_id ?? event.data?.id ?? ''

  // Log raw event
  await db.insert(emailEvents).values({
    resendId,
    type,
    data: JSON.stringify(event.data),
  }).catch(() => {})

  // Handle specific event types
  if (type === 'email.opened') {
    await db.update(threads)
      .set({ status: 'opened', openedAt: new Date() })
      .where(eq(threads.resendId, resendId))
    await db.update(leads)
      .set({ status: 'contacted', updatedAt: new Date() })

  } else if (type === 'email.bounced' || type === 'email.complained') {
    await db.update(threads)
      .set({ status: 'bounced' })
      .where(eq(threads.resendId, resendId))
    // Find lead via thread and mark bounced
    const thread = await db.query.threads.findFirst({
      where: (t, { eq: eqFn }) => eqFn(t.resendId, resendId),
    })
    if (thread) {
      await db.update(leads)
        .set({ status: 'bounced', updatedAt: new Date() })
        .where(eq(leads.id, thread.leadId))
    }

  } else if (type === 'email.unsubscribed') {
    const thread = await db.query.threads.findFirst({
      where: (t, { eq: eqFn }) => eqFn(t.resendId, resendId),
    })
    if (thread) {
      await db.update(leads)
        .set({ status: 'unsubscribed', updatedAt: new Date() })
        .where(eq(leads.id, thread.leadId))
    }

  } else if (type === 'inbound.email') {
    // Inbound reply from lead
    const toEmail: string = event.data?.to?.[0]?.email ?? ''
    const fromEmail: string = event.data?.from?.email ?? ''
    const subject: string = event.data?.subject ?? ''
    const body: string = event.data?.text ?? event.data?.html ?? ''

    // Find thread by lead email
    const lead = await db.query.leads.findFirst({
      where: (l, { eq: eqFn }) => eqFn(l.email, fromEmail),
      with: { threads: { orderBy: (t: any, { desc }: any) => [desc(t.createdAt)], limit: 1 } },
    })

    if (lead && (lead as any).threads?.[0]) {
      const thread = (lead as any).threads[0]

      // Save inbound message
      await db.insert(messages).values({
        threadId:  thread.id,
        direction: 'inbound',
        from:      fromEmail,
        to:        toEmail,
        subject,
        body,
      })

      // Update thread + lead status
      await db.update(threads)
        .set({ status: 'replied', repliedAt: new Date() })
        .where(eq(threads.id, thread.id))

      await db.update(leads)
        .set({ status: 'replied', updatedAt: new Date() })
        .where(eq(leads.id, lead.id))
    }
  }

  return NextResponse.json({ ok: true })
}
