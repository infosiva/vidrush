'use client'
import { useEffect, useState } from 'react'

interface Stats { repliesGenerated: number; emailsProcessed: number; timeSaved: number }

export default function LiveStatsBar() {
  const [stats, setStats] = useState<Stats>({ repliesGenerated: 0, emailsProcessed: 0, timeSaved: 0 })

  useEffect(() => {
    fetch('/api/session-stats').then(r => r.json()).then(setStats).catch(() => {})
    const t = setInterval(() => {
      fetch('/api/session-stats').then(r => r.json()).then(setStats).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  if (stats.repliesGenerated === 0 && stats.emailsProcessed === 0) return null

  const items = [
    { label: 'Replies generated', value: stats.repliesGenerated },
    { label: 'Emails processed', value: stats.emailsProcessed },
    { label: 'Minutes saved', value: stats.timeSaved },
  ].filter(i => i.value > 0)

  return (
    <div className="border-y py-3 px-5" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-8 flex-wrap">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-[18px] font-black tabular-nums" style={{ color: 'var(--accent, #4f46e5)' }}>
              {item.value.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500">{item.label} this session</span>
          </div>
        ))}
      </div>
    </div>
  )
}
