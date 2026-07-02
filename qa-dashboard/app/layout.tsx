import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QA Dashboard — Portfolio Visual Health',
  description: 'E2E visual QA across all portfolio projects. Contrast, overflow, text overlap, UI checks.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "'Inter', system-ui, sans-serif", background: '#0a0f1e', color: '#e2e8f0', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
