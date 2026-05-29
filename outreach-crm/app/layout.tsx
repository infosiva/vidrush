import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OutreachCRM — Lead email management',
  description: 'Send, track and reply to outreach emails across all your leads.',
  metadataBase: new URL('https://outreach-crm.vercel.app'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100dvh' }}>
        <div className="aurora aurora-1" aria-hidden />
        <div className="aurora aurora-2" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  )
}
