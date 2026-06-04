import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import ChatBot from '@/components/ChatBot'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zerostaff.app'),
  title: 'ZeroStaff — Hire in Days, Not Weeks. AI Screening & Interview Booking.',
  description: 'AI screens CVs, ranks candidates, sends async video questions, and books interviews while you sleep. No HRIS. No recruiters. Hire in days.',
  openGraph: {
    title: 'ZeroStaff — Hire in Days, Not Weeks',
    description: 'AI screens CVs, ranks candidates, asks async video questions, and books interviews automatically.',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full" style={{ background: '#080712', color: '#f8fafc' }}>
        {children}
        <ChatBot />
        <Script defer data-site="zerostaff.app" src="http://31.97.56.148:3098/t.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
