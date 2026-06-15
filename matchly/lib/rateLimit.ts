import { NextRequest, NextResponse } from 'next/server'

interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of store) if (v.resetAt < now) store.delete(k)
  }, 5 * 60 * 1000)
}

export function rateLimit(opts: { windowMs?: number; max?: number; message?: string } = {}) {
  const windowMs = opts.windowMs ?? 60_000
  const max      = opts.max ?? 20
  const msg      = opts.message ?? 'Too many requests — please try again later.'

  return {
    check(req: NextRequest): NextResponse | null {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
      const now = Date.now()
      const e = store.get(ip)
      if (!e || e.resetAt < now) { store.set(ip, { count: 1, resetAt: now + windowMs }); return null }
      e.count++
      if (e.count > max) {
        return NextResponse.json({ error: msg }, {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((e.resetAt - now) / 1000)) },
        })
      }
      return null
    },
  }
}

export const AI_LIMITER  = rateLimit({ windowMs: 60_000, max: 10, message: 'AI rate limit — max 10/min. Sign in for unlimited access.' })
export const API_LIMITER = rateLimit({ windowMs: 60_000, max: 30 })

