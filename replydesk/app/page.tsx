'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, MessageSquare, Clock, ThumbsUp, Zap, Check } from 'lucide-react'
import LiveStatsBar from '@/components/LiveStatsBar'

// ── Dashboard stats (localStorage) ──────────────────────────
function useRdStats() {
  const [stats, setStats] = useState({ drafted: 0, saved: 0, satisfaction: 0 })
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('rd_stats') || '{}')
      setStats({
        drafted:      stored.drafted      ?? 142,
        saved:        stored.saved        ?? 38,
        satisfaction: stored.satisfaction ?? 97,
      })
    } catch { /* ignore */ }
  }, [])
  return stats
}

const TONES = [
  { id: 'friendly',     label: 'Friendly',     desc: 'Warm and approachable' },
  { id: 'professional', label: 'Professional',  desc: 'Formal and precise' },
  { id: 'concise',      label: 'Concise',       desc: 'Short and to the point' },
]

const INCOMING = "Hey, I was charged twice for my subscription this month. Can you help me sort this out?"
const DRAFT_REPLY = "Sorry about that! I can see the duplicate charge — refunding it now, should land in 3-5 business days. Anything else I can help with?"

const BENEFITS = [
  { icon: Zap,           title: 'Reads full thread history',   desc: 'AI sees every prior message before drafting — no context loss.' },
  { icon: MessageSquare, title: 'Matches your brand voice',     desc: 'Pick a tone once, every reply stays consistent.' },
  { icon: Check,         title: 'You approve before it sends',  desc: 'Edit or send with one click — AI never sends unsupervised.' },
]

function useTypewriter(text: string, active: boolean, speed = 28) {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!active) { setOut(''); return }
    let i = 0
    const id = setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [active, text])
  return out
}

export default function Home() {
  const stats = useRdStats()
  const [selectedTone, setSelectedTone] = useState('friendly')
  const [demoStep, setDemoStep] = useState<'incoming' | 'drafting' | 'sent'>('incoming')

  useEffect(() => {
    const t1 = setTimeout(() => setDemoStep('drafting'), 1200)
    return () => clearTimeout(t1)
  }, [])

  const draftText = useTypewriter(DRAFT_REPLY, demoStep === 'drafting' || demoStep === 'sent')

  useEffect(() => {
    if (demoStep !== 'drafting') return
    if (draftText.length < DRAFT_REPLY.length) return
    const t = setTimeout(() => setDemoStep('sent'), 900)
    return () => clearTimeout(t)
  }, [demoStep, draftText])

  const statItems = [
    { icon: MessageSquare, label: 'Replies Drafted',   val: stats.drafted,      suffix: '',  color: '#6366f1' },
    { icon: Clock,         label: 'Hours Saved',        val: stats.saved,        suffix: 'h', color: '#06b6d4' },
    { icon: ThumbsUp,      label: 'Satisfaction Rate',  val: stats.satisfaction, suffix: '%', color: '#34d399' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#4f46e5,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4.5 4v-4H6.5C5.12 16 4 14.88 4 13.5v-8Z" fill="white"/>
              <path d="M8 8h8M8 11h5" stroke="#4f46e5" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: '#fff' }}>Reply<span style={{ color: '#6366f1' }}>Desk</span></span>
        </span>
        <Link href="/inbox" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Open Inbox <ArrowRight size={13} />
        </Link>
      </nav>

      {/* Hero — T17 Asymmetric Split: dominant demo left (3fr, sticky), copy right (2fr) */}
      <section style={{ position: 'relative', zIndex: 10 }}>
        {/* Glow orbs */}
        <div style={{ position: 'fixed', top: '20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} aria-hidden />
        <div style={{ position: 'fixed', top: '60%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} aria-hidden />

        <div className="rd-hero-split" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 0, alignItems: 'start', maxWidth: 1360, margin: '0 auto' }}>
          {/* Dominant left — animated inbox reply demo, sticky on scroll */}
          <div className="rd-demo-col" style={{ position: 'sticky', top: 54, padding: '56px 40px 56px 24px', minHeight: 'calc(100vh - 54px)', display: 'flex', alignItems: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}
            >
              {/* Thread header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>JD</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Jordan D.</div>
                  <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.4)' }}>Billing question · via email</div>
                </div>
              </div>

              {/* Incoming message */}
              <div style={{ padding: '20px 20px 8px' }}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px 14px 14px 4px', padding: '12px 16px', maxWidth: '85%', fontSize: 14, lineHeight: 1.55, color: 'rgba(241,245,249,0.85)' }}
                >
                  {INCOMING}
                </motion.div>
              </div>

              {/* AI drafted reply */}
              <div style={{ padding: '8px 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                <AnimatePresence>
                  {demoStep !== 'incoming' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '14px 14px 4px 14px', padding: '12px 16px', maxWidth: '85%', fontSize: 14, lineHeight: 1.55, color: '#e0e7ff', minHeight: 40 }}
                    >
                      {draftText}
                      {demoStep === 'drafting' && draftText.length < DRAFT_REPLY.length && <span style={{ opacity: 0.5 }}>▍</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tone selector + send state */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTone(t.id)}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${selectedTone === t.id ? 'rgba(129,140,252,0.8)' : 'rgba(255,255,255,0.16)'}`,
                        background: selectedTone === t.id ? '#3730a3' : '#232842',
                        color: selectedTone === t.id ? '#e0e4ff' : '#f1f5f9',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: demoStep === 'sent' ? '#34d399' : 'rgba(241,245,249,0.35)' }}>
                  {demoStep === 'sent' ? <><Check size={13} /> Sent</> : 'Draft → Approve → Send'}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Minor right — headline, subhead, CTA, benefits on scroll */}
          <div className="rd-copy-col" style={{ padding: '80px 24px 80px 40px' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 16px', borderRadius: 9999,
                background: 'rgba(99,102,241,0.18)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(129,140,252,0.35)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                color: '#c7d2fe',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', marginBottom: 24,
              }}>
                <Zap size={10} />
                AI Customer Support
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 900, fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)', lineHeight: 1.04, letterSpacing: '-0.03em', color: '#f8fafc', margin: '0 0 18px' }}
            >
              Reply to every customer<br />
              <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 45%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                in your brand voice
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{ color: 'rgba(241,245,249,0.6)', fontSize: 16, lineHeight: 1.65, marginBottom: 28 }}
            >
              AI reads your support history, drafts replies in your tone, and sends with one click. You approve. Done.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}
            >
              <Link
                href="/inbox"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', padding: '13px 24px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}
              >
                Open Inbox
                <ArrowRight size={16} />
              </Link>
              <a
                href="#how"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#232842', border: '1px solid rgba(255,255,255,0.18)', color: '#f8fafc', padding: '13px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
              >
                How it works
              </a>
            </motion.div>
            <p style={{ color: 'rgba(241,245,249,0.3)', fontSize: 12, marginTop: -24, marginBottom: 36 }}>No account required to try · Draft 10 replies free</p>

            {/* Benefits — reveal sequentially on scroll */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
              {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.12, duration: 0.4 }}
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color="#818cf8" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(241,245,249,0.5)', lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}
              className="rd-stats"
            >
              {statItems.map(({ icon: Icon, label, val, suffix, color }) => (
                <div key={label} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 800, fontSize: 19, color: '#f8fafc', lineHeight: 1 }}>{val}{suffix}</div>
                    <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.45)', marginTop: 2 }}>{label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <LiveStatsBar />

      {/* How it works */}
      <section id="how" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px', position: 'relative', zIndex: 10 }}>
        <h2 style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 800, fontSize: 'clamp(24px, 3.5vw, 36px)', letterSpacing: '-0.03em', color: '#f8fafc', textAlign: 'center', marginBottom: 40 }}>
          Draft → Approve → Send
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { n: '01', title: 'Connect your inbox',   body: 'Gmail, Help Scout, Intercom, or any email inbox. Set up in 2 minutes.' },
            { n: '02', title: 'AI reads & drafts',    body: 'Reads thread history, detects sentiment, writes a reply in your chosen tone. Ready in seconds.' },
            { n: '03', title: 'One-click approve & send', body: 'Review the draft, edit if needed, send with one click. Your name, your voice, zero effort.' },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }}
            >
              <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 800, fontSize: 28, color: '#6366f1', opacity: 0.5, lineHeight: 1, marginBottom: 14 }}>{s.n}</div>
              <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 700, fontSize: 16, color: '#f8fafc', marginBottom: 8 }}>{s.title}</div>
              <div style={{ color: 'rgba(241,245,249,0.55)', fontSize: 14, lineHeight: 1.6 }}>{s.body}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(241,245,249,0.25)', fontSize: 13, margin: 0 }}>© 2026 ReplyDesk · AI-powered support replies</p>
      </footer>

      <style>{`
        @media (max-width: 600px) { .rd-stats { grid-template-columns: 1fr !important; } }
        @media (max-width: 1024px) {
          .rd-hero-split { grid-template-columns: 1fr !important; }
          .rd-demo-col { position: static !important; min-height: auto !important; padding: 32px 20px 16px !important; order: 1; }
          .rd-copy-col { padding: 16px 20px 48px !important; order: 2; }
        }
        * { box-sizing: border-box; }
        a:active, button:active { transform: scale(0.97); }
      `}</style>
    </main>
  )
}
