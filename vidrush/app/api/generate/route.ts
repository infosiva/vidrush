import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string }
    if (!prompt?.trim()) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      console.error('[vidrush][generate] FAL_KEY not set')
      return NextResponse.json({ error: 'Video generation not configured' }, { status: 503 })
    }

    // Submit job to fal.ai Kling v1.5 text-to-video
    const submitRes = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.5/standard/text-to-video', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: '5',
        aspect_ratio: '16:9',
      }),
    })

    if (!submitRes.ok) {
      const text = await submitRes.text()
      console.error('[vidrush][generate] fal submit error', submitRes.status, text)
      return NextResponse.json({ error: 'Failed to submit video job' }, { status: 502 })
    }

    const submitData = await submitRes.json()
    const requestId = submitData.request_id

    if (!requestId) {
      console.error('[vidrush][generate] no request_id from fal', submitData)
      return NextResponse.json({ error: 'Invalid response from video service' }, { status: 502 })
    }

    // Poll for result (max 90s, every 5s)
    const maxAttempts = 18
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const pollRes = await fetch(`https://queue.fal.run/fal-ai/kling-video/v1.5/standard/text-to-video/requests/${requestId}`, {
        headers: { Authorization: `Key ${falKey}` },
      })
      if (!pollRes.ok) continue
      const pollData = await pollRes.json()

      if (pollData.status === 'COMPLETED' || pollData.video) {
        const url = pollData.video?.url || pollData.output?.video?.url
        if (url) return NextResponse.json({ url })
      }
      if (pollData.status === 'FAILED') {
        console.error('[vidrush][generate] fal job failed', pollData)
        return NextResponse.json({ error: 'Video generation failed' }, { status: 502 })
      }
    }

    console.error('[vidrush][generate] timeout waiting for video', requestId)
    return NextResponse.json({ error: 'Generation timed out — try again' }, { status: 504 })
  } catch (err) {
    console.error('[vidrush][generate]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
