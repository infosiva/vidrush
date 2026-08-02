'use client'

/**
 * PromoBar — inline "have a promo code?" toggle + unlocked-state banner.
 * Uses existing lib/promoCode.ts (server) + hooks/usePromo.ts (client) backend.
 */

import { useState } from 'react'
import { usePromo } from '@/hooks/usePromo'

const ACCENT = 'var(--accent, #2563eb)'

export default function PromoBar() {
  const { isUnlocked, daysLeft } = usePromo()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'invalid'>('idle')

  if (isUnlocked) {
    return (
      <p className="mt-3 text-sm font-medium" style={{ color: ACCENT }}>
        🎉 Pro access active — {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining
      </p>
    )
  }

  async function submit() {
    if (!code.trim()) return
    setStatus('checking')
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        window.location.reload()
      } else {
        setStatus('invalid')
      }
    } catch {
      setStatus('invalid')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 text-sm underline opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: ACCENT }}
      >
        Have a promo code?
      </button>
    )
  }

  return (
    <div className="mt-3">
      <div className="inline-flex items-center gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setStatus('idle') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Enter code"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={submit}
          disabled={status === 'checking'}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: ACCENT }}
        >
          {status === 'checking' ? '...' : 'Apply'}
        </button>
      </div>
      {status === 'invalid' && <p className="mt-1 text-xs text-red-600">Invalid code</p>}
    </div>
  )
}
