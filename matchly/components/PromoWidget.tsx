'use client'
import { useState } from 'react'
import { usePromo } from '@/hooks/usePromo'

export default function PromoWidget() {
  const { isUnlocked, daysLeft } = usePromo()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState('')

  if (isUnlocked) {
    return (
      <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl w-fit"
        style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.25)' }}>
        🎉 Pro access active — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
      </div>
    )
  }

  async function apply() {
    if (!code.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        setStatus('ok')
        setMsg(`✓ ${data.daysUnlocked} days unlocked! Reload to activate.`)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setStatus('err')
        setMsg(data.message ?? 'Invalid code')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('err'); setMsg('Network error'); setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="text-xs opacity-40 hover:opacity-70 transition-opacity underline underline-offset-2">
          Have a promo code?
        </button>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            className="rounded-lg px-3 py-1.5 text-sm outline-none w-36"
            style={{ background: 'var(--card)', border: '1px solid var(--border-default)', color: 'var(--foreground)' }}
            placeholder="Enter code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') setOpen(false) }}
          />
          <button onClick={apply} disabled={status === 'loading'}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#06150e' }}>
            {status === 'loading' ? '…' : 'Apply'}
          </button>
          <button onClick={() => setOpen(false)} className="text-xs opacity-40 hover:opacity-70">✕</button>
          {msg && <span className="text-xs" style={{ color: status === 'ok' ? 'var(--accent)' : '#f87171' }}>{msg}</span>}
        </div>
      )}
    </div>
  )
}
