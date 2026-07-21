import type { Metadata } from 'next'
import Script from 'next/script'
import FloatingChatWrapper from '@/components/FloatingChatWrapper'
import FeedbackWidget from '@/components/FeedbackWidget'
import './globals.css'

export const metadata: Metadata = {
  title: 'OutreachCRM — Lead email management',
  description: 'Send, track and reply to outreach emails across all your leads.',
  metadataBase: new URL('https://outreach-crm.vercel.app'),
  other: {
    'google-adsense-account': 'ca-pub-XXXXXXXXXXXXXXXX',
  },
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
        <FloatingChatWrapper />
        <FeedbackWidget siteName="Outreach CRM" position="left" />
        <Script defer data-domain="outreach-crm-olive.vercel.app" src="https://plausible.io/js/script.js" strategy="afterInteractive" />
        <Script defer data-site="outreach-crm-olive.vercel.app" src="http://31.97.56.148:3098/t.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
