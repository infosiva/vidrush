import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { API_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  }

  try {
    const { tournamentId, teamAId, teamBId, venue, scheduledAt, token } = await req.json()

    if (!tournamentId || !teamAId || !teamBId) {
      return NextResponse.json({ error: 'tournamentId, teamAId, teamBId required' }, { status: 400 })
    }
    if (teamAId === teamBId) {
      return NextResponse.json({ error: 'teams must be different' }, { status: 400 })
    }

    // Validate edit token
    const rows = await db.select({ editToken: schema.tournaments.editToken })
      .from(schema.tournaments).where(eq(schema.tournaments.id, tournamentId)).limit(1)
    if (!rows[0] || rows[0].editToken !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const id = generateId()
    await db.insert(schema.matches).values({
      id, tournamentId, teamAId, teamBId,
      venue: venue ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: 'scheduled',
    })

    return NextResponse.json({ id, status: 'scheduled' })
  } catch (err) {
    console.error('[POST /api/matches]', err)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}
