'use client'

/**
 * FeedbackWidget — drop-in floating feedback button for any Next.js site.
 *
 * Usage:
 *   import FeedbackWidget from '@/components/FeedbackWidget'
 *   <FeedbackWidget siteName="Kwizzo" accentColor="#7c3aed" />
 *
 * Requires:
 *   POST /api/feedback  — receives { type, rating, message, email?, page, site }
 *   (copy the API route from shared-ui/src/api/feedback-route.ts)
 */

import { useState } from 'react'
import { MessageSquare, Star, Send, X, CheckCircle, ChevronDown } from 'lucide-react'

const FEEDBACK_TYPES = ['General', 'Bug Report', 'Feature Request', 'Content Issue', 'Other']

interface Props {
  siteName: string
  /** Main accent gradient start colour, e.g. '#7c3aed'. Defaults to amber. */
  accentColor?: string
  /** Secondary accent colour. Defaults to rose/red. */
  accentColor2?: string
  /** Override the API endpoint. Defaults to '/api/feedback'. */
  apiEndpoint?: string
  /** Bottom-right offset in px. Defaults to 24. */
  offset?: number
  /** Which side to anchor the widget. Defaults to 'right'. Pass 'left' when chatbot occupies right. */
  position?: 'left' | 'right'
}

export default function FeedbackWidget({
  siteName,
  accentColor  = '#f59e0b',
  accentColor2 = '#ef4444',
  apiEndpoint  = '/api/feedback',
  offset       = 24,
  position     = 'right',
}: Props) {
  const [open,    setOpen]    = useState(false)
  const [type,    setType]    = useState('General')
  const [rating,  setRating]  = useState(0)
  const [hover,   setHover]   = useState(0)
  const [message, setMessage] = useState('')
  const [email,   setEmail]   = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const gradient = `linear-gradient(135deg, ${accentColor}, ${accentColor2})`

  const reset = () => {
    setType('General'); setRating(0); setHover(0)
    setMessage(''); setEmail(''); setSent(false); setError('')
  }

  const submit = async () => {
    if (message.trim().length < 5) { setError('Please write at least a few words.'); return }
    if (!rating)                    { setError('Please give a star rating.'); return }
    setError(''); setSending(true)
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site:    siteName,
          type,
          rating,
          message: message.trim(),
          email:   email.trim() || undefined,
          page:    typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError('Could not send — please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* ── Floating trigger ── */}
      <button
        onClick={() => { setOpen(true); reset() }}
        aria-label="Send feedback"
        style={{
          position: 'fixed', bottom: offset, ...(position === 'left' ? { left: offset } : { right: offset }), zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 999,
          background: gradient, color: '#000',
          fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
          boxShadow: `0 4px 20px ${accentColor}55, 0 2px 8px rgba(0,0,0,0.4)`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <MessageSquare style={{ width: 15, height: 15 }} />
        Feedback
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(0,0,0,0.55)',
          }}
        />
      )}

      {/* ── Modal ── */}
      {open && (
        <div style={{
          position: 'fixed', zIndex: 100,
          bottom: 0, ...(position === 'left' ? { left: 0 } : { right: 0 }),
          width: '100%',
          maxWidth: 420,
          borderRadius: '24px 24px 0 0',
          background: 'rgba(8,6,20,0.99)',
          border: `1px solid ${accentColor}30`,
          boxShadow: `0 0 0 1px ${accentColor}10, 0 32px 64px rgba(0,0,0,0.75)`,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: 0 }}>Share your feedback</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '3px 0 0' }}>
                Sent directly to the {siteName} team
              </p>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8,
              padding: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {sent ? (
            /* ── Success state ── */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '48px 20px', gap: 16,
            }}>
              <CheckCircle style={{ width: 56, height: 56, color: '#34d399' }} />
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0 }}>Thank you!</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0, textAlign: 'center' }}>
                Your feedback has been received. We read every message.
              </p>
              <button onClick={() => { reset(); setOpen(false) }} style={{
                marginTop: 8, padding: '10px 28px', borderRadius: 12,
                background: gradient, color: '#000', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer',
              }}>
                Close
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Type */}
              <div>
                <label style={labelStyle}>Type</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    style={{
                      width: '100%', appearance: 'none', padding: '10px 14px',
                      borderRadius: 12, fontSize: 13, color: '#fff',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none', paddingRight: 32,
                    }}
                  >
                    {FEEDBACK_TYPES.map(t => (
                      <option key={t} value={t} style={{ background: '#080614' }}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 14, height: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none',
                  }} />
                </div>
              </div>

              {/* Stars */}
              <div>
                <label style={labelStyle}>Rating</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Star style={{
                        width: 26, height: 26,
                        color: n <= (hover || rating) ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                        fill:  n <= (hover || rating) ? '#f59e0b' : 'transparent',
                        transition: 'color 0.1s, fill 0.1s',
                      }} />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span style={{ marginLeft: 8, color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>
                      {['','Poor','Fair','Good','Great','Excellent'][rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 500))}
                  placeholder="Tell us what you think, found a bug, or have a suggestion…"
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
                    color: '#fff', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none', resize: 'none', fontFamily: 'inherit',
                  }}
                />
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'right', margin: '3px 0 0' }}>
                  {message.length}/500
                </p>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>
                  Email <span style={{ fontWeight: 400, textTransform: 'none', color: 'rgba(255,255,255,0.25)' }}>
                    (optional — for replies)
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13,
                    color: '#fff', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>

              {error && (
                <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={submit}
                disabled={sending}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  background: gradient, color: '#000',
                  fontWeight: 900, fontSize: 13, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: sending ? 0.65 : 1, transition: 'opacity 0.15s',
                  boxShadow: `0 4px 16px ${accentColor}44`,
                }}
              >
                {sending ? (
                  <>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(0,0,0,0.25)', borderTopColor: '#000',
                      animation: 'fw-spin 0.7s linear infinite',
                    }} />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send style={{ width: 14, height: 14 }} />
                    Send Feedback
                  </>
                )}
              </button>

              <p style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, textAlign: 'center', margin: 0 }}>
                Goes directly to the {siteName} team · We read every message
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fw-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 640px) {
          /* On sm+: float above trigger button, aligned right */
          [data-fw-modal] {
            bottom: auto !important;
            top: auto !important;
          }
        }
      `}</style>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: 11,
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 6,
}
