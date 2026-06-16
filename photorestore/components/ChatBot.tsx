'use client'
import { useState } from 'react'

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{role:'user'|'bot';text:string}[]>([
    { role: 'bot', text: "Hi! I'm PhotoBot. Ask me anything about restoring your old photos!" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input
    setMsgs(m => [...m, { role: 'user', text: userMsg }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'bot', text: data.reply || 'Happy to help!' }])
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: 'Try again in a moment!' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open PhotoRestore chat"
        style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,58,237,0.35)', zIndex: 1000, fontSize: 20, color: '#fff' }}
      >
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div style={{ position: 'fixed', bottom: 88, right: 24, width: 320, maxHeight: 420,
          background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden',
          border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 700, fontSize: 14 }}>
            PhotoBot
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#7c3aed' : '#f1f5f9', color: m.role === 'user' ? '#fff' : '#0f172a',
                borderRadius: 12, padding: '8px 12px', fontSize: 13, maxWidth: '80%' }}>
                {m.text}
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontSize: 13 }}>...</div>}
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about photo restoration..."
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' }} />
            <button onClick={send} disabled={loading}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}
