'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await signIn('resend', { email, redirect: false })
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Outreach<span style={{ color: 'var(--accent)' }}>CRM</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            Send, track and reply to your leads
          </p>
        </div>

        {sent ? (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✉️</div>
            <p style={{ color: '#4ade80', fontWeight: 600, margin: 0 }}>Check your email</p>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>Magic link sent to {email}</p>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <button
              onClick={() => signIn('google')}
              style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, transition: 'background 0.15s' }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ color: 'var(--text2)', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <form onSubmit={handleMagicLink}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />
              <button
                type="submit"
                disabled={loading || !email}
                style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}
              >
                {loading ? 'Sending…' : 'Send magic link →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
