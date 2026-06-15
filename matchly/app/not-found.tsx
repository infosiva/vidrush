import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-24 text-center flex flex-col items-center gap-4">
      <div className="text-5xl">🏏</div>
      <h1 className="text-3xl font-extrabold">Wide ball — page not found</h1>
      <p className="opacity-60 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to the action.
      </p>
      <Link href="/" className="btn-primary mt-2">Back to Matchly</Link>
    </main>
  )
}
