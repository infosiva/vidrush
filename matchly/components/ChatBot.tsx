'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const ACCENT = '#22c55e'
const ACCENT2 = '#4ade80'
const BOT_NAME = 'MatchBot'
const WELCOME = 'Need help setting up a tournament, scoring a match, or reading the points table? Ask away.'
export const SYSTEM_PROMPT = `You are MatchBot, the assistant for Matchly — a free tool for organizing local tournaments (gully cricket, corporate sports days, school events) with live scores and points tables.
Help users set up tournaments, add teams and fixtures, post score updates, understand points tables, net run rate, and cricket/football/badminton/kabaddi scoring rules.
Keep responses short, friendly, and practical.
If asked anything outside Matchly tournament setup, scoring, or league management, respond: "I'm trained for Matchly. For that, try Google or ChatGPT!"`

const BOTTOM_OFFSET = 84

interface Message { role: 'user' | 'assistant'; content: string }

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok || !res.body) throw new Error('Stream failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
        height: `calc(100dvh - ${BOTTOM_OFFSET}px)`,
        maxHeight: `calc(100dvh - ${BOTTOM_OFFSET}px)`,
        borderRadius: '16px 16px 0 0', borderBottom: 'none',
        background: '#0a130f', border: `1px solid rgba(34,197,94,0.25)`,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.7), 0 0 40px rgba(34,197,94,0.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'matchbot-slide-bottom 0.25s cubic-bezier(0.23,1,0.32,1)',
      }
    : {
        position: 'fixed', bottom: BOTTOM_OFFSET + 4, right: 24, zIndex: 9998,
        width: 360, height: 500,
        maxHeight: `calc(100dvh - ${BOTTOM_OFFSET + 20}px)`,
        borderRadius: 16,
        background: '#0a130f', border: `1px solid rgba(34,197,94,0.25)`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 40px rgba(34,197,94,0.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'matchbot-slide-up 0.22s ease-out',
      }

  return (
    <>
      <style>{`
        @keyframes matchbot-slide-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes matchbot-slide-bottom { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
        @keyframes matchbot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .matchbot-msg::-webkit-scrollbar { width:4px; }
        .matchbot-msg::-webkit-scrollbar-track { background:transparent; }
        .matchbot-msg::-webkit-scrollbar-thumb { background:rgba(34,197,94,0.3); border-radius:2px; }
        @keyframes matchbot-pulse { 0%,100%{box-shadow:0 4px 20px rgba(34,197,94,0.4);} 50%{box-shadow:0 4px 28px rgba(34,197,94,0.7), 0 0 40px rgba(34,197,94,0.2);} }
        @media (prefers-reduced-motion: reduce) {
          [data-matchbot-fab] { animation: none !important; }
        }
      `}</style>

      <button
        data-matchbot-fab
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat' : 'Open MatchBot'}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 52, height: 52, borderRadius: '50%',
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: open ? 'none' : 'matchbot-pulse 2.5s ease-in-out infinite',
          transition: 'transform 0.15s cubic-bezier(0.23,1,0.32,1)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.06)')}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06150e" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <span style={{ fontSize: 22 }}>🏏</span>
        )}
      </button>

      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <div style={{
            flexShrink: 0,
            padding: '12px 16px', borderBottom: `1px solid rgba(34,197,94,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(74,222,128,0.08) 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, boxShadow: `0 0 12px rgba(34,197,94,0.5)`,
              }}>🏆</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{BOT_NAME}</div>
                <div style={{ color: '#86efac', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>
                  Tournament helper · Online
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="matchbot-msg" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : `rgba(34,197,94,0.08)`,
                  border: m.role === 'user' ? 'none' : `1px solid rgba(34,197,94,0.2)`,
                  color: m.role === 'user' ? '#06150e' : '#f0fdf4', fontSize: isMobile ? 15 : 13.5, lineHeight: 1.5,
                  wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(34,197,94,0.08)', border: `1px solid rgba(34,197,94,0.2)`, display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, display: 'inline-block', animation: `matchbot-bounce 1.2s ${d * 0.2}s infinite ease-in-out` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            flexShrink: 0,
            padding: '10px 12px',
            paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom))' : '10px',
            borderTop: `1px solid rgba(34,197,94,0.15)`,
            display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,0.3)',
          }}>
            <input
              ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)} onKeyDown={onKey}
              placeholder="Ask about setup, scoring, points table…"
              disabled={loading}
              style={{
                flex: 1, background: 'rgba(34,197,94,0.06)', border: `1px solid rgba(34,197,94,0.25)`,
                borderRadius: 10, padding: '9px 13px', color: '#f0fdf4',
                fontSize: isMobile ? 16 : 13.5, outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = ACCENT)}
              onBlur={e => (e.target.style.borderColor = 'rgba(34,197,94,0.25)')}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              width: 38, height: 38, borderRadius: 10, border: 'none', flexShrink: 0,
              background: input.trim() && !loading ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : 'rgba(255,255,255,0.06)',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.1s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? '#06150e' : '#fff'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
