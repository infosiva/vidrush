'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',          label: 'Home',      icon: '🏠' },
  { href: '/create',    label: 'Create',    icon: '➕' },
  { href: '/demo',      label: 'Demo',      icon: '▶' },
  { href: '/dashboard', label: 'Dashboard', icon: '📋' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
      style={{
        background: 'rgba(12,20,16,0.75)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        height: 52,
      }}
    >
      <Link href="/" className="flex items-center gap-1.5 font-black text-base shrink-0">
        <span>🏆</span>
        <span>Match<span style={{ color: 'var(--accent-2)' }}>ly</span></span>
      </Link>

      <div className="flex items-center gap-0.5">
        {NAV.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="px-2.5 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                color: isActive ? 'var(--accent-2)' : 'rgba(240,253,244,0.6)',
                background: isActive ? 'rgba(34,197,94,0.12)' : 'transparent',
              }}
            >
              {/* Icon on mobile, label on desktop */}
              <span className="sm:hidden text-base">{icon}</span>
              <span className="hidden sm:inline text-sm">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
