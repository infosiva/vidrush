import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string }
    if (!prompt?.trim()) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const systemPrompt = `You are a cinematic AI video prompt enhancer.
Take a user's rough scene description and expand it into a vivid, detailed cinematic prompt suitable for AI video generation.
Include: camera movement, lighting conditions, color palette, mood, pacing.
Output only the enhanced prompt — no explanation, no labels, just the enhanced text. Max 3 sentences.`

    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const enhanced = data.choices?.[0]?.message?.content?.trim()
        if (enhanced) return NextResponse.json({ enhanced })
      } else {
        console.error('[vidrush][enhance] Groq error', res.status, await res.text())
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser prompt: ${prompt}` }] }],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (enhanced) return NextResponse.json({ enhanced })
      } else {
        console.error('[vidrush][enhance] Gemini error', res.status, await res.text())
      }
    }

    // Fallback: return original prompt
    return NextResponse.json({ enhanced: prompt })
  } catch (err) {
    console.error('[vidrush][enhance]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
