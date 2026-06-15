import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About | Matchly',
  description: 'Matchly is a free tool for organizing local tournaments with live scores and points tables.',
  robots: { index: true, follow: true },
}

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-16 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold mb-6">About Matchly</h1>

      <p className="mb-4">
        Matchly is a free tool for running local tournaments — gully cricket, corporate sports days,
        school events, and weekend leagues. Create a tournament, add your teams, share one link, and
        let everyone follow live scores and the points table without installing anything.
      </p>

      <p className="mb-4">
        Cricket is our deepest sport — overs, wickets, run rate, and net run rate (NRR) are all tracked
        automatically. Football, badminton, and kabaddi get the same fixtures and points-table engine
        with sport-appropriate scoring.
      </p>

      <p className="mb-4">
        Score updates can be posted from a simple mobile form, or sent directly via WhatsApp or Telegram —
        the public tournament page refreshes automatically for everyone watching.
      </p>

      <p className="opacity-60">
        Built by an independent developer. Feedback and bug reports welcome —
        use the feedback button on any page.
      </p>
    </main>
  )
}
