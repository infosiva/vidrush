import type { Metadata } from 'next'
import Script from 'next/script'
import FloatingChatWrapper from '@/components/FloatingChatWrapper'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://vidrush.app'),
  title: 'Vidrush — AI Text-to-Video Generator | Create Videos in Seconds',
  description: 'Turn any text prompt into stunning AI-generated videos. Powered by Kling AI and fal.ai. Free to try, no sign-up required.',
  openGraph: {
    title: 'Vidrush — AI Text-to-Video Generator',
    description: 'Turn any text prompt into stunning AI-generated videos in seconds.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Vidrush',
          url: 'https://vidrush.app',
          applicationCategory: 'MultimediaApplication',
          description: 'AI-powered text-to-video generator using Kling AI and fal.ai',
        })}} />
      </head>
      <body style={{ background: '#f5f3ff', color: '#0f172a', margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
        <FloatingChatWrapper />
        <Script defer data-site="vidrush.app" src="http://31.97.56.148:3098/t.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
