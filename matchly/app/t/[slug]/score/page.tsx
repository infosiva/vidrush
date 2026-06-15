'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Team = { id: string; name: string; shortName: string }
type Match = { id: string; status: string; teamAId: string; teamBId: string; scoreA?: number | null; wicketsA?: number | null; oversA?: number | null; scoreB?: number | null; wicketsB?: number | null; oversB?: number | null; goalsA?: number | null; goalsB?: number | null; resultNote?: string | null }

type Data = {
  tournament: { name: string; sport: string }
  teams: Team[]
  liveMatch: Match | null
  scheduled: Match[]
}

export default function ScorePage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [data, setData] = useState<Data | null>(null)
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)
  const [form, setForm] = useState({ scoreA: '', wicketsA: '', oversA: '', scoreB: '', wicketsB: '', oversB: '', goalsA: '', goalsB: '', commentary: '', resultNote: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [startingMatchId, setStartingMatchId] = useState<string | null>(null)

  async function fetchData() {
    const res = await fetch(`/api/tournaments/${slug}`)
    if (!res.ok) return
    const d = await res.json()
    setData(d)
    if (d.liveMatch) {
      setActiveMatch(d.liveMatch)
      setForm(prev => ({
        ...prev,
        scoreA: d.liveMatch.scoreA?.toString() ?? '',
        wicketsA: d.liveMatch.wicketsA?.toString() ?? '',
        oversA: d.liveMatch.oversA?.toString() ?? '',
        scoreB: d.liveMatch.scoreB?.toString() ?? '',
        wicketsB: d.liveMatch.wicketsB?.toString() ?? '',
        oversB: d.liveMatch.oversB?.toString() ?? '',
        commentary: d.liveMatch.commentary ?? '',
      }))
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [slug])

  async function startMatch(matchId: string) {
    setStartingMatchId(matchId)
    await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, status: 'live' }),
    })
    await fetchData()
    setStartingMatchId(null)
  }

  async function updateScore(finish = false) {
    if (!activeMatch) return
    setSaving(true); setMsg('')
    const isCricket = data?.tournament.sport === 'cricket'
    const payload: Record<string, unknown> = { token, commentary: form.commentary }
    if (isCricket) {
      if (form.scoreA !== '') payload.scoreA = Number(form.scoreA)
      if (form.wicketsA !== '') payload.wicketsA = Number(form.wicketsA)
      if (form.oversA !== '') payload.oversA = Number(form.oversA)
      if (form.scoreB !== '') payload.scoreB = Number(form.scoreB)
      if (form.wicketsB !== '') payload.wicketsB = Number(form.wicketsB)
      if (form.oversB !== '') payload.oversB = Number(form.oversB)
    } else {
      if (form.goalsA !== '') payload.goalsA = Number(form.goalsA)
      if (form.goalsB !== '') payload.goalsB = Number(form.goalsB)
    }
    if (finish) {
      payload.status = 'completed'
      payload.resultNote = form.resultNote
      // Auto-determine winner for cricket
      if (isCricket && form.scoreA !== '' && form.scoreB !== '') {
        const sA = Number(form.scoreA), sB = Number(form.scoreB)
        payload.winnerId = sA > sB ? activeMatch.teamAId : sA < sB ? activeMatch.teamBId : null
      } else if (!isCricket && form.goalsA !== '' && form.goalsB !== '') {
        const gA = Number(form.goalsA), gB = Number(form.goalsB)
        payload.winnerId = gA > gB ? activeMatch.teamAId : gA < gB ? activeMatch.teamBId : null
      }
    }
    const res = await fetch(`/api/matches/${activeMatch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setMsg(finish ? '✓ Match completed!' : '✓ Score updated')
      if (finish) { setActiveMatch(null); await fetchData() }
    } else {
      const d = await res.json()
      setMsg(d.error === 'Invalid token' ? '⚠ Invalid token — check your scorer link' : '✗ Failed to save')
    }
    setSaving(false)
  }

  if (!token) return (
    <main className="max-w-md mx-auto px-5 py-24 text-center">
      <p className="opacity-60">Missing token. Use the scorer link you got when creating the tournament.</p>
    </main>
  )

  if (!data) return (
    <main className="max-w-md mx-auto px-5 py-24 text-center opacity-50">Loading…</main>
  )

  const { tournament, teams, scheduled } = data
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const isCricket = tournament.sport === 'cricket'

  const InputStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border-default)',
    color: 'var(--foreground)', borderRadius: 10, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none',
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs opacity-40 uppercase tracking-wide font-bold mb-0.5">Scorer panel</p>
          <h1 className="text-2xl font-extrabold">{tournament.name}</h1>
        </div>
        <Link href={`/t/${slug}`} className="btn-secondary text-xs px-3 py-1.5">View public page →</Link>
      </div>

      {/* Active match scorer */}
      {activeMatch ? (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>LIVE</span>
            <span className="text-sm opacity-60">{teamMap.get(activeMatch.teamAId)?.name} vs {teamMap.get(activeMatch.teamBId)?.name}</span>
          </div>

          {isCricket ? (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-bold opacity-50 mb-2">{teamMap.get(activeMatch.teamAId)?.shortName} batting</p>
                <div className="flex flex-col gap-2">
                  <input style={InputStyle} type="number" placeholder="Runs" value={form.scoreA} onChange={e => setForm(p => ({ ...p, scoreA: e.target.value }))} />
                  <input style={InputStyle} type="number" placeholder="Wickets" min="0" max="10" value={form.wicketsA} onChange={e => setForm(p => ({ ...p, wicketsA: e.target.value }))} />
                  <input style={InputStyle} type="number" placeholder="Overs (e.g. 12.4)" step="0.1" value={form.oversA} onChange={e => setForm(p => ({ ...p, oversA: e.target.value }))} />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold opacity-50 mb-2">{teamMap.get(activeMatch.teamBId)?.shortName} batting</p>
                <div className="flex flex-col gap-2">
                  <input style={InputStyle} type="number" placeholder="Runs" value={form.scoreB} onChange={e => setForm(p => ({ ...p, scoreB: e.target.value }))} />
                  <input style={InputStyle} type="number" placeholder="Wickets" min="0" max="10" value={form.wicketsB} onChange={e => setForm(p => ({ ...p, wicketsB: e.target.value }))} />
                  <input style={InputStyle} type="number" placeholder="Overs (e.g. 12.4)" step="0.1" value={form.oversB} onChange={e => setForm(p => ({ ...p, oversB: e.target.value }))} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-bold opacity-50 mb-2">{teamMap.get(activeMatch.teamAId)?.name}</p>
                <input style={InputStyle} type="number" placeholder="Score" value={form.goalsA} onChange={e => setForm(p => ({ ...p, goalsA: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-bold opacity-50 mb-2">{teamMap.get(activeMatch.teamBId)?.name}</p>
                <input style={InputStyle} type="number" placeholder="Score" value={form.goalsB} onChange={e => setForm(p => ({ ...p, goalsB: e.target.value }))} />
              </div>
            </div>
          )}

          <input style={{ ...InputStyle, marginBottom: 12 }} placeholder="Commentary (optional)" value={form.commentary} onChange={e => setForm(p => ({ ...p, commentary: e.target.value }))} />

          {msg && <p className="text-sm mb-3" style={{ color: msg.startsWith('✓') ? 'var(--accent)' : '#f87171' }}>{msg}</p>}

          <div className="flex gap-2 flex-wrap">
            <button className="btn-primary flex-1" onClick={() => updateScore(false)} disabled={saving}>
              {saving ? 'Saving…' : 'Update score'}
            </button>
            <button className="btn-secondary flex-1" onClick={() => {
              const note = prompt('Result note (e.g. "Riverside Royals won by 14 runs")')
              if (note !== null) { setForm(p => ({ ...p, resultNote: note })); updateScore(true) }
            }} disabled={saving}>
              End match
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 mb-6 opacity-60 text-sm text-center">No live match. Start one below.</div>
      )}

      {/* Scheduled matches */}
      {scheduled.length > 0 && (
        <div>
          <p className="text-xs font-bold opacity-50 uppercase tracking-wide mb-3">Upcoming fixtures</p>
          <div className="flex flex-col gap-2">
            {scheduled.map(m => (
              <div key={m.id} className="card p-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{teamMap.get(m.teamAId)?.name} vs {teamMap.get(m.teamBId)?.name}</span>
                <button className="btn-secondary text-xs px-3 py-1.5"
                  disabled={!!activeMatch || startingMatchId === m.id}
                  onClick={() => startMatch(m.id)}>
                  {startingMatchId === m.id ? '…' : 'Start'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs opacity-30 text-center mt-8">Public page auto-refreshes every 15 seconds.</p>
    </main>
  )
}
