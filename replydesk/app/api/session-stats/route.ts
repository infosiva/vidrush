import { NextResponse } from 'next/server'

let sessionCounts = { repliesGenerated: 0, emailsProcessed: 0, timeSaved: 0 }

export async function GET() { return NextResponse.json(sessionCounts) }

export async function POST(req: Request) {
  const { event } = await req.json()
  if (event === 'reply_generated') { sessionCounts.repliesGenerated++; sessionCounts.timeSaved += 3 }
  if (event === 'email_processed') sessionCounts.emailsProcessed++
  return NextResponse.json({ ok: true })
}
