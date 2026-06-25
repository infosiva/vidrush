/**
 * send-from-db.ts — Read status='new' leads from Neon, send personalised emails via Resend,
 *                   mark status='contacted', insert a threads row per sent email.
 *
 * Usage:
 *   node --env-file=.env.local --import=tsx/esm scripts/send-from-db.ts --product bookingcall
 *   node --env-file=.env.local --import=tsx/esm scripts/send-from-db.ts --product draftcal --limit 10 --delay 30
 *   node --env-file=.env.local --import=tsx/esm scripts/send-from-db.ts --product tutiq --dry-run
 *
 * Flags:
 *   --product <name>   (required) product key — bookingcall, draftcal, kwizzo, etc.
 *   --limit <n>        max leads to process (default 20)
 *   --delay <seconds>  seconds between sends (default 60)
 *   --dry-run          build emails but do NOT send or update DB
 */

import * as https from 'https'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, isNotNull } from 'drizzle-orm'
import { pgTable, text, timestamp, boolean, integer, serial, pgEnum } from 'drizzle-orm/pg-core'

// ── Inline schema (avoid @/* alias issues with tsx --import) ──────────────────
const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'replied', 'interested', 'converted', 'unsubscribed', 'bounced'])
const threadStatusEnum = pgEnum('thread_status', ['sent', 'delivered', 'opened', 'replied', 'bounced', 'unsubscribed'])

const leads = pgTable('leads', {
  id:         serial('id').primaryKey(),
  userId:     text('user_id').notNull(),
  name:       text('name').notNull(),
  email:      text('email').notNull(),
  company:    text('company'),
  city:       text('city'),
  category:   text('category'),
  product:    text('product'),
  website:    text('website'),
  phone:      text('phone'),
  status:     leadStatusEnum('status').default('new').notNull(),
  notes:      text('notes'),
  source:     text('source'),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
})

const threads = pgTable('threads', {
  id:           serial('id').primaryKey(),
  leadId:       integer('lead_id').notNull(),
  userId:       text('user_id').notNull(),
  subject:      text('subject').notNull(),
  status:       threadStatusEnum('status').default('sent').notNull(),
  resendId:     text('resend_id'),
  openedAt:     timestamp('opened_at'),
  repliedAt:    timestamp('replied_at'),
  followUpAt:   timestamp('follow_up_at'),
  followUpSent: boolean('follow_up_sent').default(false),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

// ── Email templates (same copy as business-agent/src/leadScraper.ts) ──────────
const TEMPLATES: Record<string, {
  url: string
  subject: (biz: string, city: string) => string
  body: (biz: string, city: string) => string
}> = {
  tutiq: {
    url: 'tutiq.app',
    subject: (_biz, city) => `Free AI tutor for your students in ${city}`,
    body: (biz, city) => `Hi ${biz} team,

Noticed you offer tutoring in ${city}. Thought this might be useful for your students.

Tutiq is a free AI tutor — it explains any subject step by step, adapts to the student's age, and gives practice questions between your sessions. No account needed.

Some tutors share it with parents as a free bonus. Students love having help available at 10pm when homework hits.

Free at tutiq.app — takes 10 seconds to try.

Best,
Siva`,
  },

  draftcal: {
    url: 'draftcal.app',
    subject: (biz, city) => `30 days of social content for ${biz} — written by AI`,
    body: (biz, city) => `Hi ${biz} team,

Running a business in ${city} means social media often gets left behind.

DraftCal generates a full month of Instagram/Facebook posts for your business in 60 seconds — captions, hashtags, posting schedule. You just copy and paste.

Free at draftcal.app — no account needed.

Best,
Siva`,
  },

  kwizzo: {
    url: 'kwizzo.app',
    subject: (biz, _city) => `Free quiz night tool for ${biz}`,
    body: (biz, city) => `Hi ${biz} team,

If you run quiz nights or events at ${biz}, this might save you a lot of prep time.

Kwizzo generates unlimited quiz questions on any topic instantly — no printing, no prep. Runs on everyone's phone, live leaderboard included.

Free at kwizzo.app

Best,
Siva`,
  },

  quizbites: {
    url: 'quizbites.app',
    subject: (_biz, city) => `Run live classroom quizzes in ${city} — free`,
    body: (biz, _city) => `Hi ${biz} team,

QuizBites lets you run live quizzes with any group — students answer on their phones, you see results in real time.

Works for classroom revision, training sessions, team events. No downloads for participants.

Free at quizbites.app

Best,
Siva`,
  },

  roamplan: {
    url: 'roamplan.app',
    subject: (_biz, city) => `AI travel planning tool — free for your ${city} clients`,
    body: (biz, _city) => `Hi ${biz} team,

RoamPlan builds full day-by-day trip itineraries with AI — clients describe where they want to go, it handles the planning.

Useful as a free tool to share with clients before they book. Builds trust and saves consultation time.

Free at roamplan.app

Best,
Siva`,
  },

  speakiq: {
    url: 'speakiq.app',
    subject: (_biz, city) => `AI conversation partner for language learners in ${city}`,
    body: (biz, _city) => `Hi ${biz} team,

SpeakIQ lets language learners practice real conversations with AI between lessons — it corrects grammar naturally without interrupting flow.

Works for 20+ languages. Useful to recommend to students for daily practice outside class.

Free at speakiq.app

Best,
Siva`,
  },

  bookingcall: {
    url: 'bookingcall.app',
    subject: (biz, _city) => `Never miss a booking call at ${biz}`,
    body: (biz, _city) => `Hi ${biz} team,

Every missed call is a missed booking. BookingCall is a free AI receptionist that answers calls 24/7, takes appointment details, and sends you a message instantly.

No hardware needed — works on your existing phone number. Takes 5 minutes to set up.

Free at bookingcall.app — no credit card needed.

Best,
Siva`,
  },

  aicoachlab: {
    url: 'aicoachlab.app',
    subject: (_biz, city) => `Free AI coaching tool for your clients in ${city}`,
    body: (biz, _city) => `Hi ${biz} team,

AICoachLab gives your clients an AI coach available 24/7 between sessions — answers questions, tracks goals, keeps momentum going.

Works as a free value-add you share with clients. They get daily support; you get clients who come back prepared.

Free at aicoachlab.app

Best,
Siva`,
  },

  invoicemint: {
    url: 'invoicemint.app',
    subject: (biz, _city) => `Free invoice generator for ${biz}`,
    body: (biz, _city) => `Hi ${biz} team,

Invoicemint generates professional PDF invoices in seconds — no account, no subscription.

Free at invoicemint.app

Best,
Siva`,
  },

  meetscribe: {
    url: 'meetscribe.app',
    subject: (biz, _city) => `Auto-transcribe your client calls at ${biz}`,
    body: (biz, _city) => `Hi ${biz} team,

MeetScribe records and transcribes meetings automatically — searchable notes, action items extracted.

Free at meetscribe.app

Best,
Siva`,
  },

  resumevault: {
    url: 'resumevault.app',
    subject: (_biz, city) => `AI CV builder for your candidates in ${city}`,
    body: (biz, _city) => `Hi ${biz} team,

ResVault builds ATS-optimised CVs for candidates in minutes. Share with clients as a free tool.

Free at resumevault.app

Best,
Siva`,
  },

  replydesk: {
    url: 'replydesk.app',
    subject: (biz, _city) => `AI support replies for ${biz} — instant, on-brand`,
    body: (biz, _city) => `Hi ${biz} team,

ReplyDesk drafts customer support replies in your tone in under 3 seconds.

Free at replydesk.app

Best,
Siva`,
  },

  anylocal: {
    url: 'anylocal.app',
    subject: (biz, city) => `Free local business listing for ${biz} in ${city}`,
    body: (biz, _city) => `Hi ${biz} team,

AnyLocal connects local businesses directly with nearby customers — free listing, no commission.

Free at anylocal.app

Best,
Siva`,
  },

  mandirates: {
    url: 'mandirates.app',
    subject: (biz, _city) => `Live commodity prices for ${biz} — mandi rates`,
    body: (biz, _city) => `Hi ${biz} team,

MandiRates shows live wholesale vegetable and grain prices from Indian mandis — useful for menu costing.

Free at mandirates.app

Best,
Siva`,
  },

  trackwealth: {
    url: 'trackwealth.app',
    subject: (biz, _city) => `Free portfolio tracker for your clients at ${biz}`,
    body: (biz, _city) => `Hi ${biz} team,

TrackWealth lets clients track investments across accounts in one dashboard. Share as a free client tool.

Free at trackwealth.app

Best,
Siva`,
  },

  rideflow: {
    url: 'rideflow.app',
    subject: (biz, _city) => `Route optimiser for ${biz} drivers — free`,
    body: (biz, _city) => `Hi ${biz} team,

RideFlow optimises multi-stop routes for drivers automatically — saves fuel and time.

Free at rideflow.app

Best,
Siva`,
  },

  vidrush: {
    url: 'vidrush.app',
    subject: (biz, _city) => `AI video scripts for ${biz} in 30 seconds`,
    body: (biz, _city) => `Hi ${biz} team,

Vidrush generates short-form video scripts and hooks for any product — TikTok, Reels, YouTube Shorts.

Free at vidrush.app

Best,
Siva`,
  },

  worldtrends: {
    url: 'worldtrends.today',
    subject: (biz, _city) => `Live trending topics dashboard for ${biz}`,
    body: (biz, _city) => `Hi ${biz} team,

WorldTrends shows what's trending globally right now — useful for content planning and newsjacking.

Free at worldtrends.today

Best,
Siva`,
  },

  pdfideas: {
    url: 'pdfideas.app',
    subject: (biz, _city) => `Turn your docs into interactive PDFs at ${biz}`,
    body: (biz, _city) => `Hi ${biz} team,

PDFideas converts any document into a shareable interactive PDF with AI summaries.

Free at pdfideas.app

Best,
Siva`,
  },
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
const hasFlag = (flag: string) => args.includes(flag)

const PRODUCT  = getArg('--product')
const LIMIT    = parseInt(getArg('--limit') ?? '20', 10)
const DELAY_S  = parseInt(getArg('--delay') ?? '60', 10)
const DRY_RUN  = hasFlag('--dry-run')

// ── Validate args + env ───────────────────────────────────────────────────────
const KNOWN_PRODUCTS = Object.keys(TEMPLATES).sort().join(', ')

if (!PRODUCT) {
  console.error(`Usage: node --env-file=.env.local --import=tsx/esm scripts/send-from-db.ts --product <name> [--limit 20] [--delay 60] [--dry-run]`)
  console.error(`\nKnown products: ${KNOWN_PRODUCTS}`)
  process.exit(1)
}

if (!TEMPLATES[PRODUCT]) {
  console.error(`Unknown product "${PRODUCT}". Known products: ${KNOWN_PRODUCTS}`)
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set — run with --env-file=.env.local')
  process.exit(1)
}

if (!DRY_RUN && !process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY not set — run with --env-file=.env.local or use --dry-run')
  process.exit(1)
}

// ── DB setup ──────────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!)
const db  = drizzle(sql, { schema: { leads, threads } })

// ── Resend via plain https.request (no SDK — avoids tsx/esm resolution issues) ─
interface ResendResult {
  id?: string
  error?: string
}

function sendViaResend(opts: {
  to: string
  subject: string
  text: string
}): Promise<ResendResult> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      from:    'Siva <info@sivaprakasam.com>',
      to:      [opts.to],
      subject: opts.subject,
      text:    opts.text,
    })

    const req = https.request(
      {
        hostname: 'api.resend.com',
        path:     '/emails',
        method:   'POST',
        headers: {
          'Authorization':  `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ id: body.id })
            } else {
              resolve({ error: body.message ?? body.name ?? `HTTP ${res.statusCode}` })
            }
          } catch {
            resolve({ error: `HTTP ${res.statusCode} — unparseable response` })
          }
        })
      }
    )

    req.on('error', (err) => resolve({ error: err.message }))
    req.write(payload)
    req.end()
  })
}

// ── Delay helper ──────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const template = TEMPLATES[PRODUCT!]

  console.log(`\nsend-from-db — product=${PRODUCT} limit=${LIMIT} delay=${DELAY_S}s dry-run=${DRY_RUN}`)
  console.log('─'.repeat(60))

  // Fetch new leads for this product that have an email
  const rows = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.status, 'new'),
        eq(leads.product as any, PRODUCT!),
        isNotNull(leads.email),
      )
    )
    .orderBy(leads.importedAt)
    .limit(LIMIT)

  if (!rows.length) {
    console.log(`No status='new' leads found for product="${PRODUCT}" with email set.`)
    return
  }

  console.log(`Found ${rows.length} lead(s) to process\n`)

  let sent    = 0
  let failed  = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const lead    = rows[i]
    const bizName = lead.company ?? lead.name
    const city    = lead.city ?? 'your city'
    const subject = template.subject(bizName, city)
    const body    = template.body(bizName, city)

    console.log(`[${i + 1}/${rows.length}] ${lead.email} — ${bizName}`)
    console.log(`  Subject: ${subject}`)

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] would send — skipping DB update\n`)
      skipped++
      continue
    }

    // Send email
    const result = await sendViaResend({ to: lead.email, subject, text: body })

    if (result.error) {
      console.error(`  FAILED: ${result.error}\n`)
      failed++
      // Continue to next lead — don't mark as contacted
      continue
    }

    console.log(`  Sent (Resend ID: ${result.id})`)

    // Mark lead as contacted
    await db
      .update(leads)
      .set({ status: 'contacted', updatedAt: new Date() })
      .where(eq(leads.id, lead.id))

    // Insert threads row
    await db
      .insert(threads)
      .values({
        leadId:   lead.id,
        userId:   lead.userId,
        subject,
        status:   'sent',
        resendId: result.id ?? null,
        createdAt: new Date(),
      })

    console.log(`  DB updated — status='contacted', thread inserted\n`)
    sent++

    // Respect delay between sends (skip after last item)
    if (i < rows.length - 1) {
      console.log(`  Waiting ${DELAY_S}s before next send...`)
      await sleep(DELAY_S * 1000)
    }
  }

  // Summary
  console.log('─'.repeat(60))
  console.log(`Summary: sent=${sent}  failed=${failed}  skipped(dry-run)=${skipped}  total=${rows.length}`)
  if (failed > 0) {
    console.log(`Warning: ${failed} send(s) failed — those leads remain status='new' and can be retried.`)
  }
  if (DRY_RUN && skipped > 0) {
    console.log(`Dry-run mode: no emails sent, no DB changes made.`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
