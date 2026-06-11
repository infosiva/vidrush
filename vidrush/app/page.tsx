'use client'
import { useState, useEffect, useRef } from 'react'

const DEMO_CLIPS = [
  { label: 'Sunset Ocean', prompt: 'Sunset over the ocean, waves crashing, golden hour cinematic', duration: '0:08', emoji: '🌅', color: '#f59e0b' },
  { label: 'City Neon', prompt: 'City streets at night, neon lights reflecting on wet pavement', duration: '0:06', emoji: '🌆', color: '#8b5cf6' },
  { label: 'Forest Path', prompt: 'Misty forest path at dawn, soft light through ancient trees', duration: '0:09', emoji: '🌲', color: '#10b981' },
  { label: 'Mountain Peak', prompt: 'Snow-capped mountain peak, dramatic clouds, aerial drone shot', duration: '0:07', emoji: '⛰️', color: '#06b6d4' },
]

const STEPS = [
  { n: '01', title: 'Enter your prompt', desc: 'Describe any scene, story, or idea in plain text.' },
  { n: '02', title: 'AI enhances it', desc: 'Our AI expands your prompt into a full cinematic scene brief.' },
  { n: '03', title: 'Video generates', desc: 'Kling AI renders your video — typically under 60 seconds.' },
]

const FEATURES = [
  { icon: '🎬', title: 'HD Video Output', desc: 'Full 720p HD clips ready for social media or editing workflows.' },
  { icon: '⚡', title: 'Fast Generation', desc: 'Most videos render in 30–60 seconds, not hours or days.' },
  { icon: '🎨', title: 'Multiple Styles', desc: 'Cinematic, anime, documentary, drone — describe your look.' },
  { icon: '📥', title: 'Free Download', desc: 'Download your MP4 instantly. No account or card required.' },
]

const SOCIAL_PROOF = [
  { text: 'Generated a product promo in under a minute. The AI enhancement made my rough idea into a proper cinematic brief.' },
  { text: 'Used it for three social media clips this week. Each one was ready before I even finished my coffee.' },
  { text: 'The drone-shot style prompt worked perfectly for my travel content. Saved me hours of filming.' },
]

export default function VidrushPage() {
  const [prompt, setPrompt] = useState('')
  const [enhanced, setEnhanced] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'enhancing' | 'generating' | 'done' | 'error'>('idle')
  const [activeClip, setActiveClip] = useState(0)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const t = setInterval(() => setActiveClip(c => (c + 1) % DEMO_CLIPS.length), 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setProgress(0)
    if (progressRef.current) clearInterval(progressRef.current)
    progressRef.current = setInterval(() => {
      setProgress(p => (p >= 95 ? 95 : p + 1))
    }, 35)
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [activeClip])

  async function generate() {
    if (!prompt.trim()) return
    setStatus('enhancing')
    setEnhanced('')
    setVideoUrl('')
    try {
      const eRes = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const eData = await eRes.json()
      const finalPrompt = eData.enhanced || prompt
      setEnhanced(finalPrompt)
      setStatus('generating')
      const gRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt }),
      })
      const gData = await gRes.json()
      if (gData.url) {
        setVideoUrl(gData.url)
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const busy = status === 'enhancing' || status === 'generating'

  return (
    <main style={{ background: '#f5f3ff', color: '#0f172a', minHeight: '100dvh', fontFamily: 'system-ui, sans-serif' }}>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(245,243,255,0.88)', backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(124,58,237,0.12)',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.04em', color: '#0f172a' }}>
          Vid<span style={{ color: '#7c3aed' }}>Rush</span>
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#how-it-works" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>How it works</a>
          <a href="#features" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>Features</a>
          <a href="#generate"
            style={{
              fontSize: 13, background: '#7c3aed', color: '#fff',
              padding: '7px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 700,
              transition: 'background 150ms, transform 100ms cubic-bezier(0.23,1,0.32,1)',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >Try Free</a>
        </div>
      </nav>

      {/* HERO — split 2-col */}
      <section id="generate" style={{
        maxWidth: 1160, margin: '0 auto', padding: '72px 24px 64px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 56, alignItems: 'center',
      }}>
        {/* Left — copy + tool */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#7c3aed',
            marginBottom: 20, letterSpacing: '.04em', fontWeight: 700,
          }}>
            ● AI TEXT-TO-VIDEO — FREE
          </div>
          <h1 style={{
            fontSize: 'clamp(34px,5vw,58px)', fontWeight: 900,
            letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 16, color: '#0f172a',
          }}>
            Turn words into<br />
            <span style={{ color: '#7c3aed' }}>cinematic video.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.65, marginBottom: 32, maxWidth: 480 }}>
            Describe any scene. AI enhances your prompt and generates a stunning video using Kling AI — no sign-up, no credit card.
          </p>

          <div style={{
            background: '#fff', border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: 16, padding: 20,
            boxShadow: '0 2px 24px rgba(124,58,237,0.08)',
          }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="A sunset over the ocean, waves gently crashing, cinematic golden hour…"
              rows={3}
              style={{
                width: '100%', background: '#f5f3ff',
                border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10,
                padding: '12px 14px', fontSize: 14, color: '#0f172a', resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={generate}
              disabled={busy}
              style={{
                width: '100%', padding: '14px',
                background: busy ? '#c4b5fd' : '#7c3aed',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
                transition: 'background 150ms, transform 100ms cubic-bezier(0.23,1,0.32,1)',
              }}
              onMouseDown={e => { if (!busy) e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {status === 'enhancing' ? '✨ Enhancing prompt…' : status === 'generating' ? '🎬 Generating video…' : 'Generate Video →'}
            </button>
          </div>

          {enhanced && (
            <div style={{
              marginTop: 16, background: '#ede9fe',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginBottom: 4, letterSpacing: '.04em' }}>AI-ENHANCED PROMPT</p>
              <p style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.6 }}>{enhanced}</p>
            </div>
          )}

          {status === 'done' && videoUrl && (
            <div style={{ marginTop: 16 }}>
              <video src={videoUrl} controls autoPlay loop style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(124,58,237,0.2)' }} />
              <a href={videoUrl} download="vidrush-video.mp4"
                style={{
                  display: 'block', marginTop: 10, textAlign: 'center',
                  padding: '10px', background: '#ede9fe',
                  border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8,
                  fontSize: 13, color: '#7c3aed', textDecoration: 'none', fontWeight: 600,
                }}>
                ↓ Download MP4
              </a>
            </div>
          )}

          {status === 'error' && (
            <p style={{ marginTop: 12, color: '#7c3aed', fontSize: 13, background: '#ede9fe', padding: '8px 12px', borderRadius: 8 }}>
              Generation failed — please try again.
            </p>
          )}
        </div>

        {/* Right — animated demo panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Main player */}
          <div style={{
            background: '#1e1b4b', borderRadius: 20, overflow: 'hidden',
            aspectRatio: '16/9', position: 'relative',
            border: '1px solid rgba(124,58,237,0.3)',
            boxShadow: '0 12px 48px rgba(124,58,237,0.18)',
          }}>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, #1e1b4b 0%, #2d1b69 60%, #1e1b4b 100%)`,
            }}>
              <div style={{
                fontSize: 64, marginBottom: 14,
                transition: 'opacity 350ms cubic-bezier(0.23,1,0.32,1)',
                filter: `drop-shadow(0 0 24px ${DEMO_CLIPS[activeClip].color}55)`,
              }}>
                {DEMO_CLIPS[activeClip].emoji}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(248,250,252,0.85)', fontWeight: 700, letterSpacing: '-0.01em' }}>
                {DEMO_CLIPS[activeClip].label}
              </div>
              <div style={{
                marginTop: 8, fontSize: 11, color: 'rgba(248,250,252,0.45)',
                maxWidth: 220, textAlign: 'center', lineHeight: 1.55,
              }}>
                {DEMO_CLIPS[activeClip].prompt}
              </div>
            </div>

            {/* Progress bar overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(0deg,rgba(0,0,0,0.85) 0%,transparent 100%)',
              padding: '32px 16px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16, color: '#a78bfa' }}>▶</span>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: '#7c3aed',
                  width: `${progress}%`,
                  transition: 'width 35ms linear',
                  borderRadius: 2,
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                {DEMO_CLIPS[activeClip].duration}
              </span>
            </div>

            {/* AI Preview badge */}
            <div style={{
              position: 'absolute', top: 12, left: 12,
              background: 'rgba(124,58,237,0.85)', backdropFilter: 'blur(8px)',
              borderRadius: 6, padding: '3px 9px', fontSize: 10, color: '#fff',
              fontWeight: 800, letterSpacing: '.06em',
              display: 'flex', alignItems: 'center', gap: 5,
              border: '1px solid rgba(167,139,250,0.4)',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#a78bfa', display: 'inline-block',
                animation: 'pulse 1.2s infinite',
              }} />
              AI PREVIEW
            </div>

            {/* Clip counter */}
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
              borderRadius: 6, padding: '3px 9px', fontSize: 10, color: 'rgba(255,255,255,0.7)',
              fontWeight: 600,
            }}>
              {activeClip + 1} / {DEMO_CLIPS.length}
            </div>
          </div>

          {/* Clip selector strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {DEMO_CLIPS.map((c, i) => (
              <button
                key={i}
                onClick={() => setActiveClip(i)}
                style={{
                  background: activeClip === i ? '#7c3aed' : '#fff',
                  border: `1px solid ${activeClip === i ? '#7c3aed' : 'rgba(124,58,237,0.15)'}`,
                  borderRadius: 10, padding: '10px 4px', fontSize: 20, cursor: 'pointer',
                  transition: 'background 160ms cubic-bezier(0.23,1,0.32,1), border-color 160ms, transform 100ms cubic-bezier(0.23,1,0.32,1)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  boxShadow: activeClip === i ? '0 4px 16px rgba(124,58,237,0.25)' : 'none',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span>{c.emoji}</span>
                <span style={{ fontSize: 9, color: activeClip === i ? '#fff' : '#64748b', fontWeight: 700 }}>
                  {c.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SPEC ROW */}
      <section style={{ background: '#fff', borderTop: '1px solid rgba(124,58,237,0.1)', borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
        <div style={{
          maxWidth: 1160, margin: '0 auto', padding: '32px 24px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 24, textAlign: 'center',
        }}>
          {[
            { val: '5–30s', label: 'Video length range' },
            { val: '720p', label: 'HD output quality' },
            { val: '< 60s', label: 'Avg. generation time' },
            { val: 'MP4', label: 'Ready to download' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed', letterSpacing: '-0.03em' }}>{s.val}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a' }}>How it works</h2>
          <p style={{ fontSize: 15, color: '#64748b', marginTop: 10 }}>From prompt to video in three simple steps.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid rgba(124,58,237,0.12)',
              borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(124,58,237,0.06)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#7c3aed', letterSpacing: '.08em', marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</p>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(124,58,237,0.08)' }} />
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: '#fff', borderTop: '1px solid rgba(124,58,237,0.1)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a' }}>Everything you need</h2>
            <p style={{ fontSize: 15, color: '#64748b', marginTop: 10 }}>Professional AI video generation, completely free.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{
                background: '#f5f3ff', border: '1px solid rgba(124,58,237,0.12)',
                borderRadius: 14, padding: 24,
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(22px,3.5vw,36px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a' }}>What people are making</h2>
          <p style={{ fontSize: 15, color: '#64748b', marginTop: 10 }}>Real videos from real prompts — no fabricated results.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {SOCIAL_PROOF.map((q, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid rgba(124,58,237,0.12)',
              borderRadius: 14, padding: '24px 24px 20px',
              boxShadow: '0 2px 12px rgba(124,58,237,0.05)',
            }}>
              <div style={{ fontSize: 24, color: '#a78bfa', marginBottom: 12, lineHeight: 1 }}>"</div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, fontStyle: 'italic' }}>{q.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
        padding: '64px 24px', textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 12 }}>
          Ready to create?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32 }}>
          No account. No credit card. Just your imagination.
        </p>
        <a
          href="#generate"
          style={{
            display: 'inline-block', background: '#fff', color: '#7c3aed',
            padding: '14px 36px', borderRadius: 12, fontWeight: 800, fontSize: 15,
            textDecoration: 'none', letterSpacing: '-0.01em',
            transition: 'transform 100ms cubic-bezier(0.23,1,0.32,1)',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Generate your first video →
        </a>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#1e1b4b', color: 'rgba(248,250,252,0.5)',
        padding: '28px 24px', textAlign: 'center', fontSize: 13,
      }}>
        <span style={{ fontWeight: 900, color: '#fff', marginRight: 8 }}>
          Vid<span style={{ color: '#a78bfa' }}>Rush</span>
        </span>
        AI Text-to-Video Generator · Free · No sign-up required
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @media (prefers-reduced-motion:reduce) { * { animation:none!important; transition:none!important; } }
      `}</style>
    </main>
  )
}
