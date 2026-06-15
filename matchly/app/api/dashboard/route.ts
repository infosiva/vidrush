import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { inArray } from 'drizzle-orm'
import { API_LIMITER } from '@/lib/rateLimit'

export const runtime = 'nodejs'

// GET /api/dashboard?token=XXX — returns all tournaments owned by this token
// token can be a single editToken OR a comma-separated list (multi-tournament organisers)
export async function GET(req: NextRequest) {
  const limited = API_LIMITER.check(req)
  if (limited) return limited

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  try {
    const tokens = token.split(',').map(t => t.trim()).filter(Boolean)

    const tournaments = await db.select().from(schema.tournaments)
      .where(inArray(schema.tournaments.editToken, tokens))

    if (!tournaments.length) return NextResponse.json({ tournaments: [] })

    const tournamentIds = tournaments.map(t => t.id)

    const [teams, matches] = await Promise.all([
      db.select().from(schema.teams).where(inArray(schema.teams.tournamentId, tournamentIds)),
      db.select().from(schema.matches).where(inArray(schema.matches.tournamentId, tournamentIds)),
    ])

    const enriched = tournaments.map(t => {
      const tTeams = teams.filter(tm => tm.tournamentId === t.id)
      const tMatches = matches.filter(m => m.tournamentId === t.id)
      return {
        id: t.id, slug: t.slug, name: t.name, sport: t.sport,
        status: t.status, createdAt: t.createdAt, editToken: t.editToken,
        teamCount: tTeams.length,
        matchesPlayed: tMatches.filter(m => m.status === 'completed').length,
        matchesLive: tMatches.filter(m => m.status === 'live').length,
        matchesTotal: tMatches.length,
      }
    })

    return NextResponse.json({ tournaments: enriched })
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
