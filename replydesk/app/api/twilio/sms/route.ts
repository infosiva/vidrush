import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { twimlEmpty } from '@/lib/twilio'
import { triggerAIReply } from '@/lib/ai-reply'
import { AI_LIMITER } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  const body = await req.formData()
  const from = body.get('From') as string
  const msgBody = body.get('Body') as string
  const businessId = process.env.BUSINESS_ID!

  const contact = await db.contact.upsert({
    where: { businessId_phone: { businessId, phone: from } },
    create: { businessId, phone: from },
    update: {},
  })

  const event = await db.contactEvent.create({
    data: {
      contactId: contact.id,
      type: 'SMS_INBOUND',
      direction: 'INBOUND',
      raw: msgBody,
    },
  })

  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })

  if (business.officeStatus === 'CLOSED') {
    triggerAIReply(event.id, contact, business).catch(console.error)
  }

  return new NextResponse(twimlEmpty(), {
    headers: { 'Content-Type': 'application/xml' },
  })
}
