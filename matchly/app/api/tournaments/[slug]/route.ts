import { NextRequest, NextResponse } from 'next/server'
import { getTournamentBySlug, getTeamsByTournament, getMatchesByTournament, computePointsTable } from '@/lib/queries'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  }

  try {
    const tournament = await getTournamentBySlug(slug)
    if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [teams, matches] = await Promise.all([
      getTeamsByTournament(tournament.id),
      getMatchesByTournament(tournament.id),
    ])

    const liveMatch = matches.find(m => m.status === 'live') ?? null
    const completed = matches.filter(m => m.status === 'completed')
    const scheduled = matches.filter(m => m.status === 'scheduled')
    const pointsTable = computePointsTable(teams, matches)

    return NextResponse.json({
      tournament: { id: tournament.id, slug: tournament.slug, name: tournament.name, sport: tournament.sport, status: tournament.status, createdAt: tournament.createdAt },
      teams,
      liveMatch,
      completed,
      scheduled,
      pointsTable,
    })
  } catch (err) {
    console.error('[GET /api/tournaments/[slug]]', err)
    return NextResponse.json({ error: 'Failed to load tournament' }, { status: 500 })
  }
}
