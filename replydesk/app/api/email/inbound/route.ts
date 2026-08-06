import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { triggerAIReply } from '@/lib/ai-reply'
import { AI_LIMITER } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  const body = await req.formData()
  const from = body.get('from') as string
  const subject = body.get('subject') as string
  const text = body.get('text') as string
  const businessId = process.env.BUSINESS_ID!

  // Extract email from "Name <email>" format
  const emailMatch = from.match(/<(.+?)>/) ?? [null, from]
  const emailAddr = emailMatch[1]!.trim()
  const displayName = from.includes('<') ? from.split('<')[0].trim() : null

  const contact = await db.contact.upsert({
    where: { businessId_email: { businessId, email: emailAddr } },
    create: { businessId, email: emailAddr, name: displayName },
    update: {},
  })

  const raw = `Subject: ${subject}\n\n${text}`

  const event = await db.contactEvent.create({
    data: {
      contactId: contact.id,
      type: 'EMAIL_INBOUND',
      direction: 'INBOUND',
      raw,
    },
  })

  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })

  if (business.officeStatus === 'CLOSED') {
    triggerAIReply(event.id, contact, business).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
