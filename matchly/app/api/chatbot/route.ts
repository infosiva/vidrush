import { AI_LIMITER } from '@/lib/rateLimit'
import { SYSTEM_PROMPT } from '@/components/ChatBot'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

let _groq: Groq | null = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  return _groq
}

export const runtime = 'nodejs'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req)
  if (limited) return limited

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'Chatbot unavailable' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const messages: Message[] = body.messages

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const chatMessages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: Message) => ({ role: m.role, content: m.content })),
    ]

    const stream = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: chatMessages,
      max_tokens: 300,
      temperature: 0.7,
      stream: true,
    })

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[/api/chatbot]', err)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
