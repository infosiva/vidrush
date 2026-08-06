import { NextRequest, NextResponse } from 'next/server'
import { AI_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const RATE_LIMIT = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string) {
  const now = Date.now()
  const entry = RATE_LIMIT.get(ip)
  if (!entry || now > entry.reset) {
    RATE_LIMIT.set(ip, { count: 1, reset: now + 3600000 })
    return true
  }
  if (entry.count >= 60) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

  const { messages } = await req.json()
  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 503 })

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for OutreachCRM, a B2B outreach and CRM tool. Help users with outreach strategies, CRM tips, and sales workflows. If asked anything outside this scope, respond: "I\'m trained for OutreachCRM. For that, try Google or ChatGPT!"' },
        ...messages.slice(-6),
      ],
      max_tokens: 400,
    }),
  })

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? 'No response'
  return NextResponse.json({ text })
}
