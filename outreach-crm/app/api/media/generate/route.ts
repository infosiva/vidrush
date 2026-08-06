import { NextRequest, NextResponse } from 'next/server'
import { generateImage, generateVideo, generateCarousel } from '@/lib/media-gen'

// Shared media generation endpoint — image / video / carousel, free-first.
// POST { type: 'image' | 'video' | 'carousel', prompt: string | string[], ...opts }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.type || !body.prompt) {
    return NextResponse.json({ error: 'type and prompt required' }, { status: 400 })
  }

  try {
    if (body.type === 'image') {
      const result = await generateImage(body.prompt, body.options)
      return NextResponse.json(result)
    }
    if (body.type === 'video') {
      const result = await generateVideo(body.prompt, body.options)
      return NextResponse.json(result)
    }
    if (body.type === 'carousel') {
      if (!Array.isArray(body.prompt)) {
        return NextResponse.json({ error: 'carousel requires prompt: string[]' }, { status: 400 })
      }
      const result = await generateCarousel(body.prompt, body.options)
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'type must be image, video, or carousel' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'generation failed' }, { status: 500 })
  }
}
