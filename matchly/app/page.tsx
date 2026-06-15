'use client'

import { useState } from 'react'
import Link from 'next/link'
import LiveScorecardDemo from '@/components/LiveScorecardDemo'
import { Sport } from '@/lib/types'
import PromoWidget from '@/components/PromoWidget'

const SPORTS: { id: Sport; label: string; emoji: string }[] = [
  { id: 'cricket', label: 'Cricket', emoji: '🏏' },
  { id: 'football', label: 'Football', emoji: '⚽' },
  { id: 'badminton', label: 'Badminton', emoji: '🏸' },
  { id: 'kabaddi', label: 'Kabaddi', emoji: '🤼' },
]

const STEPS = [
  { n: 1, title: 'Create your tournament', body: 'Name it, add teams, pick your sport.' },
  { n: 2, title: 'Share the link', body: 'Drop the URL in your WhatsApp group — no app to install.' },
  { n: 3, title: 'Post live scores', body: 'Update scores from your phone as the match happens.' },
  { n: 4, title: 'Points table updates itself', body: 'Standings, NRR, and results recalculate automatically.' },
]

export default function Home() {
  const [sport, setSport] = useState<Sport>('cricket')

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 lg:py-16">
      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sport">
            {SPORTS.map(s => (
              <button
                key={s.id}
                role="tab"
                aria-selected={sport === s.id}
                className="sport-tab"
                onClick={() => setSport(s.id)}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05]">
            Your league.<br />
            <span style={{ color: 'var(--accent-2)' }}>Live.</span> In 2 minutes.
          </h1>

          <p className="text-base sm:text-lg opacity-70 max-w-xl">
            Free tournament sites for gully cricket, corporate leagues, and school sports days —
            fixtures, live scores, and points tables your WhatsApp group will actually click on.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/create" className="btn-primary">Create a tournament — free</Link>
            <Link href="/demo" className="btn-secondary">See a live example</Link>
          </div>

          <PromoWidget />

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 mt-2 text-sm">
            <div>
              <div className="text-2xl font-extrabold" style={{ color: 'var(--accent-2)' }}>4</div>
              <div className="opacity-50">Sports supported</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold" style={{ color: 'var(--accent-2)' }}>0</div>
              <div className="opacity-50">Apps to install</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold" style={{ color: 'var(--accent-2)' }}>1 link</div>
              <div className="opacity-50">Share everywhere</div>
            </div>
          </div>
        </div>

        {/* Right: live demo (desktop) */}
        <div className="hidden lg:block">
          <LiveScorecardDemo />
        </div>

        {/* Mobile demo strip */}
        <div className="lg:hidden demo-strip">
          <LiveScorecardDemo />
        </div>
      </div>

      {/* Steps row */}
      <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map(step => (
          <div key={step.n} className="card p-5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3"
              style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent-2)' }}
            >
              {step.n}
            </div>
            <h3 className="font-bold text-sm mb-1">{step.title}</h3>
            <p className="text-sm opacity-60">{step.body}</p>
          </div>
        ))}
      </div>

      {/* WhatsApp / Telegram update note */}
      <div className="mt-12 card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-3xl">💬</div>
        <div>
          <h3 className="font-bold mb-1">No app, no signup for scorers</h3>
          <p className="text-sm opacity-60">
            Post score updates from a simple mobile form, or send them straight from WhatsApp or Telegram —
            the public tournament page refreshes automatically for everyone watching.
          </p>
        </div>
      </div>
    </div>
  )
}
