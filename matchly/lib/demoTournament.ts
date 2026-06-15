import { Tournament } from './types'

/**
 * Demo tournament used to drive the live-ticker animation on the landing page.
 * Not real user data — illustrates the product, not a fabricated stat (§20).
 */
export const DEMO_TOURNAMENT: Tournament = {
  id: 'demo',
  slug: 'sunday-premier-league',
  name: 'Sunday Premier League',
  sport: 'cricket',
  teams: [
    { id: 'royals', name: 'Riverside Royals', shortName: 'RR' },
    { id: 'titans', name: 'Lakeview Titans', shortName: 'LT' },
    { id: 'falcons', name: 'Oakwood Falcons', shortName: 'OF' },
    { id: 'strikers', name: 'Hilltop Strikers', shortName: 'HS' },
  ],
  matches: [
    {
      id: 'm1',
      tournamentId: 'demo',
      sport: 'cricket',
      teamAId: 'royals',
      teamBId: 'titans',
      status: 'live',
      startTime: new Date().toISOString(),
      venue: 'Riverside Ground',
      innings: [
        { teamId: 'royals', runs: 142, wickets: 3, overs: 12.4 },
      ],
      commentary: [
        'WICKET! Clean bowled — great yorker.',
        'FOUR! Driven through the covers.',
        'SIX! Lofted over long-on.',
      ],
    },
  ],
  pointsTable: [
    { teamId: 'falcons', played: 4, won: 4, lost: 0, drawn: 0, points: 8, diff: 1.84 },
    { teamId: 'titans', played: 4, won: 3, lost: 1, drawn: 0, points: 6, diff: 0.92 },
    { teamId: 'royals', played: 4, won: 2, lost: 2, drawn: 0, points: 4, diff: 0.15 },
    { teamId: 'strikers', played: 4, won: 0, lost: 4, drawn: 0, points: 0, diff: -1.41 },
  ],
  createdAt: new Date().toISOString(),
}
