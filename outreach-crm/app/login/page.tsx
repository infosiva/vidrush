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
    <div style={{ minHeight: '100dvh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo + Hero */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📬</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: '0 0 10px' }}>
            Outreach<span style={{ color: '#10b981' }}>CRM</span>
          </h1>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', lineHeight: 1.45, margin: '0 0 8px' }}>
            Send cold emails that feel personal.<br />Track every reply like a CRM.
          </p>
          <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: '0 0 4px' }}>
            Built for small business owners who send 20–50 emails a week — not enterprise sales teams.
          </p>
        </div>

        {sent ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '24px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
            <p style={{ color: '#15803d', fontWeight: 600, margin: 0 }}>Check your email</p>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: 4 }}>Magic link sent to {email}</p>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
            {/* Google OAuth */}
            <button
              onClick={() => signIn('google')}
              style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, transition: 'background 160ms ease, transform 100ms ease' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{ width: '100%', padding: '10px 14px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#fff', boxSizing: 'border-box', transition: 'border-color 160ms ease' }}
                onFocus={e => (e.target.style.borderColor = '#10b981')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              />
              <button
                type="submit"
                disabled={loading || !email}
                style={{ width: '100%', padding: '11px 16px', borderRadius: 10, border: 'none', background: loading || !email ? '#d1fae5' : '#10b981', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading || !email ? 'not-allowed' : 'pointer', transition: 'background 160ms ease, transform 100ms ease' }}
                onMouseEnter={e => { if (!loading && email) (e.currentTarget.style.background = '#059669') }}
                onMouseLeave={e => { if (!loading && email) (e.currentTarget.style.background = '#10b981') }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {loading ? 'Sending…' : 'Send your first campaign free →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
