'use client'
import { useState } from 'react'

export default function VidrushPage() {
  const [prompt, setPrompt] = useState('')
  const [enhanced, setEnhanced] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'enhancing' | 'generating' | 'done' | 'error'>('idle')

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

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: 32 }}>
      <div style={{ textAlign: 'center', maxWidth: 600 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#c4b5fd', marginBottom: 20, letterSpacing: '.04em' }}>
          ✦ AI TEXT-TO-VIDEO
        </div>
        <h1 style={{ fontSize: 'clamp(32px,6vw,60px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 16 }}>
          Turn words into<br />
          <span style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>cinematic video.</span>
        </h1>
        <p style={{ fontSize: 17, color: 'rgba(248,250,252,0.6)', lineHeight: 1.65, marginBottom: 32 }}>
          Describe your scene. AI enhances your prompt and generates a video using Kling AI — free, no sign-up.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 600 }}>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="A sunset over the ocean, waves gently crashing, cinematic golden hour…"
          rows={3}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: '#f8fafc', resize: 'vertical', outline: 'none', fontFamily: 'inherit', marginBottom: 12 }}
        />
        <button
          onClick={generate}
          disabled={status === 'enhancing' || status === 'generating'}
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'transform 160ms cubic-bezier(0.23,1,0.32,1)', opacity: (status === 'enhancing' || status === 'generating') ? 0.7 : 1 }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'none')}
        >
          {status === 'enhancing' ? 'Enhancing prompt…' : status === 'generating' ? 'Generating video…' : 'Generate Video →'}
        </button>
      </div>

      {enhanced && (
        <div style={{ width: '100%', maxWidth: 600, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 10, padding: '12px 16px' }}>
          <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, marginBottom: 6, letterSpacing: '.04em' }}>ENHANCED PROMPT</p>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.8)', lineHeight: 1.6 }}>{enhanced}</p>
        </div>
      )}

      {status === 'done' && videoUrl && (
        <div style={{ width: '100%', maxWidth: 600 }}>
          <video src={videoUrl} controls autoPlay loop style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(139,92,246,0.3)' }} />
          <a href={videoUrl} download="vidrush-video.mp4"
            style={{ display: 'block', marginTop: 12, textAlign: 'center', padding: '10px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, fontSize: 13, color: '#c4b5fd', textDecoration: 'none' }}>
            Download video
          </a>
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: '#f87171', fontSize: 13 }}>Generation failed — please try again.</p>
      )}
    </main>
  )
}
