/**
 * followUpSender.ts — Day-3 follow-up for non-replied leads
 *
 * Usage:
 *   npx tsx src/followUpSender.ts --dry-run
 *   npx tsx src/followUpSender.ts --limit 20
 *
 * Reads .sent-emails-v2.json (rich log with timestamps + product).
 * Finds leads sent 2-5 days ago with no reply flag.
 * Sends a short follow-up using the same free email stack.
 */

import * as fs    from 'fs'
import * as path  from 'path'
import * as https from 'https'
import * as dotenv from 'dotenv'
import { FreeTierGuard } from './freeTierGuard.js'

dotenv.config({ path: path.join(process.cwd(), '.env') })
dotenv.config({ path: path.join(process.cwd(), '../.env.shared') })

const args    = process.argv.slice(2)
const get     = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i+1] : null }
const hasFlag = (f: string) => args.includes(f)
const DRY_RUN = hasFlag('--dry-run')
const LIMIT   = parseInt(get('--limit') ?? '20', 10)
const DELAY_SEC = parseInt(get('--delay') ?? '60', 10)

const SENT_LOG_V2 = path.join(process.cwd(), '.sent-emails-v2.json')
const FROM_EMAIL  = process.env.FROM_EMAIL ?? process.env.GMAIL_USER ?? ''
const FROM_NAME   = process.env.FROM_NAME  ?? 'Siva'
const guard = new FreeTierGuard()

interface SentEntry {
  email:     string
  name:      string
  product:   string
  subject:   string
  sentAt:    string   // ISO date
  followUp:  boolean  // has follow-up been sent?
  replied:   boolean  // manually mark true if they reply
}

function loadLog(): SentEntry[] {
  try {
    if (fs.existsSync(SENT_LOG_V2)) return JSON.parse(fs.readFileSync(SENT_LOG_V2, 'utf8'))
  } catch { /* ignore */ }
  return []
}

function saveLog(entries: SentEntry[]) {
  fs.writeFileSync(SENT_LOG_V2, JSON.stringify(entries, null, 2), 'utf8')
}

// ── Follow-up templates per product ──────────────────────────────────────────
function followUpBody(name: string, product: string): { subject: string; body: string } {
  const templates: Record<string, { subject: string; body: string }> = {
    bookingcall: {
      subject: `Re: never miss a booking call`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nJust following up — did you get a chance to look at BookingCall?\n\nIf missed calls are costing you bookings, it's worth a 2-minute look. Free to try.\n\nbookingcall.app\n\nSiva`,
    },
    draftcal: {
      subject: `Re: social posts for your business`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nQuick follow-up on DraftCal.\n\nIf you're still writing social posts by hand, give it one try — paste your business name and it generates a full month of captions.\n\nFree at draftcal.app\n\nSiva`,
    },
    tutiq: {
      subject: `Re: free AI tutor`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nFollowing up on Tutiq.\n\nIf any of your students struggle between sessions, it's a free AI tutor they can use any time. No account needed.\n\ntutiq.app\n\nSiva`,
    },
    kwizzo: {
      subject: `Re: quiz tool for your events`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nJust checking in on Kwizzo.\n\nIf you run quiz nights, it saves a lot of prep — AI generates questions, everyone plays on their phone, live leaderboard.\n\nFree at kwizzo.app\n\nSiva`,
    },
    speakiq: {
      subject: `Re: AI conversation practice`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nFollowing up on SpeakIQ.\n\nIf your students want more speaking practice between lessons, it's a free AI conversation partner in 20+ languages.\n\nspeakiq.app\n\nSiva`,
    },
    roamplan: {
      subject: `Re: AI itinerary tool`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nJust following up on RoamPlan.\n\nIf you help clients plan trips, it builds full itineraries in 60 seconds from a single destination + dates prompt.\n\nFree at roamplan.app\n\nSiva`,
    },
    invoicemint: {
      subject: `Re: invoicing in 30 seconds`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nQuick follow-up on InvoiceMint.\n\nIf you're still using templates or Word docs for invoices, it generates a clean PDF in 30 seconds.\n\nFree at invoicemint.cloud\n\nSiva`,
    },
    agencyos: {
      subject: `Re: content for your business`,
      body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nFollowing up on AgencyOS.\n\nOne brief → blog + social + email draft in under 2 minutes. Free to try.\n\nagencyos.vercel.app\n\nSiva`,
    },
  }
  return templates[product] ?? {
    subject: `Following up`,
    body: `Hi${name !== 'there' ? ` ${name}` : ''},\n\nJust checking if you had a chance to look at what I sent over. Happy to answer any questions.\n\nSiva`,
  }
}

// ── Email sender (Resend primary) ─────────────────────────────────────────────
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const sender = guard.getEmailSender()
  if (!sender) return false

  if (sender === 'resend') {
    const key = process.env.RESEND_API_KEY
    if (!key) return false
    const payload = JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      text: body,
    })
    return new Promise(resolve => {
      const req = https.request({
        hostname: 'api.resend.com', path: '/emails', method: 'POST', port: 443,
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      }, res => {
        res.resume()
        if (res.statusCode === 200 || res.statusCode === 201) { guard.trackResend(); resolve(true) }
        else resolve(false)
      })
      req.on('error', () => resolve(false))
      req.write(payload); req.end()
    })
  }
  // TODO: Brevo + Gmail fallback (same pattern as emailSender.ts)
  return false
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📧 Follow-Up Sender${DRY_RUN ? ' (DRY RUN)' : ''}`)
  guard.printStatus()

  const entries = loadLog()
  const now = Date.now()
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
  const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000

  // Find candidates: sent 2-6 days ago, no follow-up, no reply
  const candidates = entries.filter(e => {
    if (e.followUp || e.replied) return false
    const age = now - new Date(e.sentAt).getTime()
    return age >= TWO_DAYS_MS && age <= SIX_DAYS_MS
  }).slice(0, LIMIT)

  console.log(`\n📋 ${candidates.length} leads eligible for follow-up`)

  let sent = 0
  for (const lead of candidates) {
    const { subject, body } = followUpBody(lead.name, lead.product)
    console.log(`\n→ ${lead.email} (${lead.product})`)
    console.log(`  Subject: ${subject}`)

    if (!DRY_RUN) {
      const ok = await sendEmail(lead.email, subject, body)
      if (ok) {
        lead.followUp = true
        sent++
        console.log(`  ✅ sent`)
        // delay between sends
        await new Promise(r => setTimeout(r, DELAY_SEC * 1000))
      } else {
        console.log(`  ❌ failed (check email config)`)
      }
    } else {
      console.log(`  [DRY RUN — not sent]`)
    }
  }

  saveLog(entries)
  console.log(`\n✅ Done — ${sent}/${candidates.length} follow-ups sent`)
  console.log(`\n💡 Mark replies manually:`)
  console.log(`   Edit .sent-emails-v2.json → set "replied": true for responding leads`)
  console.log(`   Then move them to CRM or ping Telegram`)
}

main().catch(console.error)
