'use client'
import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Team = { id: string; name: string; shortName: string }
type Match = { id: string; status: string; teamAId: string; teamBId: string; scoreA?: number | null; wicketsA?: number | null; oversA?: number | null; scoreB?: number | null; wicketsB?: number | null; oversB?: number | null; goalsA?: number | null; goalsB?: number | null }

type Data = {
  tournament: { name: string; sport: string }
  teams: Team[]; liveMatch: Match | null; scheduled: Match[]
}

export default function ScorePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh] opacity-40">Loading…</div>}>
      <ScoreInner />
    </Suspense>
  )
}

function ScoreInner() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [data, setData] = useState<Data | null>(null)
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)
  const [form, setForm] = useState({ scoreA: '', wicketsA: '', oversA: '', scoreB: '', wicketsB: '', oversB: '', goalsA: '', goalsB: '', commentary: '' })
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
      setForm(p => ({
        ...p,
        scoreA: d.liveMatch.scoreA?.toString() ?? '',
        wicketsA: d.liveMatch.wicketsA?.toString() ?? '',
        oversA: d.liveMatch.oversA?.toString() ?? '',
        scoreB: d.liveMatch.scoreB?.toString() ?? '',
        wicketsB: d.liveMatch.wicketsB?.toString() ?? '',
        oversB: d.liveMatch.oversB?.toString() ?? '',
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
      if (isCricket && form.scoreA !== '' && form.scoreB !== '') {
        const sA = Number(form.scoreA), sB = Number(form.scoreB)
        payload.winnerId = sA > sB ? activeMatch.teamAId : sA < sB ? activeMatch.teamBId : null
        payload.resultNote = sA > sB
          ? `${teamMap.get(activeMatch.teamAId)?.name} won by ${sA - sB} runs`
          : sB > sA ? `${teamMap.get(activeMatch.teamBId)?.name} won by ${sB - sA} runs` : 'Match tied'
      } else if (!isCricket && form.goalsA !== '' && form.goalsB !== '') {
        const gA = Number(form.goalsA), gB = Number(form.goalsB)
        payload.winnerId = gA > gB ? activeMatch.teamAId : gA < gB ? activeMatch.teamBId : null
      }
    }
    const res = await fetch(`/api/matches/${activeMatch.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      setMsg(finish ? '✓ Match complete!' : '✓ Saved')
      if (finish) { setActiveMatch(null); await fetchData() }
    } else {
      const d = await res.json()
      setMsg(d.error === 'Invalid token' ? '⚠ Bad token' : '✗ Save failed')
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (!token) return (
    <main className="px-4 py-16 text-center max-w-md mx-auto">
      <p className="opacity-60 text-sm">Missing token. Use the scorer link you received when creating the tournament.</p>
    </main>
  )

  if (!data) return (
    <main className="flex items-center justify-center min-h-[60vh] opacity-40">Loading…</main>
  )

  const { tournament, teams, scheduled } = data
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const isCricket = tournament.sport === 'cricket'

  const inp: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border-default)',
    color: 'var(--foreground)', borderRadius: 10, padding: '12px 14px',
    fontSize: 16, width: '100%', outline: 'none', WebkitAppearance: 'none',
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Compact header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs opacity-40 uppercase tracking-wide font-bold">Scorer</p>
          <h1 className="text-xl font-extrabold leading-tight">{tournament.name}</h1>
        </div>
        <Link href={`/t/${slug}`}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--card)', border: '1px solid var(--border-default)' }}>
          Live page →
        </Link>
      </div>

      {/* Active match scorer */}
      {activeMatch ? (
        <div className="card p-5 mb-5">
          {/* LIVE badge + teams */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--accent)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>LIVE —</span>
            <span className="text-sm opacity-70 truncate">
              {teamMap.get(activeMatch.teamAId)?.shortName} vs {teamMap.get(activeMatch.teamBId)?.shortName}
            </span>
          </div>

          {isCricket ? (
            <>
              {/* Team A */}
              <p className="text-xs font-bold opacity-50 uppercase mb-2">{teamMap.get(activeMatch.teamAId)?.name} innings</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <p className="text-xs opacity-40 mb-1">Runs</p>
                  <input style={inp} type="number" inputMode="numeric" placeholder="0" value={form.scoreA} onChange={e => setForm(p => ({ ...p, scoreA: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs opacity-40 mb-1">Wickets</p>
                  <input style={inp} type="number" inputMode="numeric" placeholder="0" min="0" max="10" value={form.wicketsA} onChange={e => setForm(p => ({ ...p, wicketsA: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs opacity-40 mb-1">Overs</p>
                  <input style={inp} type="number" inputMode="decimal" placeholder="0.0" step="0.1" value={form.oversA} onChange={e => setForm(p => ({ ...p, oversA: e.target.value }))} />
                </div>
              </div>
              {/* Team B */}
              <p className="text-xs font-bold opacity-50 uppercase mb-2">{teamMap.get(activeMatch.teamBId)?.name} innings</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <p className="text-xs opacity-40 mb-1">Runs</p>
                  <input style={inp} type="number" inputMode="numeric" placeholder="0" value={form.scoreB} onChange={e => setForm(p => ({ ...p, scoreB: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs opacity-40 mb-1">Wickets</p>
                  <input style={inp} type="number" inputMode="numeric" placeholder="0" min="0" max="10" value={form.wicketsB} onChange={e => setForm(p => ({ ...p, wicketsB: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs opacity-40 mb-1">Overs</p>
                  <input style={inp} type="number" inputMode="decimal" placeholder="0.0" step="0.1" value={form.oversB} onChange={e => setForm(p => ({ ...p, oversB: e.target.value }))} />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs opacity-40 mb-1">{teamMap.get(activeMatch.teamAId)?.name}</p>
                <input style={{ ...inp, fontSize: 28, fontWeight: 900, textAlign: 'center' }} type="number" inputMode="numeric" placeholder="0" value={form.goalsA} onChange={e => setForm(p => ({ ...p, goalsA: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs opacity-40 mb-1">{teamMap.get(activeMatch.teamBId)?.name}</p>
                <input style={{ ...inp, fontSize: 28, fontWeight: 900, textAlign: 'center' }} type="number" inputMode="numeric" placeholder="0" value={form.goalsB} onChange={e => setForm(p => ({ ...p, goalsB: e.target.value }))} />
              </div>
            </div>
          )}

          <input style={{ ...inp, marginBottom: 12 }}
            placeholder="Commentary (optional)" value={form.commentary}
            onChange={e => setForm(p => ({ ...p, commentary: e.target.value }))} />

          {msg && (
            <p className="text-sm font-semibold mb-3" style={{ color: msg.startsWith('✓') ? 'var(--accent)' : '#f87171' }}>{msg}</p>
          )}

          {/* Big tap targets — critical for field use */}
          <button
            onClick={() => updateScore(false)} disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-base mb-2 transition-transform active:scale-[0.97]"
            style={{ background: 'var(--accent)', color: '#06150e' }}>
            {saving ? 'Saving…' : '↑ Update score'}
          </button>
          <button
            onClick={() => { if (confirm('End this match?')) updateScore(true) }}
            disabled={saving}
            className="w-full py-3 rounded-xl font-bold text-sm transition-transform active:scale-[0.97]"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
            End match
          </button>
        </div>
      ) : (
        <div className="card p-4 mb-5 text-center text-sm opacity-50">No live match — start one below ↓</div>
      )}

      {/* Scheduled fixtures */}
      {scheduled.length > 0 && (
        <div>
          <p className="text-xs font-bold opacity-50 uppercase tracking-wide mb-3">Upcoming fixtures</p>
          <div className="flex flex-col gap-2">
            {scheduled.map(m => (
              <div key={m.id} className="card p-4 flex items-center justify-between">
                <div className="text-sm font-semibold">
                  {teamMap.get(m.teamAId)?.shortName} <span className="opacity-40">vs</span> {teamMap.get(m.teamBId)?.shortName}
                </div>
                <button
                  disabled={!!activeMatch || startingMatchId === m.id}
                  onClick={() => startMatch(m.id)}
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-transform active:scale-[0.97]"
                  style={{
                    background: activeMatch ? 'var(--card)' : 'var(--accent)',
                    color: activeMatch ? 'inherit' : '#06150e',
                    opacity: activeMatch ? 0.4 : 1,
                  }}>
                  {startingMatchId === m.id ? '…' : 'Start'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {scheduled.length === 0 && !activeMatch && (
        <div className="text-center opacity-40 text-sm mt-8">
          No fixtures yet.{' '}
          <Link href={`/dashboard`} style={{ color: 'var(--accent-2)' }}>Go to dashboard</Link> to add matches.
        </div>
      )}

      <p className="text-xs opacity-25 text-center mt-8">Public page refreshes every 15s automatically.</p>
    </main>
  )
}
