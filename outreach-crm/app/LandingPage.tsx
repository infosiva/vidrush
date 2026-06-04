'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const FEATURES = [
  {
    icon: '✍️',
    title: 'AI-personalized emails',
    desc: "Each outreach email adapts to the recipient's name, company, and role — written by AI, reviewed by you.",
  },
  {
    icon: '📊',
    title: 'CRM-style reply tracking',
    desc: 'See every thread, reply status, and follow-up in one clean inbox. No more lost emails.',
  },
  {
    icon: '📅',
    title: 'Smart follow-ups',
    desc: 'Automatically queue follow-ups after 3 days of silence. Never let a warm lead go cold.',
  },
  {
    icon: '📬',
    title: 'Magic link — no password',
    desc: 'Sign in with your email or Google. No password to remember, no friction.',
  },
  {
    icon: '🔗',
    title: 'Lead import from CSV',
    desc: 'Paste a CSV of contacts. AI maps fields automatically and starts your campaign in seconds.',
  },
  {
    icon: '📈',
    title: 'Reply rate analytics',
    desc: 'Track open signals, reply rates, and campaign performance across all your outreach sequences.',
  },
]

const HOW_STEPS = [
  { num: '01', label: 'Import leads', desc: 'Upload a CSV or paste contacts. AI maps fields in seconds.' },
  { num: '02', label: 'Write once, personalize many', desc: 'Draft your template. AI generates a unique version for each contact.' },
  { num: '03', label: 'Send and track', desc: 'Emails go out from your account. Every reply lands in your thread view.' },
  { num: '04', label: 'Follow up automatically', desc: 'Set a follow-up window. AI sends a second touch only to non-responders.' },
]

const EASE = [0.23, 1, 0.32, 1] as const

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080c14', color: '#e2e4f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Ambient glow */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
          top: '-15%', left: '-10%',
          animation: 'blob1 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,140,248,0.07) 0%, transparent 70%)',
          bottom: '5%', right: '-5%',
          animation: 'blob2 28s ease-in-out infinite',
        }} />
      </div>

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        padding: '0 24px', height: 54,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: '#e2e4f0' }}>
          Outreach<span style={{ color: '#6366f1' }}>CRM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
          <Link
            href="/login"
            style={{
              padding: '7px 16px', borderRadius: 9,
              background: '#6366f1', color: '#fff',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
              transition: 'background 150ms cubic-bezier(0.23,1,0.32,1)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#4f46e5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#6366f1')}
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px 64px', position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr)',
          gap: 48,
          alignItems: 'center',
        }}
          className="outreach-lg-grid"
        >
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '5px 14px', borderRadius: 9999,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: 'rgba(165,180,252,0.85)',
              marginBottom: 18,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', display: 'inline-block', boxShadow: '0 0 8px #818cf8' }} />
              AI Outreach · No warm-up · No HRIS
            </div>

            <h1 style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)',
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
              color: '#f0f1f8',
              marginBottom: 16,
            }}>
              Cold emails that{' '}
              <span style={{
                background: 'linear-gradient(135deg, #a5b4fc, #818cf8, #6366f1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.45))',
              }}>
                feel personal.
              </span>
              <br />
              Replies tracked like a CRM.
            </h1>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 28, maxWidth: 490 }}>
              Built for small business owners sending 20–50 emails a week.{' '}
              <strong style={{ color: 'rgba(255,255,255,0.75)' }}>Import leads, AI personalizes each email, you hit send.</strong>{' '}
              Every reply threads into a clean CRM view.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {[
                { label: '✉️ AI personalization', color: '#a5b4fc' },
                { label: '📊 Reply tracking', color: '#6ee7b7' },
                { label: '📅 Auto follow-ups', color: '#fcd34d' },
                { label: '🔒 Magic link auth', color: '#f9a8d4' },
              ].map(p => (
                <span key={p.label} style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '4px 11px', borderRadius: 99,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: p.color,
                }}>
                  {p.label}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                href="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '13px 28px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
                  boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
                  transition: 'opacity 150ms',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Send your first campaign free →
              </Link>
              <Link
                href="/login"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '13px 22px', borderRadius: 12,
                  border: '1px solid rgba(99,102,241,0.25)',
                  color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                  transition: 'border-color 150ms, color 150ms',
                }}
              >
                Sign in
              </Link>
            </div>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
              No credit card required · Free for up to 50 emails/month
            </p>
          </motion.div>

          {/* Right — demo panel */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
          >
            <div style={{
              background: 'rgba(13,17,23,0.92)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}>
              {/* Chrome bar */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(99,102,241,0.12)',
                padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#ff5f57', '#ffbd2e', '#28ca41'].map(c => (
                    <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                  ))}
                </div>
                <div style={{
                  flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.04)', borderRadius: 6,
                  padding: '3px 10px', fontFamily: 'monospace',
                }}>
                  outreach-crm.vercel.app/dashboard
                </div>
              </div>

              {/* Demo content */}
              <div style={{ padding: '20px' }}>
                {/* Email thread */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(99,102,241,0.6)', marginBottom: 10 }}>
                    Active threads
                  </div>
                  {[
                    { name: 'Sarah Chen', co: 'TechCorp', status: 'replied', time: '2m ago', preview: "Hi, thanks for reaching out! We'd love to…", dot: '#22c55e' },
                    { name: 'Marcus Webb', co: 'Pixel Studio', status: 'opened', time: '1h ago', preview: 'Saw your email — this looks interesting…', dot: '#f59e0b' },
                    { name: 'Ayesha Patel', co: 'Bloom Media', status: 'sent', time: '3h ago', preview: 'Hi Ayesha, I noticed your team recently…', dot: '#6366f1' },
                  ].map((t, i) => (
                    <motion.div
                      key={t.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.3, ease: EASE }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                        background: i === 0 ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${i === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff',
                      }}>
                        {t.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f1f8' }}>{t.name} · <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>{t.co}</span></span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{t.time}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.preview}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
                          <span style={{ fontSize: 9, fontWeight: 600, color: t.dot, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.status}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* AI compose hint */}
                <div style={{
                  background: 'rgba(99,102,241,0.07)',
                  border: '1px solid rgba(99,102,241,0.18)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(165,180,252,0.7)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    AI draft preview
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    &ldquo;Hi Marcus, I noticed Pixel Studio recently launched a new brand identity toolkit — congrats on the launch! I wanted to reach out because…&rdquo;
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <div style={{ padding: '4px 10px', borderRadius: 6, background: '#6366f1', fontSize: 10, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Use this draft</div>
                    <div style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>Regenerate</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderTop: '1px solid rgba(99,102,241,0.08)', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>
            How it works
          </p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: '#f0f1f8', letterSpacing: '-0.025em', marginBottom: 44 }}>
            From lead list to booked call in 4 steps
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
                style={{
                  background: 'rgba(13,17,23,0.7)',
                  border: '1px solid rgba(99,102,241,0.12)',
                  borderRadius: 14, padding: '20px 18px',
                  transition: 'border-color 200ms',
                }}
                whileHover={{ y: -2 }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(99,102,241,0.55)', letterSpacing: '0.08em', marginBottom: 10 }}>{step.num}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f1f8', marginBottom: 6 }}>{step.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{step.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ borderTop: '1px solid rgba(99,102,241,0.08)', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>
            Features
          </p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: '#f0f1f8', letterSpacing: '-0.025em', marginBottom: 44 }}>
            Everything you need for outbound sales
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07, ease: EASE }}
                style={{
                  background: 'rgba(13,17,23,0.7)',
                  border: '1px solid rgba(99,102,241,0.1)',
                  borderRadius: 14, padding: '20px 18px',
                }}
                whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(99,102,241,0.12)' }}
              >
                <div style={{ fontSize: 22, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f1f8', marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ borderTop: '1px solid rgba(99,102,241,0.08)', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(99,102,241,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>
            Pricing
          </p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, color: '#f0f1f8', letterSpacing: '-0.025em', marginBottom: 44 }}>
            Simple and transparent
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            {[
              {
                tier: 'Free',
                price: '$0',
                sub: '50 emails/month',
                highlight: false,
                features: ['AI email personalization', 'Reply thread tracking', 'CSV import (up to 50 contacts)', 'Magic link auth'],
              },
              {
                tier: 'Growth',
                price: '$29',
                sub: '500 emails/month',
                highlight: true,
                features: ['Everything in Free', 'Auto follow-up sequences', 'Analytics & reply rates', 'Unlimited contacts', 'Priority support'],
              },
            ].map(({ tier, price, sub, highlight, features }) => (
              <div
                key={tier}
                style={{
                  background: highlight ? 'rgba(99,102,241,0.08)' : 'rgba(13,17,23,0.7)',
                  border: `1px solid ${highlight ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.1)'}`,
                  borderRadius: 16, padding: '24px 20px',
                  position: 'relative',
                }}
              >
                {highlight && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 99,
                    background: '#6366f1', color: '#fff', letterSpacing: '0.06em',
                  }}>
                    POPULAR
                  </div>
                )}
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(165,180,252,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{tier}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#f0f1f8', letterSpacing: '-0.04em', marginBottom: 2 }}>
                  {price}<span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>{sub}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                  {features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                      <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '11px', borderRadius: 10,
                    background: highlight ? '#6366f1' : 'transparent',
                    border: highlight ? 'none' : '1px solid rgba(99,102,241,0.25)',
                    color: highlight ? '#fff' : 'rgba(255,255,255,0.55)',
                    fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    transition: 'background 150ms',
                  }}
                >
                  {tier === 'Free' ? 'Start free' : 'Get Growth'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ padding: '64px 24px 80px', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{
            maxWidth: 640, margin: '0 auto',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 20, padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, color: '#f0f1f8', letterSpacing: '-0.03em', marginBottom: 10 }}>
            Stop losing leads in your inbox.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
            OutreachCRM tracks every email, follow-up, and reply — so nothing slips through.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 32px', borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
            }}
          >
            Start your first campaign →
          </Link>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
            Free to start · No credit card required
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(99,102,241,0.08)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(255,255,255,0.2)',
        position: 'relative', zIndex: 1,
      }}>
        OutreachCRM · AI-powered cold outreach for small teams · © 2026
      </footer>

      <style>{`
        @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,40px) scale(1.06)} 66%{transform:translate(-30px,60px) scale(0.96)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,-40px) scale(1.04)} 66%{transform:translate(40px,-60px) scale(0.98)} }
        @media (prefers-reduced-motion: reduce) { [style*="blob"] { animation: none !important; } }
        @media (min-width: 1024px) {
          .outreach-lg-grid { grid-template-columns: 1fr 1fr !important; }
        }
        a:active { transform: scale(0.97); }
      `}</style>
    </div>
  )
}
