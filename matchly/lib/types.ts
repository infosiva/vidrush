export type Sport = 'cricket' | 'football' | 'badminton' | 'kabaddi'

export interface Team {
  id: string
  name: string
  shortName: string
}

export interface PointsTableRow {
  teamId: string
  played: number
  won: number
  lost: number
  drawn: number
  points: number
  /** Cricket: net run rate. Other sports: goal/point difference. */
  diff: number
}

export interface CricketInnings {
  teamId: string
  runs: number
  wickets: number
  overs: number
}

export interface Match {
  id: string
  tournamentId: string
  sport: Sport
  teamAId: string
  teamBId: string
  status: 'upcoming' | 'live' | 'completed'
  startTime: string
  venue?: string
  /** Cricket-specific live score */
  innings?: CricketInnings[]
  /** Generic score for non-cricket sports */
  scoreA?: number
  scoreB?: number
  result?: string
  commentary?: string[]
}

export interface Tournament {
  id: string
  slug: string
  name: string
  sport: Sport
  teams: Team[]
  matches: Match[]
  pointsTable: PointsTableRow[]
  createdAt: string
}
