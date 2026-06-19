import { ImageResponse } from 'next/og'
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
export default function Icon() {
  return new ImageResponse(
    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="12" r="4" stroke="white" strokeWidth="2"/>
        <circle cx="17" cy="12" r="4" stroke="white" strokeWidth="2"/>
        <path d="M10.5 12a1.5 1.5 0 003 0" stroke="white" strokeWidth="1.6" fill="white" fillOpacity="0.3"/>
      </svg>
    </div>
  )
}
