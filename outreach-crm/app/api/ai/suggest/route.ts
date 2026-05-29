// AI email suggestion — given lead info, suggest subject + body using Groq
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const GROQ_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadName, leadCity, leadCategory, product, tone = 'friendly' } = await req.json()

  if (!GROQ_KEY) {
    // Fallback static suggestions if Groq key not set
    return NextResponse.json({
      subject: `Quick question about ${leadCategory} businesses in ${leadCity}`,
      body: `Hi ${leadName},\n\nI came across your business in ${leadCity} and thought you might find this useful.\n\nWe've built a tool specifically for ${leadCategory} businesses — it takes about 2 minutes to try and it's free.\n\nWould it be okay to share a quick link?\n\nBest,\n{sender_name}`,
    })
  }

  const prompt = `Write a short cold outreach email (max 80 words) for a ${leadCategory} business called "${leadName}" in ${leadCity}.
We're promoting: ${product}.
Tone: ${tone}.
Format: subject line on first line, then blank line, then email body.
No fake stats. No "I hope this finds you well". Direct and specific.
End with just the first name signature placeholder: {sender_name}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    const lines = text.split('\n')
    const subject = lines[0].replace(/^subject:\s*/i, '').trim()
    const body = lines.slice(2).join('\n').trim()
    return NextResponse.json({ subject, body })
  } catch {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }
}
