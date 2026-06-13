export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', fontFamily: 'system-ui', lineHeight: 1.7, color: '#1a1a1a' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 40 }}>Last updated: June 2026</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>What we collect</h2>
      <p>Vidrush collects only information you provide directly — email when you sign up, anonymous usage data. We do not sell your data.</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Cookies</h2>
      <p>We use essential cookies for authentication and anonymous analytics. Disable non-essential cookies in your browser settings.</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Third-party services</h2>
      <p>We use Vercel for hosting and Supabase for data storage. These services have their own privacy policies.</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Your rights</h2>
      <p>Request deletion of your data at any time by emailing <a href="mailto:hello@vidrush.app" style={{ color: '#2563eb' }}>hello@vidrush.app</a>.</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Contact</h2>
      <p>Questions? Email <a href="mailto:hello@vidrush.app" style={{ color: '#2563eb' }}>hello@vidrush.app</a></p>
    </main>
  )
}
