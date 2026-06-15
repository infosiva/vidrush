'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SPORTS = [
  { id: 'cricket', label: '🏏 Cricket' },
  { id: 'football', label: '⚽ Football' },
  { id: 'badminton', label: '🏸 Badminton' },
  { id: 'kabaddi', label: '🤼 Kabaddi' },
]

export default function CreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [name, setName] = useState('')
  const [sport, setSport] = useState('cricket')
  const [email, setEmail] = useState('')
  const [teams, setTeams] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ slug: string; editToken: string; shareUrl: string; scoreUrl: string } | null>(null)
  const [copied, setCopied] = useState<'share' | 'score' | null>(null)

  function setTeam(i: number, val: string) {
    setTeams(prev => prev.map((t, idx) => idx === i ? val : t))
  }

  function addTeam() {
    if (teams.length < 16) setTeams(prev => [...prev, ''])
  }

  function removeTeam(i: number) {
    if (teams.length > 2) setTeams(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const filledTeams = teams.map(t => t.trim()).filter(Boolean)
    if (!name.trim()) { setError('Tournament name is required'); return }
    if (filledTeams.length < 2) { setError('Add at least 2 teams'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), sport, teams: filledTeams, organiserEmail: email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create'); return }
      setResult(data)
      setStep('done')
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  async function copy(type: 'share' | 'score') {
    const url = type === 'share'
      ? `${window.location.origin}${result!.shareUrl}`
      : `${window.location.origin}${result!.scoreUrl}`
    await navigator.clipboard.writeText(url)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  if (step === 'done' && result) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://matchly.app'
    return (
      <main className="max-w-lg mx-auto px-5 py-16">
        <div className="card p-8 flex flex-col gap-5 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-extrabold">Tournament created!</h1>
          <p className="opacity-60 text-sm">Share the first link with your WhatsApp group. Keep the scorer link private — it lets anyone update scores.</p>

          <div className="flex flex-col gap-3 text-left mt-2">
            <div>
              <p className="text-xs font-bold opacity-50 uppercase tracking-wide mb-1">Public link (share with everyone)</p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 bg-black/20 rounded px-3 py-2 text-xs break-all" style={{ color: 'var(--accent-2)' }}>
                  {origin}{result.shareUrl}
                </code>
                <button onClick={() => copy('share')} className="btn-secondary text-xs px-3 py-2 shrink-0">
                  {copied === 'share' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold opacity-50 uppercase tracking-wide mb-1">Scorer link (keep private)</p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 bg-black/20 rounded px-3 py-2 text-xs break-all" style={{ color: '#f59e0b' }}>
                  {origin}{result.scoreUrl}
                </code>
                <button onClick={() => copy('score')} className="btn-secondary text-xs px-3 py-2 shrink-0">
                  {copied === 'score' ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-2 justify-center">
            <button onClick={() => router.push(result.shareUrl)} className="btn-primary">View tournament →</button>
            <button onClick={() => { setStep('form'); setResult(null); setName(''); setTeams(['', '', '', '']) }} className="btn-secondary">Create another</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-5 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">Create tournament</h1>
        <p className="opacity-60 mt-1 text-sm">Free. No account needed. Ready in 2 minutes.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold opacity-50 uppercase tracking-wide mb-2">Tournament name</label>
          <input
            className="w-full rounded-xl px-4 py-3 text-base font-medium outline-none"
            style={{ background: 'var(--card)', border: '1px solid var(--border-default)', color: 'var(--foreground)' }}
            placeholder="Diwali Premier League 2026"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={80}
          />
        </div>

        {/* Sport */}
        <div>
          <label className="block text-xs font-bold opacity-50 uppercase tracking-wide mb-2">Sport</label>
          <div className="flex gap-2 flex-wrap">
            {SPORTS.map(s => (
              <button key={s.id} type="button"
                onClick={() => setSport(s.id)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: sport === s.id ? 'var(--accent)' : 'var(--card)',
                  color: sport === s.id ? '#06150e' : 'var(--foreground)',
                  border: `1px solid ${sport === s.id ? 'var(--accent)' : 'var(--border-default)'}`,
                  transform: sport === s.id ? 'scale(1.03)' : 'scale(1)',
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {/* Teams */}
        <div>
          <label className="block text-xs font-bold opacity-50 uppercase tracking-wide mb-2">Teams ({teams.filter(Boolean).length} added)</label>
          <div className="flex flex-col gap-2">
            {teams.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--card)', border: '1px solid var(--border-default)', color: 'var(--foreground)' }}
                  placeholder={`Team ${i + 1} name`}
                  value={t}
                  onChange={e => setTeam(i, e.target.value)}
                  maxLength={40}
                />
                {teams.length > 2 && (
                  <button type="button" onClick={() => removeTeam(i)}
                    className="px-3 rounded-xl text-sm opacity-40 hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--card)', border: '1px solid var(--border-default)' }}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
          {teams.length < 16 && (
            <button type="button" onClick={addTeam}
              className="mt-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent-2)' }}
            >+ Add team</button>
          )}
        </div>

        {/* Email (optional) */}
        <div>
          <label className="block text-xs font-bold opacity-50 uppercase tracking-wide mb-2">Your email <span className="normal-case font-normal">(optional — to recover scorer link)</span></label>
          <input
            className="w-full rounded-xl px-4 py-3 text-base outline-none"
            style={{ background: 'var(--card)', border: '1px solid var(--border-default)', color: 'var(--foreground)' }}
            placeholder="organiser@example.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-400 -mt-3">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
          {loading ? 'Creating…' : 'Create tournament →'}
        </button>

        <p className="text-xs opacity-40 text-center -mt-2">
          No account, no credit card. You get two links — one to share, one to update scores.
        </p>
      </form>
    </main>
  )
}
