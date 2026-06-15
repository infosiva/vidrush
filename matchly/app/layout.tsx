import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import ChatBot from '@/components/ChatBot'
import FeedbackWidget from '@/components/FeedbackWidget'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Matchly — Live Scores & Points Tables for Local Tournaments',
  description: 'Free tournament sites for gully cricket, corporate leagues, and school sports days. Live scores, points tables, and a shareable link your WhatsApp group will click.',
  metadataBase: new URL('https://matchly.app'),
  openGraph: {
    title: 'Matchly — Live Scores & Points Tables for Local Tournaments',
    description: 'Free tournament sites for gully cricket, corporate leagues, and school sports days. Live scores, points tables, and a shareable link.',
    url: 'https://matchly.app',
    siteName: 'Matchly',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Matchly — Live Scores & Points Tables for Local Tournaments',
    description: 'Free tournament sites for gully cricket, corporate leagues, and school sports days.',
  },
  robots: { index: true, follow: true },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Matchly',
  url: 'https://matchly.app',
  description: 'Free tournament organizer with live scores and points tables for local cricket, football, badminton, and kabaddi leagues.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-4237294630161176" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NavBar />
        <div style={{ paddingTop: 58 }}>{children}</div>
        <Footer />
        <ChatBot />
        <FeedbackWidget />
      </body>
    </html>
  )
}
