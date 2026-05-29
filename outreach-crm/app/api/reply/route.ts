import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { threads, messages, leads } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { threadId, body } = await req.json() as { threadId: number; body: string }
  if (!threadId || !body) return NextResponse.json({ error: 'threadId + body required' }, { status: 400 })

  const thread = await db.query.threads.findFirst({
    where: (t, { eq: eqFn, and }) => and(eqFn(t.id, threadId), eqFn(t.userId, session.user!.id!)),
    with: { lead: true },
  })
  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const { data, error } = await resend.emails.send({
    from:    process.env.FROM_EMAIL ?? 'siva@outreach.app',
    to:      (thread as any).lead.email,
    subject: `Re: ${thread.subject}`,
    text:    body,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.insert(messages).values({
    threadId:  thread.id,
    direction: 'outbound',
    from:      process.env.FROM_EMAIL ?? 'siva@outreach.app',
    to:        (thread as any).lead.email,
    subject:   `Re: ${thread.subject}`,
    body,
    resendId:  data?.id ?? null,
  })

  return NextResponse.json({ ok: true, resendId: data?.id })
}

// GET /api/reply?threadId=X — fetch all messages in thread
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threadId = parseInt(new URL(req.url).searchParams.get('threadId') ?? '0')
  if (!threadId) return NextResponse.json({ error: 'threadId required' }, { status: 400 })

  const thread = await db.query.threads.findFirst({
    where: (t, { eq: eqFn, and }) => and(eqFn(t.id, threadId), eqFn(t.userId, session.user!.id!)),
    with: {
      lead:     true,
      messages: { orderBy: (m: any, { asc }: any) => [asc(m.sentAt)] },
    },
  })
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(thread)
}
