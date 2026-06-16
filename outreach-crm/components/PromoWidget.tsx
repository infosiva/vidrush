'use client'
import { useState } from 'react'

export default function PromoWidget() {
  const [show, setShow] = useState(false)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
    const data = await res.json()
    setMsg(data.valid ? `✓ ${data.daysUnlocked}d Pro unlocked!` : 'Invalid code')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 8 }}>
      <button type="button" onClick={() => setShow(p => !p)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        Have a promo code?
      </button>
      {show && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.07)', color: '#f4f3ff', width: 130 }} />
          <button type="submit" style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer', color: '#a5b4fc' }}>
            {msg || 'Apply'}
          </button>
        </form>
      )}
    </div>
  )
}
