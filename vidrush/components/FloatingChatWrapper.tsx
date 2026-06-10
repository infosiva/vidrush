'use client'
import { useState } from 'react'

export default function FloatingChatWrapper() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: "I'm VidBot! Tell me what kind of video you want to create and I'll help you write the perfect script." },
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
        body: JSON.stringify({ messages: [{ role: 'user', content: userMsg }] }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'bot', text: data.text || 'Happy to help!' }])
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
        aria-label="Open Vidrush AI chat"
        style={{ position: 'fixed', bottom: 24, right: 24, width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(139,92,246,0.35)', zIndex: 1000, fontSize: 20,
          transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.08)')}
      >
        {open ? '✕' : '🎬'}
      </button>
      {open && (
        <div style={{ position: 'fixed', bottom: 88, right: 24, width: 320, height: 420,
          background: 'rgba(15,10,30,0.97)', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 16, display: 'flex', flexDirection: 'column', zIndex: 1000,
          overflow: 'hidden', backdropFilter: 'blur(20px)',
          animation: 'vidchat-in 180ms cubic-bezier(0.23,1,0.32,1)' }}>
          <style>{`@keyframes vidchat-in{from{opacity:0;transform:translateY(8px) scale(0.97)}to{opacity:1;transform:none}}`}</style>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(139,92,246,0.3)', fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
            VidBot
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)',
                padding: '8px 12px', borderRadius: 10, fontSize: 12.5, color: 'rgba(248,250,252,0.9)', maxWidth: '85%', lineHeight: 1.5,
              }}>{m.text}</div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.07)', padding: '8px 12px', borderRadius: 10, fontSize: 12, color: '#94a3b8' }}>…</div>}
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(139,92,246,0.3)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Describe your video idea…"
              style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#f8fafc', outline: 'none' }} />
            <button onClick={send} disabled={loading}
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>→</button>
          </div>
        </div>
      )}
    </>
  )
}
