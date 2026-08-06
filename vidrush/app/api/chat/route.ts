import { NextRequest, NextResponse } from 'next/server'
import { AI_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

interface Message { role: 'user' | 'assistant' | 'system'; content: string }

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  try {
    const { messages } = await req.json() as { messages: Message[] }
    if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

    const system = `You are VidBot, the AI assistant for Vidrush — an AI-powered text-to-video generation platform.
Help users create compelling video scripts, choose the right video style, understand generation options, and get the best results from AI video creation.
Keep responses concise, creative, and focused on video content. Max 3 sentences unless detail is needed.`

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
  } catch (err) {
    console.error('[vidrush][chat]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
