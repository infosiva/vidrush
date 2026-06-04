'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const PIPELINE_STEPS = [
  { icon: '📋', label: 'Post Job', desc: 'Paste your JD. Done.' },
  { icon: '🤖', label: 'AI Screens', desc: 'CVs ranked in minutes' },
  { icon: '🎥', label: 'Video Questions', desc: 'Async AI interviews' },
  { icon: '✅', label: 'You Decide', desc: 'Shortlist delivered' },
]

const EASE = 'easeOut' as const

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

const stagger = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } },
}

interface Stats {
  cvs: number
  hours: number
  interviews: number
}

function StatsStrip() {
  const [stats, setStats] = useState<Stats>({ cvs: 0, hours: 0, interviews: 0 })

  useEffect(() => {
    const stored = localStorage.getItem('zs_stats')
    if (stored) {
      setStats(JSON.parse(stored))
    } else {
      // Seed with plausible demo numbers on first visit
      const seed: Stats = { cvs: 1284, hours: 3420, interviews: 312 }
      localStorage.setItem('zs_stats', JSON.stringify(seed))
      setStats(seed)
    }
  }, [])

  const items = [
    { value: stats.cvs.toLocaleString(), label: 'CVs screened' },
    { value: `${stats.hours.toLocaleString()}h`, label: 'Hours saved' },
    { value: stats.interviews.toLocaleString(), label: 'Interviews booked' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto px-4 mb-20"
    >
      <div
        className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden"
        style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}
      >
        {items.map(({ value, label }) => (
          <div key={label} className="py-6 text-center" style={{ background: 'rgba(5,4,15,0.6)' }}>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{value}</div>
            <div className="text-xs text-white/40 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ background: '#05040f', minHeight: '100vh', color: '#f8fafc' }}>
      {/* Animated aurora background */}
      <div className="aurora" />
      <div className="aurora-third" />
      <div className="grain" />
      <div className="grid-lines" />

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(5,4,15,0.80)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="text-lg font-bold text-white"
          >
            Zero<span className="text-purple-400">Staff</span>
          </motion.span>
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-3"
          >
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors duration-200">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-medium text-white btn-press"
              style={{ transition: 'background 200ms, transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
            >
              Start free
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-28 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-10"
          style={{
            background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
            color: 'rgba(216,180,254,0.82)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 pulse-dot" />
          AI Hiring Automation
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="font-black text-white tracking-tight mb-6"
          style={{ fontSize: 'clamp(3rem, 7vw, 5rem)', lineHeight: 0.95 }}
        >
          Hire in days,
          <br />
          <span className="grad-purple-orange">not weeks.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Paste your job description. AI shortlists candidates, asks async video questions, and ranks them for you.{' '}
          <strong className="text-white/80 font-medium">No HRIS. No recruiters. Hire while you sleep.</strong>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            href="/signup"
            className="relative px-8 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-base btn-press glow-border overflow-hidden"
            style={{ transition: 'background 200ms cubic-bezier(0.23,1,0.32,1), transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
          >
            <span className="shimmer absolute inset-0 rounded-xl" />
            <span className="relative">Post your first role — free</span>
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-base btn-press"
            style={{ transition: 'border-color 200ms, color 200ms, transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
          >
            Sign in
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-4 text-xs text-white/25"
        >
          2 free job posts/month · No credit card
        </motion.p>
      </section>

      {/* Stats strip */}
      <StatsStrip />

      {/* Hiring pipeline */}
      <section className="max-w-5xl mx-auto px-4 pb-28">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
          className="text-center text-xs text-white/30 uppercase tracking-[0.2em] mb-12"
        >
          How it works
        </motion.p>

        {/* Pipeline visual */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="flex flex-col sm:flex-row items-stretch gap-0"
        >
          {PIPELINE_STEPS.map(({ icon, label, desc }, i) => (
            <motion.div
              key={label}
              variants={cardVariant}
              className="flex-1 relative"
            >
              {/* Connector arrow (not on last item) */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div
                  className="hidden sm:flex absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2 w-8 h-8 rounded-full items-center justify-center"
                  style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}
                >
                  <span className="text-purple-400 text-sm font-bold">›</span>
                </div>
              )}
              <div
                className="glass glass-hover p-6 text-center h-full mx-1 sm:mx-2"
                style={{ borderColor: i === 3 ? 'rgba(168,85,247,0.3)' : undefined }}
              >
                <div
                  className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl"
                  style={{
                    background: 'rgba(168,85,247,0.10)',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}
                >
                  {icon}
                </div>
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                  style={{ color: 'rgba(168,85,247,0.6)' }}
                >
                  Step {i + 1}
                </div>
                <div className="text-sm font-semibold text-white mb-1">{label}</div>
                <div className="text-xs text-white/35">{desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Why ZeroStaff */}
      <section className="max-w-4xl mx-auto px-4 pb-28">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          className="text-center text-xs text-white/30 uppercase tracking-[0.2em] mb-12"
        >
          vs. the alternatives
        </motion.p>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {[
            { name: 'Workable', gap: 'No AI screening — you read every CV yourself.' },
            { name: 'Rippling', gap: 'Full HRIS required — overkill for most teams.' },
            { name: 'Deel', gap: 'Enterprise compliance focus — not hiring speed.' },
          ].map(({ name, gap }) => (
            <motion.div key={name} variants={fadeUp} className="glass p-5">
              <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">{name}</div>
              <div className="text-sm text-white/50 leading-relaxed">{gap}</div>
              <div className="mt-3 text-xs text-purple-400 font-medium">ZeroStaff does this automatically ✓</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-4 pb-28">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          className="text-center text-xs text-white/30 uppercase tracking-[0.2em] mb-12"
        >
          Pricing
        </motion.p>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="grid sm:grid-cols-3 gap-4"
        >
          {[
            {
              tier: 'Free', price: '$0', sub: '2 job posts/mo',
              features: ['AI CV screening', 'Candidate ranking', 'Watermarked reports'],
              highlight: false,
            },
            {
              tier: 'Growth', price: '$79', sub: '10 job posts/mo',
              features: ['Everything free', 'Async video questions', 'Interview scheduling', 'Email notifications', 'Candidate portal'],
              highlight: true,
            },
            {
              tier: 'Scale', price: '$199', sub: 'Unlimited',
              features: ['Everything in Growth', 'Custom scoring rubric', 'ATS integration', 'API access', 'White-label portal'],
              highlight: false,
            },
          ].map(({ tier, price, sub, features, highlight }) => (
            <motion.div
              key={tier}
              variants={cardVariant}
              className="rounded-2xl p-6 border relative overflow-hidden"
              style={{
                background: highlight ? 'rgba(168,85,247,0.07)' : 'rgba(255,255,255,0.02)',
                borderColor: highlight ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.07)',
              }}
            >
              {highlight && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/80 text-white tracking-wide">
                  POPULAR
                </div>
              )}
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">{tier}</div>
              <div className="text-3xl font-extrabold text-white mb-0.5">
                {price}<span className="text-base font-normal text-white/35">/mo</span>
              </div>
              <div className="text-xs text-white/35 mb-6">{sub}</div>
              <ul className="space-y-2 mb-6">
                {features.map(f => (
                  <li key={f} className="text-sm text-white/60 flex items-center gap-2">
                    <span className="text-emerald-400 text-xs">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block text-center py-2.5 rounded-lg text-sm font-medium btn-press ${
                  highlight
                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                    : 'border border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                }`}
                style={{ transition: 'background 200ms, color 200ms, border-color 200ms, transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
              >
                {tier === 'Free' ? 'Start free' : `Get ${tier}`}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer CTA */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-2xl mx-auto px-4 pb-24 text-center"
      >
        <div className="glass p-10 rounded-3xl">
          <h2 className="text-3xl font-extrabold text-white mb-3">
            Your next hire is<br />
            <span className="grad-purple-orange">already screened.</span>
          </h2>
          <p className="text-sm text-white/40 mb-8">Post a role. AI does the screening, interviews, and ranking. You just choose.</p>
          <Link
            href="/signup"
            className="inline-block px-10 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold btn-press glow-border relative overflow-hidden"
            style={{ transition: 'background 200ms cubic-bezier(0.23,1,0.32,1), transform 160ms cubic-bezier(0.23,1,0.32,1)' }}
          >
            <span className="shimmer absolute inset-0 rounded-xl" />
            <span className="relative">Start hiring free</span>
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <div className="border-t border-white/[0.05] max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/30">Zero<span className="text-purple-400/50">Staff</span></span>
        <span className="text-xs text-white/20">© 2026 · AI Hiring Automation</span>
      </div>
    </div>
  )
}
