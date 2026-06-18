'use client'
import { useState, useRef } from 'react'

export default function BeforeAfterSlider() {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    setPosition(pct)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden cursor-col-resize shadow-card-hover select-none"
      onMouseMove={e => handleMove(e.clientX)}
      onTouchMove={e => handleMove(e.touches[0].clientX)}
    >
      {/* "Before" — damaged/faded portrait simulation */}
      <div
        className="absolute inset-0"
        style={{ filter: 'sepia(0.85) contrast(0.7) brightness(0.95) saturate(0.6) blur(0.5px)' }}
      >
        <div className="w-full h-full bg-gradient-to-br from-amber-100 via-stone-200 to-amber-200 relative flex items-center justify-center overflow-hidden">
          {/* Scratches */}
          <div className="absolute inset-0 opacity-30" style={{ background: 'repeating-linear-gradient(75deg, transparent 0px, transparent 18px, rgba(120,100,70,0.4) 19px, transparent 20px)' }} />
          {/* Portrait silhouette */}
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-stone-400/50 mx-auto mb-3" style={{ boxShadow: 'inset 0 -8px 16px rgba(120,100,70,0.3)' }} />
            <div className="w-40 h-20 rounded-t-full bg-stone-400/40 mx-auto -mt-2" />
          </div>
          {/* Water stain */}
          <div className="absolute top-4 right-6 w-16 h-16 rounded-full bg-amber-700/10 blur-md" />
        </div>
      </div>

      {/* "After" — restored, sharp, vivid portrait */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="w-full h-full bg-gradient-to-br from-sky-50 via-rose-50 to-amber-50 relative flex items-center justify-center overflow-hidden">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 mx-auto mb-3 shadow-lg" />
            <div className="w-40 h-20 rounded-t-full bg-gradient-to-br from-amber-100 to-rose-100 mx-auto -mt-2 shadow-lg" />
          </div>
        </div>
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${position}%` }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3M16 9l3 3-3 3" />
          </svg>
        </div>
      </div>

      {/* Corner labels */}
      <span className="absolute top-3 left-3 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full font-medium">
        Before
      </span>
      <span className="absolute top-3 right-3 bg-accent/90 text-white text-xs px-2.5 py-1 rounded-full font-medium">
        After
      </span>
    </div>
  )
}
