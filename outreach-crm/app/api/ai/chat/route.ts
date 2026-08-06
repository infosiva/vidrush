import { NextRequest, NextResponse } from 'next/server'
import { AI_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

interface Message { role: 'user' | 'assistant' | 'system'; content: string }

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  try {
    const { messages } = await req.json() as { messages: Message[] }
    if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

    const system = `You are OutreachBot, the AI assistant for Outreach CRM — an AI-powered sales outreach and lead management platform.
Help users write cold emails, manage leads, craft follow-up sequences, and improve their outreach conversion rates.
Keep responses actionable, sales-focused, and concise. Max 3 sentences unless a template or example is needed.`

    const chatMessages = [
      { role: 'system', content: system },
      ...messages.map((m: Message) => ({ role: m.role, content: m.content })),
    ]

    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: chatMessages, max_tokens: 300, temperature: 0.7 }),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ text: data.choices?.[0]?.message?.content ?? '' })
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: chatMessages.map(m => `${m.role}: ${m.content}`).join('\n') }] }] }),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' })
      }
    }

    return NextResponse.json({ text: "I'm having trouble connecting right now. Try again in a moment!" })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
