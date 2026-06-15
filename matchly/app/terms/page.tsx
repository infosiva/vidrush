import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Matchly',
  description: 'Terms of service for Matchly.',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-16 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="opacity-50 mb-10">Last updated: 15 June 2026</p>

      <Section title="1. Acceptance of Terms">
        <p>By using Matchly (https://matchly.app), you agree to these terms. If you do not agree, please do not use the service.</p>
      </Section>

      <Section title="2. The Service">
        <p>
          Matchly lets you create tournament pages with teams, fixtures, live scores, and points tables for
          local cricket, football, badminton, and kabaddi leagues. The service is provided free of charge.
        </p>
      </Section>

      <Section title="3. User Content">
        <p>
          You are responsible for the team names, scores, and other content you enter. Tournament pages are
          public by default once created — anyone with the link can view them. Do not enter content that is
          unlawful, defamatory, or infringes on others&apos; rights.
        </p>
      </Section>

      <Section title="4. Score Updates">
        <p>
          Score updates submitted via the web form, WhatsApp, or Telegram are published to the public tournament
          page automatically. We are not responsible for the accuracy of scores entered by organizers or scorers.
        </p>
      </Section>

      <Section title="5. No Warranty">
        <p>
          Matchly is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uptime, data
          retention, or accuracy of any information displayed.
        </p>
      </Section>

      <Section title="6. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Matchly and its operator shall not be liable for any indirect,
          incidental, or consequential damages arising from use of the service.
        </p>
      </Section>

      <Section title="7. Changes to These Terms">
        <p>We may update these terms periodically. Continued use of the service constitutes acceptance of the updated terms.</p>
      </Section>

      <Section title="8. Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:info.siva@gmail.com" className="underline">info.siva@gmail.com</a>.
        </p>
      </Section>

      <p className="mt-10 opacity-40 text-xs">© 2026 Matchly. All rights reserved.</p>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </section>
  )
}
