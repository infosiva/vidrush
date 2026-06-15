import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Matchly',
  description: 'Privacy policy for Matchly — how we collect, use and protect your data.',
  robots: { index: true, follow: true },
}

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-16 text-sm leading-relaxed">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="opacity-50 mb-10">Last updated: 15 June 2026</p>

      <Section title="1. Who We Are">
        <p>Matchly (https://matchly.app) is operated by an independent developer. It is a free tool for organizing local tournaments with live scores and points tables.</p>
        <p className="mt-2">Contact: <a href="mailto:info.siva@gmail.com" className="underline">info.siva@gmail.com</a></p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We may collect the following information when you use our service:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Tournament data</strong> — team names, fixtures, and scores you enter.</li>
          <li><strong>Usage data</strong> — pages visited, features used, time on site (via analytics).</li>
          <li><strong>Device/browser data</strong> — browser type, operating system, screen resolution, IP address.</li>
          <li><strong>Cookies</strong> — small files stored on your device to remember preferences and enable advertising.</li>
        </ul>
        <p className="mt-2">We do <strong>not</strong> sell your personal data to third parties.</p>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide and improve the service.</li>
          <li>To display relevant advertising through Google AdSense.</li>
          <li>To analyse usage patterns and fix bugs.</li>
          <li>To publish the tournament data you create on your public tournament page.</li>
        </ul>
      </Section>

      <Section title="4. Google AdSense and Advertising">
        <p>
          We use <strong>Google AdSense</strong> to display advertisements. Google and its partners may use cookies
          to serve ads based on your prior visits to this or other websites. You can opt out of personalised
          advertising by visiting{' '}
          <a href="https://www.google.com/settings/ads" className="underline" target="_blank" rel="noopener noreferrer">
            Google Ads Settings
          </a>.
        </p>
        <p className="mt-2">
          Google&apos;s use of advertising cookies is governed by the{' '}
          <a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
            Google Privacy Policy
          </a>.
        </p>
      </Section>

      <Section title="5. Cookies">
        <p>We use the following types of cookies:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Essential cookies</strong> — required for basic functionality.</li>
          <li><strong>Analytics cookies</strong> — help us understand how visitors use the site.</li>
          <li><strong>Advertising cookies</strong> — used by Google AdSense to serve relevant ads.</li>
        </ul>
        <p className="mt-2">
          You can control cookies through your browser settings. Blocking advertising cookies will not affect your
          ability to use the site but will show non-personalised ads.
        </p>
      </Section>

      <Section title="6. Third-Party Services">
        <p>We may use the following third-party services, each governed by their own privacy policy:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Google Analytics / Google AdSense</li>
          <li>Vercel (hosting) — <a href="https://vercel.com/legal/privacy-policy" className="underline" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
          <li>AI providers (Groq) for the MatchBot chat assistant</li>
          <li>Telegram (optional) — for organizers who choose to post score updates via bot</li>
        </ul>
      </Section>

      <Section title="7. Data Retention">
        <p>
          Tournament data is retained for as long as the tournament page exists. We retain usage data for up to
          12 months.
        </p>
      </Section>

      <Section title="8. Your Rights (GDPR / CCPA)">
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction or deletion of your data.</li>
          <li>Opt out of personalised advertising.</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p className="mt-2">To exercise these rights, email <a href="mailto:info.siva@gmail.com" className="underline">info.siva@gmail.com</a>.</p>
      </Section>

      <Section title="9. Children's Privacy">
        <p>
          This service is not directed at children under 13. We do not knowingly collect personal data from
          children. If you believe a child has provided us with personal information, please contact us.
        </p>
      </Section>

      <Section title="10. Changes to This Policy">
        <p>
          We may update this policy periodically. Changes will be posted on this page with an updated date.
          Continued use of the service constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="11. Contact Us">
        <p>
          For any privacy-related questions, contact us at{' '}
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
