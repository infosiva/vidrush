import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4a6 6 0 0 0-6 6c0 3.5-1.2 5.2-2 6h16c-.8-.8-2-2.5-2-6a6 6 0 0 0-6-6Z"
            fill="white"
          />
          <path d="M10 19a2 2 0 0 0 4 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="18" cy="6" r="4" fill="#f59e0b" stroke="#2563eb" strokeWidth="1.5" />
        </svg>
      </div>
    ),
    size
  )
}
