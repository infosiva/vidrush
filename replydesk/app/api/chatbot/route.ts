import { NextRequest } from 'next/server'
import { AI_LIMITER } from '@/lib/rateLimit'

export const runtime = 'edge'

const SYSTEM = `You are ReplyDesk Assistant, a helpful AI for ReplyDesk — an AI-powered front desk and customer support automation platform.
Help users understand how ReplyDesk handles customer support 24/7, answers calls, replies to emails, and automates reception tasks.
Be concise, friendly, and solution-focused. Keep replies under 120 words.`

export async function POST(req: NextRequest) {
  const limited = AI_LIMITER.check(req); if (limited) return limited

  const { messages } = await req.json()
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return new Response('No API key', { status: 500 })

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      stream: true,
      max_tokens: 300,
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
    }),
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          const data = line.replace(/^data: /, '').trim()
          if (!data || data === '[DONE]') continue
          try {
            const token = JSON.parse(data).choices?.[0]?.delta?.content
            if (token) controller.enqueue(encoder.encode(token))
          } catch {}
        }
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
