import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'PhotoRestore — Restore Old Photos Free. No Account, No Subscription.',
  description: 'Upload any damaged, faded, or blurry photo — AI restores it to high resolution instantly. Free to try, no account needed, no subscription.',
  keywords: 'restore old photos free, photo restoration no account, AI photo repair online, colorize photos free, fix scratched photos instantly',
  metadataBase: new URL('https://photorestore.app'),
  openGraph: {
    title: 'PhotoRestore — Bring Old Photos Back to Life',
    description: 'AI-powered photo restoration. Fix scratches, enhance faces, add color to black & white photos in seconds.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "PhotoRestore",
          "url": "https://photorestore.app",
          "description": "AI-powered photo restoration"
        })}} />
      </head>
      <body className="relative">
        {children}
        <Script defer data-site="photorestore.app" src="http://31.97.56.148:3098/t.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
