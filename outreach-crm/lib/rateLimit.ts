import { NextRequest, NextResponse } from 'next/server'

type Entry = { count: number; resetAt: number }
const hits = new Map<string, Entry>()

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

function makeLimiter(max: number, windowMs: number) {
  return {
    check(req: NextRequest): NextResponse | null {
      const ip = getIp(req)
      const now = Date.now()
      const e = hits.get(ip)
      if (!e || now > e.resetAt) {
        hits.set(ip, { count: 1, resetAt: now + windowMs })
        return null
      }
      if (e.count >= max) {
        return NextResponse.json(
          { error: 'Rate limit exceeded, try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((e.resetAt - now) / 1000)) } }
        )
      }
      e.count++
      return null
    },
  }
}

export const AI_LIMITER = makeLimiter(10, 60_000) // 10 req/min
