import type { Metadata } from 'next'
import LiveScorecardDemo from '@/components/LiveScorecardDemo'
import { DEMO_TOURNAMENT } from '@/lib/demoTournament'

export const metadata: Metadata = {
  title: 'Live Example Tournament | Matchly',
  description: 'See a live example of a Matchly tournament page — live scores, commentary, and points table.',
  robots: { index: true, follow: true },
}

const TEAMS = Object.fromEntries(DEMO_TOURNAMENT.teams.map(t => [t.id, t]))

export default function DemoPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-10 lg:py-16">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wide opacity-50 mb-1">Example tournament</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold">{DEMO_TOURNAMENT.name}</h1>
        <p className="opacity-60 mt-2 max-w-xl">
          This is what your tournament page looks like once it&apos;s live — share this single link and
          anyone can follow scores, commentary, and standings without an app.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <LiveScorecardDemo />

        <div className="card p-5">
          <div className="text-xs font-bold opacity-50 uppercase tracking-wide mb-3">Teams</div>
          <ul className="flex flex-col gap-2 text-sm">
            {DEMO_TOURNAMENT.teams.map(team => (
              <li key={team.id} className="flex items-center justify-between">
                <span>{team.name}</span>
                <span className="opacity-50">{team.shortName}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 card p-5">
        <div className="text-xs font-bold opacity-50 uppercase tracking-wide mb-3">Full Points Table</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="opacity-40 text-left">
              <th className="font-medium pb-2">Team</th>
              <th className="font-medium pb-2 text-center">P</th>
              <th className="font-medium pb-2 text-center">W</th>
              <th className="font-medium pb-2 text-center">L</th>
              <th className="font-medium pb-2 text-center">Pts</th>
              <th className="font-medium pb-2 text-right">NRR</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_TOURNAMENT.pointsTable.map(row => (
              <tr key={row.teamId} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                <td className="py-2 font-medium">{TEAMS[row.teamId]?.name}</td>
                <td className="py-2 text-center tabular-nums">{row.played}</td>
                <td className="py-2 text-center tabular-nums">{row.won}</td>
                <td className="py-2 text-center tabular-nums">{row.lost}</td>
                <td className="py-2 text-center font-bold tabular-nums" style={{ color: 'var(--accent-2)' }}>{row.points}</td>
                <td className="py-2 text-right tabular-nums">{row.diff > 0 ? '+' : ''}{row.diff.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
