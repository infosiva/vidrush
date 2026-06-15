import { eq, desc, and } from 'drizzle-orm'
import { db, schema } from './db'
import type { Match, Team } from './schema'

export async function getTournamentBySlug(slug: string) {
  const rows = await db.select().from(schema.tournaments).where(eq(schema.tournaments.slug, slug)).limit(1)
  return rows[0] ?? null
}

export async function getTeamsByTournament(tournamentId: string) {
  return db.select().from(schema.teams).where(eq(schema.teams.tournamentId, tournamentId))
}

export async function getMatchesByTournament(tournamentId: string) {
  return db.select().from(schema.matches)
    .where(eq(schema.matches.tournamentId, tournamentId))
    .orderBy(desc(schema.matches.createdAt))
}

export async function getLiveMatch(tournamentId: string) {
  const rows = await db.select().from(schema.matches)
    .where(and(eq(schema.matches.tournamentId, tournamentId), eq(schema.matches.status, 'live')))
    .limit(1)
  return rows[0] ?? null
}

export function computePointsTable(teams: Team[], matches: Match[]) {
  const completed = matches.filter(m => m.status === 'completed')
  const map = new Map(teams.map(t => [t.id, {
    teamId: t.id, name: t.name, shortName: t.shortName,
    played: 0, won: 0, lost: 0, tied: 0, points: 0,
    runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, nrr: 0,
  }]))

  for (const m of completed) {
    const a = map.get(m.teamAId)
    const b = map.get(m.teamBId)
    if (!a || !b) continue
    a.played++; b.played++
    if (m.winnerId === m.teamAId) { a.won++; a.points += 2; b.lost++ }
    else if (m.winnerId === m.teamBId) { b.won++; b.points += 2; a.lost++ }
    else { a.tied++; b.tied++; a.points++; b.points++ }
    // NRR for cricket
    if (m.oversA && m.scoreA != null) { a.runsFor += m.scoreA; a.oversFor += m.oversA }
    if (m.oversB && m.scoreB != null) { a.runsAgainst += m.scoreB; a.oversAgainst += m.oversB }
    if (m.oversB && m.scoreB != null) { b.runsFor += m.scoreB; b.oversFor += m.oversB }
    if (m.oversA && m.scoreA != null) { b.runsAgainst += m.scoreA; b.oversAgainst += m.oversA }
  }

  for (const row of map.values()) {
    const rrf = row.oversFor > 0 ? row.runsFor / row.oversFor : 0
    const rra = row.oversAgainst > 0 ? row.runsAgainst / row.oversAgainst : 0
    row.nrr = Math.round((rrf - rra) * 100) / 100
  }

  return [...map.values()].sort((a, b) => b.points - a.points || b.nrr - a.nrr)
}
