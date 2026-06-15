import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Create a Tournament | Matchly',
  description: 'Create a free tournament page with live scores and points tables.',
  robots: { index: true, follow: true },
}

export default function CreatePage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-24 text-center flex flex-col items-center gap-4">
      <div className="text-5xl">🏆</div>
      <h1 className="text-3xl font-extrabold">Tournament setup is almost ready</h1>
      <p className="opacity-60 max-w-md">
        We&apos;re putting the finishing touches on tournament creation. In the meantime, check out a live
        example to see what your tournament page will look like.
      </p>
      <div className="flex gap-3 mt-2">
        <Link href="/demo" className="btn-primary">See a live example</Link>
        <Link href="/" className="btn-secondary">Back home</Link>
      </div>
    </main>
  )
}
