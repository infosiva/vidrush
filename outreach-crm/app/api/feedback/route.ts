import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type = 'general', rating, message, email, page, site = 'outreach-crm' } = body

    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

    console.log('[feedback]', { site, type, rating, message, email, page })

    const tgToken = process.env.TELEGRAM_BOT_TOKEN
    const tgChat = process.env.TELEGRAM_CHAT_ID
    if (tgToken && tgChat && process.env.TELEGRAM_NOTIFICATIONS_DISABLED !== 'true') {
      const text = `📣 *${site} feedback*\nType: ${type} | Rating: ${rating ?? 'n/a'}\nPage: ${page ?? '/'}\n\n${message}${email ? `\n\nFrom: ${email}` : ''}`
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text, parse_mode: 'Markdown' }),
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
