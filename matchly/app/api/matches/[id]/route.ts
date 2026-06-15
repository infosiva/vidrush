import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { API_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { token, status, scoreA, wicketsA, oversA, scoreB, wicketsB, oversB, goalsA, goalsB, winnerId, resultNote, commentary } = body

    // Validate token via tournament join
    const rows = await db.select({ editToken: schema.tournaments.editToken })
      .from(schema.matches)
      .innerJoin(schema.tournaments, eq(schema.matches.tournamentId, schema.tournaments.id))
      .where(eq(schema.matches.id, id))
      .limit(1)

    if (!rows[0] || rows[0].editToken !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    const update: Record<string, unknown> = {}
    if (status !== undefined) update.status = status
    if (scoreA !== undefined) update.scoreA = scoreA
    if (wicketsA !== undefined) update.wicketsA = wicketsA
    if (oversA !== undefined) update.oversA = oversA
    if (scoreB !== undefined) update.scoreB = scoreB
    if (wicketsB !== undefined) update.wicketsB = wicketsB
    if (oversB !== undefined) update.oversB = oversB
    if (goalsA !== undefined) update.goalsA = goalsA
    if (goalsB !== undefined) update.goalsB = goalsB
    if (winnerId !== undefined) update.winnerId = winnerId
    if (resultNote !== undefined) update.resultNote = resultNote
    if (commentary !== undefined) update.commentary = commentary
    if (status === 'completed') update.completedAt = new Date()

    await db.update(schema.matches).set(update).where(eq(schema.matches.id, id))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/matches/[id]]', err)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
