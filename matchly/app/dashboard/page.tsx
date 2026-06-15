'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type TournamentSummary = {
  id: string; slug: string; name: string; sport: string; status: string
  createdAt: string; editToken: string
  teamCount: number; matchesPlayed: number; matchesLive: number; matchesTotal: number
}

const SPORT_EMOJI: Record<string, string> = { cricket: '🏏', football: '⚽', badminton: '🏸', kabaddi: '🤼' }

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-24 text-center opacity-40">Loading…</div>}>
      <DashboardInner />
    </Suspense>
  )
}

function DashboardInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tokenInput, setTokenInput] = useState('')
  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async (t: string) => {
    if (!t) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/dashboard?token=${encodeURIComponent(t)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setTournaments(data.tournaments)
      if (!data.tournaments.length) setError('No tournaments found for this token.')
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (token) load(token)
  }, [token, load])

  // Persist token in localStorage for convenience
  useEffect(() => {
    if (token) {
      localStorage.setItem('matchly_tokens', token)
      router.replace(`/dashboard?token=${encodeURIComponent(token)}`, { scroll: false })
    }
  }, [token, router])

  // On mount, check localStorage if no token in URL
  useEffect(() => {
    if (!token) {
      const saved = localStorage.getItem('matchly_tokens')
      if (saved) setToken(saved)
    }
  }, [token])

  async function copyUrl(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://matchly.app'

  if (!token) {
    return (
      <main className="max-w-md mx-auto px-5 py-24 flex flex-col items-center gap-6 text-center">
        <div className="text-5xl">🏆</div>
        <h1 className="text-2xl font-extrabold">Organiser dashboard</h1>
        <p className="opacity-60 text-sm max-w-xs">
          Paste your scorer token to see all your tournaments. You got it when you created your first tournament.
        </p>
        <div className="w-full flex flex-col gap-3">
          <input
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: 'var(--card)', border: '1px solid var(--border-default)', color: 'var(--foreground)' }}
            placeholder="Paste your scorer token…"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && tokenInput.trim()) setToken(tokenInput.trim()) }}
          />
          <button className="btn-primary w-full py-3" onClick={() => { if (tokenInput.trim()) setToken(tokenInput.trim()) }}>
            View my tournaments
          </button>
        </div>
        <p className="text-xs opacity-40">
          Don&apos;t have a tournament yet?{' '}
          <Link href="/create" style={{ color: 'var(--accent-2)' }}>Create one →</Link>
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold">My tournaments</h1>
          <p className="text-xs opacity-40 mt-1">
            Token: <code className="font-mono">{token.slice(0, 8)}…</code>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(token)} disabled={loading}
            className="btn-secondary text-sm px-3 py-1.5">
            {loading ? '…' : '↻ Refresh'}
          </button>
          <Link href="/create" className="btn-primary text-sm px-4 py-1.5">+ New</Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

      {loading && !tournaments.length && (
        <div className="opacity-40 text-center py-20">Loading…</div>
      )}

      {!loading && !tournaments.length && !error && (
        <div className="card p-10 text-center opacity-50">
          <div className="text-4xl mb-3">🏏</div>
          <p>No tournaments yet.</p>
          <Link href="/create" className="btn-primary mt-4 inline-block">Create your first →</Link>
        </div>
      )}

      {/* Tournament cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {tournaments.map(t => {
          const shareUrl = `${origin}/t/${t.slug}`
          const scoreUrl = `${origin}/t/${t.slug}/score?token=${t.editToken}`
          const hasLive = t.matchesLive > 0
          return (
            <div key={t.id} className="card p-5 flex flex-col gap-4">
              {/* Tournament name + sport */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span>{SPORT_EMOJI[t.sport] ?? '🏅'}</span>
                    {hasLive && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: 'var(--accent)' }} />
                        LIVE
                      </span>
                    )}
                  </div>
                  <h2 className="font-extrabold text-lg leading-tight">{t.name}</h2>
                  <p className="text-xs opacity-40 mt-0.5">
                    {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Teams', val: t.teamCount },
                  { label: 'Played', val: t.matchesPlayed },
                  { label: 'Fixtures', val: t.matchesTotal },
                ].map(s => (
                  <div key={s.label} className="rounded-lg py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--accent-2)' }}>{s.val}</p>
                    <p className="text-xs opacity-40">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5">
                  <Link href={`/t/${t.slug}`}
                    className="flex-1 text-center text-xs font-bold py-2 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'var(--accent)', color: '#06150e' }}>
                    View live page →
                  </Link>
                  <Link href={`/t/${t.slug}/score?token=${t.editToken}`}
                    className="flex-1 text-center text-xs font-bold py-2 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                    Score panel →
                  </Link>
                </div>

                {/* Copy links */}
                <div className="flex gap-1.5">
                  <button onClick={() => copyUrl(shareUrl, `share-${t.id}`)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--card)', border: '1px solid var(--border-default)', color: 'var(--foreground)', opacity: 0.7 }}>
                    {copied === `share-${t.id}` ? '✓ Copied!' : '📋 Copy share link'}
                  </button>
                  <button onClick={() => copyUrl(scoreUrl, `score-${t.id}`)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--card)', border: '1px solid var(--border-default)', color: 'var(--foreground)', opacity: 0.7 }}>
                    {copied === `score-${t.id}` ? '✓ Copied!' : '🔑 Copy scorer link'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Token management */}
      <div className="mt-10 card p-5 flex flex-col gap-3">
        <p className="text-xs font-bold opacity-50 uppercase tracking-wide">Add another tournament token</p>
        <p className="text-xs opacity-40">If you have multiple scorer tokens from different tournaments, paste them comma-separated.</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-default)', color: 'var(--foreground)' }}
            placeholder="token1, token2, …"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
          />
          <button className="btn-secondary px-4 text-sm"
            onClick={() => {
              const merged = [...new Set([...token.split(','), ...tokenInput.split(',')].map(t => t.trim()).filter(Boolean))].join(',')
              setToken(merged); setTokenInput('')
            }}>
            Add
          </button>
        </div>
      </div>

      <p className="text-xs opacity-30 text-center mt-8">
        Bookmark this page with your token in the URL to return later.
      </p>
    </main>
  )
}
