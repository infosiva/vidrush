import { NextRequest, NextResponse } from 'next/server'
import { AI_LIMITER } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  try {
    const { message } = await req.json()
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) return NextResponse.json({ reply: 'Chat unavailable — try again later.' })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 400,
        messages: [
          { role: 'system', content: 'You are PhotoBot, an assistant for PhotoRestore — an AI photo restoration tool. Help users restore old, damaged, or faded photos using AI. If asked anything outside photo restoration, respond: "I\'m trained for PhotoRestore. For that, try Google or ChatGPT!"' },
          { role: 'user', content: message }
        ]
      })
    })
    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || 'Happy to help with photo restoration!'
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ reply: 'Try again in a moment!' })
  }
}
