'use client'

import { useEffect, useState } from 'react'
import { DEMO_TOURNAMENT } from '@/lib/demoTournament'

const TEAMS = Object.fromEntries(DEMO_TOURNAMENT.teams.map(t => [t.id, t]))

// Scripted sequence of "live" deliveries for the demo ticker.
const DELIVERIES = [
  { runs: 1, over: '12.5' },
  { runs: 4, over: '12.6', flash: 'FOUR!' },
  { runs: 0, over: '13.1' },
  { runs: 6, over: '13.2', flash: 'SIX!' },
  { runs: 2, over: '13.3' },
  { runs: 1, over: '13.4' },
]

const COMMENTARY = [
  'FOUR! Driven through the covers, races to the boundary.',
  'SIX! Lofted clean over long-on for maximum.',
  'Dot ball — tight line outside off.',
  'Quick single, good running between the wickets.',
]

export default function LiveScorecardDemo() {
  const [runs, setRuns] = useState(142)
  const [over, setOver] = useState('12.4')
  const [step, setStep] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const [feed, setFeed] = useState<string[]>([COMMENTARY[0]])
  const [tableFlip, setTableFlip] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const next = DELIVERIES[step % DELIVERIES.length]
      setRuns(r => r + next.runs)
      setOver(next.over)
      if (next.flash) {
        setFlash(next.flash)
        setFeed(f => [COMMENTARY[step % COMMENTARY.length], ...f].slice(0, 3))
        setTimeout(() => setFlash(null), 700)
      }
      // Occasionally reshuffle points table to show live update
      if (step % 4 === 3) setTableFlip(f => !f)
      setStep(s => s + 1)
    }, 1800)
    return () => clearInterval(timer)
  }, [step])

  const table = [...DEMO_TOURNAMENT.pointsTable]
  if (tableFlip) [table[0], table[1]] = [table[1], table[0]]

  return (
    <div className="card p-5 flex flex-col gap-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="live-dot" aria-hidden />
          <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Live</span>
        </div>
        <span className="text-xs opacity-50">{DEMO_TOURNAMENT.name}</span>
      </div>

      {/* Scorecard */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold opacity-80">Riverside Royals</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold tabular-nums">{runs}/3</span>
            <span className="text-sm opacity-50 tabular-nums">({over} ov)</span>
            {flash && (
              <span className="run-flash text-sm font-bold text-[var(--accent-2)]">{flash}</span>
            )}
          </div>
        </div>
        <div className="text-right text-xs opacity-50">
          vs Lakeview Titans<br />Riverside Ground
        </div>
      </div>

      {/* Commentary feed */}
      <div className="flex flex-col gap-1.5 border-t border-[var(--border-default)] pt-3">
        {feed.map((line, i) => (
          <div key={line + i} className="commentary-line text-xs opacity-70 leading-relaxed">
            {line}
          </div>
        ))}
      </div>

      {/* Points table */}
      <div className="border-t border-[var(--border-default)] pt-3">
        <div className="text-xs font-bold opacity-50 uppercase tracking-wide mb-2">Points Table</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="opacity-40 text-left">
              <th className="font-medium pb-1">Team</th>
              <th className="font-medium pb-1 text-center">P</th>
              <th className="font-medium pb-1 text-center">W</th>
              <th className="font-medium pb-1 text-center">Pts</th>
              <th className="font-medium pb-1 text-right">NRR</th>
            </tr>
          </thead>
          <tbody>
            {table.map(row => (
              <tr key={row.teamId} className="table-row-enter">
                <td className="py-1 font-medium">{TEAMS[row.teamId]?.shortName}</td>
                <td className="py-1 text-center tabular-nums">{row.played}</td>
                <td className="py-1 text-center tabular-nums">{row.won}</td>
                <td className="py-1 text-center font-bold text-[var(--accent-2)] tabular-nums">{row.points}</td>
                <td className="py-1 text-right tabular-nums">{row.diff > 0 ? '+' : ''}{row.diff.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
