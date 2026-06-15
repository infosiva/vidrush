import { API_LIMITER } from '@/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

interface FeedbackPayload {
  site?: string
  type: string
  rating: number
  message: string
  email?: string
  page?: string
}

export async function POST(req: NextRequest) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  let body: FeedbackPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, rating, message, email, page } = body

  if (!message || message.trim().length < 5) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 })
  }
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  }

  const entry = {
    id: crypto.randomUUID(),
    site: 'Matchly',
    type: type ?? 'General',
    rating,
    message: message.trim(),
    email: email?.trim() || null,
    page: page ?? '/',
    createdAt: new Date().toISOString(),
  }

  console.log('[feedback]', JSON.stringify(entry))

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (botToken && chatId) {
    const stars = '⭐'.repeat(rating)
    const text = [
      `🏆 *New Feedback — Matchly*`,
      `${stars} ${rating}/5 · ${entry.type}`,
      `📄 ${entry.page}`,
      ``,
      entry.message,
      entry.email ? `\n📧 ${entry.email}` : '',
    ].filter(Boolean).join('\n')

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, id: entry.id })
}
