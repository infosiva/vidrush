/**
 * hyperScraper.ts — AI-powered lead scraper using HyperAgent
 *
 * Replaces brittle cheerio scraping with browser automation + LLM extraction.
 * Handles JS-rendered pages, anti-bot measures, dynamic content.
 *
 * Uses ANTHROPIC_API_KEY from env (free fallback to GROQ via env chain).
 *
 * Usage:
 *   npx tsx src/hyperScraper.ts --city "Manchester" --category "tutor" --product tutiq --limit 20
 *   npx tsx src/hyperScraper.ts --city "London" --category "salon" --product bookingcall --limit 30
 *   npx tsx src/hyperScraper.ts --city "Birmingham" --category "restaurant" --product draftcal --limit 25
 *
 * Output: leads/YYYY-MM-DD-{city}-{category}-hyper-{product}.csv
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { HyperAgent } from '@hyperbrowser/agent'

dotenv.config({ path: path.join(process.cwd(), '.env') })
dotenv.config({ path: path.join(process.cwd(), '../.env.shared') })

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const get  = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i+1] : null }

const CITY     = get('--city')     ?? 'London'
const CATEGORY = get('--category') ?? 'tutor'
const PRODUCT  = get('--product')  ?? 'tutiq'
const LIMIT    = parseInt(get('--limit') ?? '20', 10)
const SOURCE   = get('--source')   ?? 'yell'  // yell | yelp | google | thomsonlocal

// ── Product templates (same as leadScraper) ───────────────────────────────────
const PRODUCTS: Record<string, {
  url: string
  subject: (biz: string, city: string) => string
  body: (biz: string, city: string) => string
}> = {
  tutiq: {
    url: 'tutiq.app',
    subject: (biz, city) => `Free AI tutor for your students in ${city}`,
    body: (biz, city) =>
`Hi ${biz} team,\n\nNoticed you offer tutoring in ${city}.\n\nTutiq is a free AI tutor — explains any subject step by step, adapts to age, gives practice questions between your sessions. No account needed.\n\nFree at tutiq.app — 10 seconds to try.\n\nBest,\nSiva`,
  },
  draftcal: {
    url: 'draftcal.app',
    subject: (biz, city) => `30 days of social content for ${biz} — written by AI`,
    body: (biz, city) =>
`Hi ${biz} team,\n\nRunning a business in ${city} means social media often gets left behind.\n\nDraftCal generates a full month of posts for your business in 60 seconds. Just copy and paste.\n\nFree at draftcal.app\n\nBest,\nSiva`,
  },
  bookingcall: {
    url: 'bookingcall.app',
    subject: (biz, city) => `Never miss a booking call again — free AI receptionist`,
    body: (biz, city) =>
`Hi ${biz} team,\n\nMissed calls = lost bookings. BookingCall is a free AI that answers your phone 24/7, takes appointment details, and sends you a summary.\n\nFree at bookingcall.app\n\nBest,\nSiva`,
  },
  kwizzo: {
    url: 'kwizzo.app',
    subject: (biz, city) => `Free quiz night tool — no prep needed`,
    body: (biz, city) =>
`Hi ${biz} team,\n\nKwizzo generates unlimited quiz questions instantly. Runs on everyone's phone, live leaderboard included. No printing, no prep.\n\nFree at kwizzo.app\n\nBest,\nSiva`,
  },
  roamplan: {
    url: 'roamplan.app',
    subject: (biz, city) => `AI itinerary tool for your ${city} clients`,
    body: (biz, city) =>
`Hi ${biz} team,\n\nRoamPlan builds full day-by-day trip itineraries with AI. Useful to share with clients before they book — saves consultation time.\n\nFree at roamplan.app\n\nBest,\nSiva`,
  },
  speakiq: {
    url: 'speakiq.app',
    subject: (biz, city) => `AI conversation partner for language learners in ${city}`,
    body: (biz, city) =>
`Hi ${biz} team,\n\nSpeakIQ gives language learners a conversation partner between lessons — corrects grammar naturally, 20+ languages.\n\nFree at speakiq.app\n\nBest,\nSiva`,
  },
}

const CATEGORY_PRODUCT: Record<string, string> = {
  tutor: 'tutiq', tutoring: 'tutiq', school: 'tutiq',
  'language school': 'speakiq',
  restaurant: 'draftcal', cafe: 'draftcal', coffee: 'draftcal',
  gym: 'draftcal', salon: 'bookingcall', hairdresser: 'bookingcall',
  dentist: 'bookingcall', 'dental clinic': 'bookingcall',
  pub: 'kwizzo', bar: 'kwizzo',
  'travel agent': 'roamplan', hotel: 'roamplan',
}

// ── Source URL builder ────────────────────────────────────────────────────────
function buildSearchUrl(source: string, category: string, city: string): string {
  const q = encodeURIComponent(category)
  const l = encodeURIComponent(city)
  switch (source) {
    case 'yelp':         return `https://www.yelp.com/search?find_desc=${q}&find_loc=${l}`
    case 'google':       return `https://www.google.com/maps/search/${q}+in+${l}`
    case 'thomsonlocal': return `https://www.thomsonlocal.com/search/${q}/${l}`
    case 'yell':
    default:             return `https://www.yell.com/ucs/UcsSearchAction.do?keywords=${q}&location=${l}`
  }
}

// ── CSV helper ────────────────────────────────────────────────────────────────
function csvEsc(s: string): string {
  s = String(s ?? '')
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const productKey = PRODUCTS[PRODUCT] ? PRODUCT : (CATEGORY_PRODUCT[CATEGORY.toLowerCase()] ?? 'draftcal')
  const product    = PRODUCTS[productKey]
  const searchUrl  = buildSearchUrl(SOURCE, CATEGORY, CITY)

  console.log(`\n🤖 HyperAgent scraper`)
  console.log(`   Category : ${CATEGORY} in ${CITY}`)
  console.log(`   Source   : ${SOURCE} → ${searchUrl}`)
  console.log(`   Product  : ${productKey} (${product.url})`)
  console.log(`   Limit    : ${LIMIT} leads\n`)

  const agent = new HyperAgent({
    llmConfig: {
      provider: 'anthropic',
      apiKey:   process.env.ANTHROPIC_API_KEY ?? '',
      options:  { model: 'claude-haiku-4-5-20251001' },  // cheapest, fast enough for extraction
    },
  })

  const task = `
Go to this URL: ${searchUrl}

Extract a list of up to ${LIMIT} local businesses from the search results.
For each business, extract:
- name (business name)
- address (full address if visible)
- phone (phone number if visible)
- website (their own website URL, not the directory URL)

If the page shows "no results" or blocks you, try scrolling down or clicking "Load more".
Return the results as a JSON array like this:
[
  { "name": "...", "address": "...", "phone": "...", "website": "..." },
  ...
]

Only return the JSON array, nothing else.
`

  let leads: Array<{ name: string; address: string; phone: string; website: string }> = []

  try {
    const result = await agent.executeTask(task)
    const text   = typeof result === 'string' ? result : JSON.stringify(result)

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        leads = JSON.parse(match[0])
        console.log(`✅ Extracted ${leads.length} leads via HyperAgent`)
      } catch {
        console.error('❌ JSON parse failed — raw output:\n', text.slice(0, 500))
      }
    } else {
      console.error('❌ No JSON array in response:\n', text.slice(0, 500))
    }
  } catch (err: any) {
    console.error('❌ HyperAgent task failed:', err.message)
    process.exit(1)
  } finally {
    await agent.closeAgent()
  }

  if (!leads.length) {
    console.log('No leads extracted. Try a different --source or --category.')
    return
  }

  // Deduplicate
  const seen = new Set<string>()
  leads = leads.filter(l => {
    const k = l.name?.toLowerCase().trim()
    if (!k || seen.has(k)) return false
    seen.add(k); return true
  }).slice(0, LIMIT)

  // Guess email from domain
  const guessEmail = (name: string, website: string) => {
    if (!website) return ''
    try {
      const domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '')
      return `info@${domain}`
    } catch { return '' }
  }

  // Write CSV
  const outDir   = path.join(process.cwd(), 'leads')
  fs.mkdirSync(outDir, { recursive: true })
  const date     = new Date().toISOString().slice(0, 10)
  const slug     = `${CITY}-${CATEGORY}-hyper-${productKey}`.toLowerCase().replace(/\s+/g, '-')
  const filename = `${date}-${slug}.csv`
  const outPath  = path.join(outDir, filename)

  const header = ['name', 'address', 'phone', 'website', 'email_guess', 'product', 'url', 'email_subject', 'email_body']
  const rows   = leads.map(l => {
    const email   = guessEmail(l.name, l.website)
    const subject = product.subject(l.name, CITY)
    const body    = product.body(l.name, CITY)
    return [l.name, l.address, l.phone, l.website, email, productKey, product.url, subject, body].map(csvEsc).join(',')
  })

  fs.writeFileSync(outPath, [header.join(','), ...rows].join('\n'), 'utf8')

  console.log(`\n📁 Saved: leads/${filename}`)
  console.log(`\n--- PREVIEW (first 3) ---`)
  leads.slice(0, 3).forEach(l => {
    console.log(`  ${l.name} | ${l.phone || 'no phone'} | ${l.website || 'no website'}`)
  })

  console.log(`\n📋 Next steps:`)
  console.log(`  1. Open leads/${filename}`)
  console.log(`  2. Filter rows with email_guess`)
  console.log(`  3. Send via Resend (free 100/day) or followUpSender.ts`)
}

main().catch(console.error)
