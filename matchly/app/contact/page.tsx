import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact | Matchly',
  description: 'Get in touch with the Matchly team.',
  robots: { index: true, follow: true },
}

export default function ContactPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-16 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold mb-6">Contact</h1>

      <p className="mb-4">
        Questions, feedback, or found a bug? Email us at{' '}
        <a href="mailto:info.siva@gmail.com" className="underline">info.siva@gmail.com</a>.
      </p>

      <p className="opacity-60">
        You can also use the feedback button at the bottom-left of any page to send us a message directly.
      </p>
    </main>
  )
}
