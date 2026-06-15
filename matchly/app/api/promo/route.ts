import { NextRequest, NextResponse } from 'next/server'
import { validatePromoCode } from '@/lib/promoCode'
import { API_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  try {
    const { code } = await req.json()
    if (!code) return NextResponse.json({ valid: false }, { status: 400 })

    const entry = validatePromoCode(code)
    if (!entry) return NextResponse.json({ valid: false, message: 'Invalid or expired code' })

    const res = NextResponse.json({ valid: true, daysUnlocked: entry.daysUnlocked, feature: entry.feature })
    res.cookies.set('promo_unlocked', JSON.stringify({ ...entry, activatedAt: Date.now() }), {
      maxAge: entry.daysUnlocked * 86400,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[POST /api/promo]', err)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
