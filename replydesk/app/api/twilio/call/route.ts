import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { twimlRecord } from '@/lib/twilio'
import { triggerAIReply } from '@/lib/ai-reply'
import { AI_LIMITER } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  const body = await req.formData()
  const from = body.get('From') as string
  const callStatus = body.get('CallStatus') as string
  const businessId = process.env.BUSINESS_ID!

  const contact = await db.contact.upsert({
    where: { businessId_phone: { businessId, phone: from } },
    create: { businessId, phone: from },
    update: {},
  })

  const isMissed = callStatus === 'no-answer' || callStatus === 'busy'
  const eventType = isMissed ? 'CALL_MISSED' : 'CALL_INBOUND'

  const event = await db.contactEvent.create({
    data: {
      contactId: contact.id,
      type: eventType,
      direction: 'INBOUND',
      raw: `${eventType} from ${from} — status: ${callStatus}`,
    },
  })

  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } })

  if (isMissed && business.officeStatus === 'CLOSED') {
    triggerAIReply(event.id, contact, business).catch(console.error)
  }

  return new NextResponse(twimlRecord(), {
    headers: { 'Content-Type': 'application/xml' },
  })
}
