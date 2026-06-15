'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3"
      style={{
        background: 'rgba(12,20,16,0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Link href="/" className="flex items-center gap-2 font-black text-lg">
        <span>🏆</span>
        Match<span style={{ color: 'var(--accent-2)' }}>ly</span>
      </Link>
      <div className="flex items-center gap-1">
        {NAV.map(({ href, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: isActive ? 'var(--accent-2)' : 'rgba(240,253,244,0.65)',
                background: isActive ? 'rgba(34,197,94,0.12)' : 'transparent',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
