import Link from 'next/link'

const LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full border-t mt-auto" style={{ borderColor: 'var(--border-default)' }}>
      <div className="max-w-6xl mx-auto px-5 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-black">
              <span>🏆</span>
              Match<span style={{ color: 'var(--accent-2)' }}>ly</span>
            </div>
            <p className="text-xs max-w-xs opacity-40">
              Free live scoring &amp; points tables for gully cricket, corporate leagues, and school sports days.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-4 text-xs opacity-50">
            {LINKS.map(link => (
              <Link key={link.href} href={link.href} className="hover:opacity-100 transition-opacity">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-30" style={{ borderColor: 'var(--border-default)' }}>
          <span>© {year} Matchly. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <span className="live-dot" aria-hidden />
            Live scoring, no app needed
          </span>
        </div>
      </div>
    </footer>
  )
}
