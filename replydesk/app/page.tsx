'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, MessageSquare, Clock, ThumbsUp, Users, Zap } from 'lucide-react'
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

export default function Home() {
  const stats = useRdStats()
  const [selectedTone, setSelectedTone] = useState('friendly')

  const statItems = [
    { icon: MessageSquare, label: 'Replies Drafted',   val: stats.drafted,      suffix: '',  color: '#6366f1' },
    { icon: Clock,         label: 'Hours Saved',        val: stats.saved,        suffix: 'h', color: '#06b6d4' },
    { icon: ThumbsUp,      label: 'Satisfaction Rate',  val: stats.satisfaction, suffix: '%', color: '#34d399' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: '#fff' }}>Reply<span style={{ color: '#6366f1' }}>Desk</span></span>
        <Link href="/inbox" style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', borderRadius: 9, padding: '7px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Open Inbox <ArrowRight size={13} />
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '80px 24px 48px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        {/* Glow orbs */}
        <div style={{ position: 'fixed', top: '20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} aria-hidden />
        <div style={{ position: 'fixed', top: '60%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} aria-hidden />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 9999,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
            color: 'rgba(165,180,252,0.82)',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', marginBottom: 28,
          }}>
            <Zap size={10} />
            AI Customer Support · Reply in your brand voice
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55 }}
          style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 4.25rem)', lineHeight: 0.97, letterSpacing: '-0.04em', color: '#f8fafc', margin: '0 0 24px' }}
        >
          Reply to every customer<br />
          <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 45%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 32px rgba(99,102,241,0.45))' }}>
            in your brand voice
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ color: 'rgba(241,245,249,0.6)', fontSize: 18, lineHeight: 1.65, maxWidth: 560, margin: '0 auto 40px' }}
        >
          AI reads your support history, drafts replies in your tone, and sends with one click. You approve. Done.
        </motion.p>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}
          className="rd-stats"
        >
          {statItems.map(({ icon: Icon, label, val, suffix, color }) => (
            <div key={label} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 800, fontSize: 22, color: '#f8fafc', lineHeight: 1 }}>{val}{suffix}</div>
                <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.45)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tone selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '24px 28px', marginBottom: 36, textAlign: 'left' }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(241,245,249,0.4)', marginBottom: 14 }}>
            Reply tone
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {TONES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTone(t.id)}
                style={{
                  padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${selectedTone === t.id ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.1)'}`,
                  background: selectedTone === t.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  color: selectedTone === t.id ? '#a5b4fc' : 'rgba(241,245,249,0.6)',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p style={{ color: 'rgba(241,245,249,0.4)', fontSize: 13, margin: 0 }}>
            Selected: <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{TONES.find(t => t.id === selectedTone)?.desc}</span> — AI will draft all replies in this voice.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.5 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Link
            href="/inbox"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', padding: '14px 28px', borderRadius: 12, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 24px rgba(99,102,241,0.35)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
          >
            Open Inbox
            <ArrowRight size={17} />
          </Link>
          <a
            href="#how"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(241,245,249,0.8)', padding: '14px 28px', borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
          >
            How it works
          </a>
        </motion.div>

        <p style={{ color: 'rgba(241,245,249,0.3)', fontSize: 12, marginTop: 16 }}>No account required to try · Draft 10 replies free</p>
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
        * { box-sizing: border-box; }
        a:active, button:active { transform: scale(0.97); }
      `}</style>
    </main>
  )
}
