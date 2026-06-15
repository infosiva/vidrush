'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type Team = { id: string; name: string; shortName: string }
type Match = {
  id: string; status: string; teamAId: string; teamBId: string; venue?: string | null
  scoreA?: number | null; wicketsA?: number | null; oversA?: number | null
  scoreB?: number | null; wicketsB?: number | null; oversB?: number | null
  goalsA?: number | null; goalsB?: number | null
  winnerId?: string | null; resultNote?: string | null; commentary?: string | null
  completedAt?: string | null; scheduledAt?: string | null
}
type PointsRow = { teamId: string; name: string; shortName: string; played: number; won: number; lost: number; tied: number; points: number; nrr: number }
type TournamentData = {
  tournament: { id: string; slug: string; name: string; sport: string; status: string }
  teams: Team[]; liveMatch: Match | null; completed: Match[]; scheduled: Match[]; pointsTable: PointsRow[]
}

const TABS = ['Live', 'History', 'Points Table', 'Fixtures'] as const
type Tab = typeof TABS[number]

function scoreLine(m: Match, teamId: string, sport: string) {
  if (sport === 'cricket') {
    const isA = m.teamAId === teamId
    const runs = isA ? m.scoreA : m.scoreB
    const wkts = isA ? m.wicketsA : m.wicketsB
    const ovs = isA ? m.oversA : m.oversB
    if (runs == null) return '—'
    return `${runs}/${wkts ?? 0} (${ovs?.toFixed(1) ?? 0} ov)`
  }
  const goals = m.teamAId === teamId ? m.goalsA : m.goalsB
  if (goals == null) return '—'
  return `${goals}`
}

export default function TournamentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<TournamentData | null>(null)
  const [tab, setTab] = useState<Tab>('Live')
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${slug}`)
      if (!res.ok) { setError(res.status === 404 ? 'Tournament not found' : 'Failed to load'); return }
      const d = await res.json()
      setData(d)
      // Auto-switch to Live tab if there's a live match
      if (d.liveMatch) setTab('Live')
    } catch { setError('Failed to load') }
  }, [slug])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll every 15s if there's a live match
  useEffect(() => {
    const id = setInterval(() => { fetchData(); setLastRefresh(Date.now()) }, 15000)
    return () => clearInterval(id)
  }, [fetchData])

  if (error) return (
    <main className="max-w-2xl mx-auto px-5 py-24 text-center">
      <div className="text-5xl mb-4">🏏</div>
      <h1 className="text-2xl font-bold mb-2">{error}</h1>
      <Link href="/" className="btn-secondary">Back home</Link>
    </main>
  )

  if (!data) return (
    <main className="max-w-2xl mx-auto px-5 py-24 text-center opacity-50">
      Loading tournament…
    </main>
  )

  const { tournament, teams, liveMatch, completed, scheduled, pointsTable } = data
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const sport = tournament.sport

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs uppercase tracking-wide opacity-40 font-bold">{sport}</span>
          {liveMatch && (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'var(--accent)' }} />
              LIVE
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold">{tournament.name}</h1>
        <p className="opacity-40 text-xs mt-1">
          {teams.length} teams · Updated {new Date(lastRefresh).toLocaleTimeString()}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--card)' }} role="tablist">
        {TABS.map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#06150e' : 'var(--foreground)',
              opacity: tab === t ? 1 : 0.6,
            }}
          >{t}</button>
        ))}
      </div>

      {/* LIVE TAB */}
      {tab === 'Live' && (
        <div>
          {liveMatch ? (
            <div className="card p-6">
              <div className="text-xs opacity-40 uppercase tracking-wide font-bold mb-4">Live match</div>
              <MatchCard m={liveMatch} teamMap={teamMap} sport={sport} />
              {liveMatch.commentary && (
                <div className="mt-4 pt-4 border-t text-sm opacity-70" style={{ borderColor: 'var(--border-default)' }}>
                  💬 {liveMatch.commentary}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center opacity-50">
              <div className="text-3xl mb-3">⏸</div>
              <p>No live match right now. Check <button className="underline" onClick={() => setTab('Fixtures')}>fixtures</button> for upcoming games.</p>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'History' && (
        <div className="flex flex-col gap-3">
          {completed.length === 0 ? (
            <div className="card p-8 text-center opacity-50">No completed matches yet.</div>
          ) : completed.map(m => (
            <div key={m.id} className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs opacity-40 uppercase font-bold">Completed</span>
                {m.completedAt && <span className="text-xs opacity-40">{new Date(m.completedAt).toLocaleDateString()}</span>}
              </div>
              <MatchCard m={m} teamMap={teamMap} sport={sport} />
              {m.resultNote && <p className="text-xs opacity-60 mt-2">{m.resultNote}</p>}
            </div>
          ))}
        </div>
      )}

      {/* POINTS TABLE */}
      {tab === 'Points Table' && (
        <div className="card p-5 overflow-x-auto">
          {pointsTable.length === 0 ? (
            <p className="text-center opacity-50 py-6">No matches played yet.</p>
          ) : (
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="opacity-40 text-left">
                  <th className="font-medium pb-3">Team</th>
                  <th className="font-medium pb-3 text-center">P</th>
                  <th className="font-medium pb-3 text-center">W</th>
                  <th className="font-medium pb-3 text-center">L</th>
                  <th className="font-medium pb-3 text-center">T</th>
                  <th className="font-medium pb-3 text-center">Pts</th>
                  {sport === 'cricket' && <th className="font-medium pb-3 text-right">NRR</th>}
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((row, i) => (
                  <tr key={row.teamId} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <td className="py-2.5 font-semibold">
                      <span className="text-xs opacity-30 mr-2">{i + 1}</span>{row.name}
                    </td>
                    <td className="py-2.5 text-center tabular-nums">{row.played}</td>
                    <td className="py-2.5 text-center tabular-nums">{row.won}</td>
                    <td className="py-2.5 text-center tabular-nums">{row.lost}</td>
                    <td className="py-2.5 text-center tabular-nums">{row.tied}</td>
                    <td className="py-2.5 text-center font-bold tabular-nums" style={{ color: 'var(--accent-2)' }}>{row.points}</td>
                    {sport === 'cricket' && (
                      <td className="py-2.5 text-right tabular-nums">{row.nrr > 0 ? '+' : ''}{row.nrr.toFixed(2)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* FIXTURES */}
      {tab === 'Fixtures' && (
        <div className="flex flex-col gap-3">
          {scheduled.length === 0 ? (
            <div className="card p-8 text-center opacity-50">No upcoming fixtures.</div>
          ) : scheduled.map(m => (
            <div key={m.id} className="card p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{teamMap.get(m.teamAId)?.name} vs {teamMap.get(m.teamBId)?.name}</p>
                  {m.venue && <p className="text-xs opacity-50 mt-0.5">📍 {m.venue}</p>}
                </div>
                {m.scheduledAt && (
                  <span className="text-xs opacity-40 shrink-0 ml-4">{new Date(m.scheduledAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function MatchCard({ m, teamMap, sport }: { m: Match; teamMap: Map<string, Team>; sport: string }) {
  const tA = teamMap.get(m.teamAId)
  const tB = teamMap.get(m.teamBId)
  const isAWinner = m.winnerId === m.teamAId
  const isBWinner = m.winnerId === m.teamBId

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 text-right">
        <p className="font-bold" style={{ color: isAWinner ? 'var(--accent-2)' : 'inherit' }}>{tA?.name ?? '?'}</p>
        <p className="text-xl font-extrabold tabular-nums">{scoreLine(m, m.teamAId, sport)}</p>
      </div>
      <div className="text-xs opacity-40 font-bold shrink-0">VS</div>
      <div className="flex-1 text-left">
        <p className="font-bold" style={{ color: isBWinner ? 'var(--accent-2)' : 'inherit' }}>{tB?.name ?? '?'}</p>
        <p className="text-xl font-extrabold tabular-nums">{scoreLine(m, m.teamBId, sport)}</p>
      </div>
    </div>
  )
}
