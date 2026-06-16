import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, rating, message, email, page, site } = body
    console.log('[feedback]', { type, rating, message: message?.slice(0, 500), email, page, site })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
