/**
 * leadScraper.ts — Find local businesses by city + category, output CSV for outreach
 *
 * Sources (no API key needed):
 *   1. OpenStreetMap Overpass API (primary — structured JSON, never blocks)
 *   2. Yell.com / Yelp (legacy fallback — often blocked by JS rendering)
 *
 * Usage:
 *   npx tsx src/leadScraper.ts --city "Manchester" --category "salon" --product bookingcall --limit 50
 *   npx tsx src/leadScraper.ts --city "London" --category "restaurant" --product draftcal --limit 100
 *   npx tsx src/leadScraper.ts --city "Birmingham" --category "tutor" --product tutiq --limit 50
 *   npx tsx src/leadScraper.ts --city "London" --category "salon" --product bookingcall --source yell  # legacy
 *
 * Output: leads/YYYY-MM-DD-{city}-{category}-{product}.csv
 * Columns: name, address, phone, website, email_guess, product, email_subject, email_body
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import { execSync } from 'child_process'
import { load } from 'cheerio'

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const get  = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i+1] : null }

const CITY     = get('--city')     ?? 'London'
const CATEGORY = get('--category') ?? 'salon'
const PRODUCT  = get('--product')  ?? ''  // '' = auto-detect from category
const LIMIT    = parseInt(get('--limit') ?? '50', 10)
const COUNTRY  = get('--country')  ?? 'uk'
const SOURCE   = get('--source')   ?? 'osm'  // 'osm' (default) | 'yell' | 'yelp'

// ── Product → email template map ─────────────────────────────────────────────
const PRODUCTS: Record<string, {
  url: string
  subject: (biz: string, city: string) => string
  body: (biz: string, city: string) => string
}> = {
  tutiq: {
    url: 'tutiq.app',
    subject: (biz, city) => `Free AI tutor for your students in ${city}`,
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
    subject: (biz, city) => `Free quiz night tool for ${biz}`,
    body: (biz, city) => `Hi ${biz} team,

If you run quiz nights or events at ${biz}, this might save you a lot of prep time.

Kwizzo generates unlimited quiz questions on any topic instantly — no printing, no prep. Runs on everyone's phone, live leaderboard included.

Free at kwizzo.app

Best,
Siva`,
  },

  quizbites: {
    url: 'quizbites.app',
    subject: (biz, city) => `Run live classroom quizzes in ${city} — free`,
    body: (biz, city) => `Hi ${biz} team,

QuizBites lets you run live quizzes with any group — students answer on their phones, you see results in real time.

Works for classroom revision, training sessions, team events. No downloads for participants.

Free at quizbites.app

Best,
Siva`,
  },

  roamplan: {
    url: 'roamplan.app',
    subject: (biz, city) => `AI travel planning tool — free for your ${city} clients`,
    body: (biz, city) => `Hi ${biz} team,

RoamPlan builds full day-by-day trip itineraries with AI — clients describe where they want to go, it handles the planning.

Useful as a free tool to share with clients before they book. Builds trust and saves consultation time.

Free at roamplan.app

Best,
Siva`,
  },

  speakiq: {
    url: 'speakiq.app',
    subject: (biz, city) => `AI conversation partner for language learners in ${city}`,
    body: (biz, city) => `Hi ${biz} team,

SpeakIQ lets language learners practice real conversations with AI between lessons — it corrects grammar naturally without interrupting flow.

Works for 20+ languages. Useful to recommend to students for daily practice outside class.

Free at speakiq.app

Best,
Siva`,
  },

  bookingcall: {
    url: 'bookingcall.app',
    subject: (biz, city) => `Never miss a booking call at ${biz}`,
    body: (biz, city) => `Hi ${biz} team,

Every missed call is a missed booking. BookingCall is a free AI receptionist that answers calls 24/7, takes appointment details, and sends you a message instantly.

No hardware needed — works on your existing phone number. Takes 5 minutes to set up.

Free at bookingcall.app — no credit card needed.

Best,
Siva`,
  },

  aicoachlab: {
    url: 'aicoachlab.app',
    subject: (biz, city) => `Free AI coaching tool for your clients in ${city}`,
    body: (biz, city) => `Hi ${biz} team,

AICoachLab gives your clients an AI coach available 24/7 between sessions — answers questions, tracks goals, keeps momentum going.

Works as a free value-add you share with clients. They get daily support; you get clients who come back prepared.

Free at aicoachlab.app

Best,
Siva`,
  },

  invoicemint: {
    url: 'invoicemint.app',
    subject: (biz, _city) => `Free invoice generator for ${biz}`,
    body: (biz, _city) => `Hi ${biz} team, Invoicemint generates professional PDF invoices in seconds — no account, no subscription. Free at invoicemint.app`,
  },

  meetscribe: {
    url: 'meetscribe.app',
    subject: (biz, _city) => `Auto-transcribe your client calls at ${biz}`,
    body: (biz, _city) => `Hi ${biz} team, MeetScribe records and transcribes meetings automatically — searchable notes, action items extracted. Free at meetscribe.app`,
  },

  resumevault: {
    url: 'resumevault.app',
    subject: (_biz, city) => `AI CV builder for your candidates in ${city}`,
    body: (biz, _city) => `Hi ${biz} team, ResVault builds ATS-optimised CVs for candidates in minutes. Share with clients as a free tool. Free at resumevault.app`,
  },

  replydesk: {
    url: 'replydesk.app',
    subject: (biz, _city) => `AI support replies for ${biz} — instant, on-brand`,
    body: (biz, _city) => `Hi ${biz} team, ReplyDesk drafts customer support replies in your tone in under 3 seconds. Free at replydesk.app`,
  },

  anylocal: {
    url: 'anylocal.app',
    subject: (biz, city) => `Free local business listing for ${biz} in ${city}`,
    body: (biz, _city) => `Hi ${biz} team, AnyLocal connects local businesses directly with nearby customers — free listing, no commission. Free at anylocal.app`,
  },

  mandirates: {
    url: 'mandirates.app',
    subject: (biz, _city) => `Live commodity prices for ${biz} — mandi rates`,
    body: (biz, _city) => `Hi ${biz} team, MandiRates shows live wholesale vegetable and grain prices from Indian mandis — useful for menu costing. Free at mandirates.app`,
  },

  trackwealth: {
    url: 'trackwealth.app',
    subject: (biz, _city) => `Free portfolio tracker for your clients at ${biz}`,
    body: (biz, _city) => `Hi ${biz} team, TrackWealth lets clients track investments across accounts in one dashboard. Share as a free client tool. Free at trackwealth.app`,
  },

  rideflow: {
    url: 'rideflow.app',
    subject: (biz, _city) => `Route optimiser for ${biz} drivers — free`,
    body: (biz, _city) => `Hi ${biz} team, RideFlow optimises multi-stop routes for drivers automatically — saves fuel and time. Free at rideflow.app`,
  },

  vidrush: {
    url: 'vidrush.app',
    subject: (biz, _city) => `AI video scripts for ${biz} in 30 seconds`,
    body: (biz, _city) => `Hi ${biz} team, Vidrush generates short-form video scripts and hooks for any product — TikTok, Reels, YouTube Shorts. Free at vidrush.app`,
  },

  worldtrends: {
    url: 'worldtrends.today',
    subject: (biz, _city) => `Live trending topics dashboard for ${biz}`,
    body: (biz, _city) => `Hi ${biz} team, WorldTrends shows what's trending globally right now — useful for content planning and newsjacking. Free at worldtrends.today`,
  },

  pdfideas: {
    url: 'pdfideas.app',
    subject: (biz, _city) => `Turn your docs into interactive PDFs at ${biz}`,
    body: (biz, _city) => `Hi ${biz} team, PDFideas converts any document into a shareable interactive PDF with AI summaries. Free at pdfideas.app`,
  },
}

// ── Category → suggested product mapping ─────────────────────────────────────
const CATEGORY_PRODUCT_MAP: Record<string, string> = {
  tutor:       'tutiq',
  tutoring:    'tutiq',
  school:      'tutiq',
  'language school': 'speakiq',
  restaurant:  'draftcal',
  cafe:        'draftcal',
  coffee:      'draftcal',
  gym:         'draftcal',
  salon:       'bookingcall',
  hairdresser: 'bookingcall',
  dentist:     'bookingcall',
  physio:      'bookingcall',
  nail:        'bookingcall',
  pub:         'kwizzo',
  bar:         'kwizzo',
  'travel agent': 'roamplan',
  hotel:       'roamplan',
  freelancer:  'invoicemint',
  tradesman:   'invoicemint',
  accountant:  'invoicemint',
  agency:      'meetscribe',
  consultant:  'meetscribe',
  clinic:      'meetscribe',
  recruitment: 'resumevault',
  'career coach': 'resumevault',
  taxi:        'rideflow',
  courier:     'rideflow',
  logistics:   'rideflow',
  'financial advisor': 'trackwealth',
  'indian restaurant': 'mandirates',
}

// ── OSM tag map: category keyword → OSM shop/amenity tag ─────────────────────
const OSM_TAGS: Record<string, { key: string; value: string }[]> = {
  salon:        [{ key: 'shop',    value: 'hairdresser' }, { key: 'shop', value: 'beauty' }],
  hairdresser:  [{ key: 'shop',    value: 'hairdresser' }],
  beauty:       [{ key: 'shop',    value: 'beauty' }],
  nail:         [{ key: 'shop',    value: 'beauty' }],
  restaurant:   [{ key: 'amenity', value: 'restaurant' }],
  cafe:         [{ key: 'amenity', value: 'cafe' }],
  coffee:       [{ key: 'amenity', value: 'cafe' }],
  pub:          [{ key: 'amenity', value: 'pub' }],
  bar:          [{ key: 'amenity', value: 'bar' }],
  gym:          [{ key: 'leisure', value: 'fitness_centre' }],
  dentist:      [{ key: 'amenity', value: 'dentist' }],
  physio:       [{ key: 'amenity', value: 'physiotherapist' }],
  tutor:        [{ key: 'amenity', value: 'school' }, { key: 'amenity', value: 'language_school' }],
  tutoring:     [{ key: 'amenity', value: 'school' }],
  'language school': [{ key: 'amenity', value: 'language_school' }],
  'travel agent': [{ key: 'shop', value: 'travel_agency' }],
  hotel:        [{ key: 'tourism', value: 'hotel' }],
  coach:        [{ key: 'amenity', value: 'community_centre' }],
  taxi:         [{ key: 'amenity', value: 'taxi' }],
  courier:      [{ key: 'office',  value: 'logistics' }],
  clinic:       [{ key: 'amenity', value: 'clinic' }],
}

// City → bounding box [south, west, north, east]
const CITY_BBOX: Record<string, [number, number, number, number]> = {
  london:     [51.28, -0.51, 51.69,  0.33],
  manchester: [53.34, -2.40, 53.55, -1.97],
  birmingham: [52.38, -2.02, 52.58, -1.73],
  bristol:    [51.38, -2.72, 51.54, -2.49],
  leeds:      [53.72, -1.68, 53.87, -1.43],
  edinburgh:  [55.86, -3.35, 55.99, -3.05],
  glasgow:    [55.80, -4.36, 55.93, -4.12],
  liverpool:  [53.35, -3.01, 53.47, -2.82],
  sheffield:  [53.32, -1.57, 53.46, -1.34],
  nottingham: [52.89, -1.23, 53.01, -1.09],
}

// ── OSM Overpass scraper (primary — structured JSON, never blocks) ────────────
async function scrapeOSM(category: string, city: string, limit: number): Promise<Lead[]> {
  const cityKey = city.toLowerCase().replace(/\s+/g, '')
  const bbox    = CITY_BBOX[cityKey] ?? CITY_BBOX['london']
  const tags    = OSM_TAGS[category.toLowerCase()] ?? [{ key: 'shop', value: category.toLowerCase() }]

  const nodeQueries = tags.map(t =>
    `node["${t.key}"="${t.value}"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});`
  ).join('\n')

  const query = `[out:json][timeout:30];(\n${nodeQueries}\n);out body ${limit * 2};`

  console.log(`  OSM Overpass: ${tags.map(t => t.key + '=' + t.value).join(' OR ')} in ${city}`)

  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.openstreetmap.ru/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
  ]

  for (const endpoint of ENDPOINTS) {
    try {
      const tmpFile = `/tmp/osm-query-${Date.now()}.txt`
      fs.writeFileSync(tmpFile, 'data=' + encodeURIComponent(query))
      const result = execSync(
        `curl -s --max-time 25 -H "Content-Type: application/x-www-form-urlencoded" "${endpoint}" --data-binary @${tmpFile}`,
        { encoding: 'utf8' }
      )
      fs.unlinkSync(tmpFile)
      if (!result.startsWith('{')) { console.log(`  ${endpoint} rate-limited, trying next...`); continue }
      const data = JSON.parse(result)
      const elements: any[] = data.elements ?? []
      return elements
        .filter(e => e.tags?.name)
        .map(e => ({
          name:    e.tags.name,
          address: [e.tags['addr:housenumber'], e.tags['addr:street'], e.tags['addr:city']]
                     .filter(Boolean).join(', ') || city,
          phone:   e.tags.phone ?? e.tags['contact:phone'] ?? '',
          website: e.tags.website ?? e.tags['contact:website'] ?? '',
        }))
    } catch (err) {
      console.error(`  ${endpoint} error:`, (err as Error).message)
    }
  }
  console.error('  All OSM endpoints failed')
  return []
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    }
    https.get(url, opts, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHtml(res.headers.location).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function guessEmail(name: string, website: string): string {
  if (!website) return ''
  try {
    const domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname
      .replace(/^www\./, '')
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    return `info@${domain}`
  } catch { return '' }
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// ── Yell.com scraper (UK) ─────────────────────────────────────────────────────
interface Lead {
  name:    string
  address: string
  phone:   string
  website: string
}

async function scrapeYell(category: string, city: string, pages: number): Promise<Lead[]> {
  const leads: Lead[] = []
  const query = encodeURIComponent(category)
  const loc   = encodeURIComponent(city)

  for (let page = 1; page <= pages; page++) {
    const url = `https://www.yell.com/ucs/UcsSearchAction.do?keywords=${query}&location=${loc}&pageNum=${page}`
    console.log(`  Yell page ${page}: ${url}`)
    try {
      const html = await fetchHtml(url)
      const $    = load(html)

      $('article.businessCapsule').each((_, el) => {
        const name    = $(el).find('.businessCapsule--name').text().trim()
        const address = $(el).find('.businessCapsule--address').text().trim().replace(/\s+/g, ' ')
        const phone   = $(el).find('.businessCapsule--telephone').text().trim()
        const website = $(el).find('a.businessCapsule--website').attr('href') ?? ''
        if (name) leads.push({ name, address, phone, website })
      })

      // Also try newer Yell markup
      $('[data-testid="business-name"], .businessNameAndRating h2').each((_, el) => {
        const card    = $(el).closest('[data-testid="business-card"], .businessCapsule, article')
        const name    = $(el).text().trim()
        const address = card.find('[data-testid="address"], .businessCapsule--address').text().trim().replace(/\s+/g, ' ')
        const phone   = card.find('[data-testid="phone-number"], .businessCapsule--telephone').text().trim()
        const website = card.find('a[href*="http"]').filter((_, a) => !$(a).attr('href')?.includes('yell.com')).attr('href') ?? ''
        if (name && !leads.find(l => l.name === name)) leads.push({ name, address, phone, website })
      })

      await sleep(1500 + Math.random() * 1000) // polite delay
    } catch (err) {
      console.error(`  Yell page ${page} failed:`, err)
      break
    }
  }
  return leads
}

// ── Yelp scraper (US/international) ──────────────────────────────────────────
async function scrapeYelp(category: string, city: string, pages: number): Promise<Lead[]> {
  const leads: Lead[] = []
  const query = encodeURIComponent(category)
  const loc   = encodeURIComponent(city)

  for (let page = 0; page < pages; page++) {
    const offset = page * 10
    const url = `https://www.yelp.com/search?find_desc=${query}&find_loc=${loc}&start=${offset}`
    console.log(`  Yelp page ${page + 1}: ${url}`)
    try {
      const html = await fetchHtml(url)
      const $    = load(html)

      // Yelp biz cards
      $('[data-testid="serp-ia-card"], .businessName__09f24__WSMM, h3 a[href*="/biz/"]').each((_, el) => {
        const name    = $(el).text().trim()
        const href    = $(el).attr('href') ?? ''
        const address = $(el).closest('li, [data-testid]').find('address, p').first().text().trim()
        if (name && href.includes('/biz/')) {
          leads.push({ name, address, phone: '', website: `https://yelp.com${href}` })
        }
      })

      await sleep(2000 + Math.random() * 1000)
    } catch (err) {
      console.error(`  Yelp page ${page + 1} failed:`, err)
      break
    }
  }
  return leads
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Explicit --product flag wins; fall back to category map if not provided
  const productKey = PRODUCT && PRODUCT in PRODUCTS
    ? PRODUCT
    : CATEGORY_PRODUCT_MAP[CATEGORY.toLowerCase()] ?? 'draftcal'

  const product = PRODUCTS[productKey]
  const pages   = Math.ceil(LIMIT / 10)

  console.log(`\n🔍 Scraping: "${CATEGORY}" in ${CITY} [source: ${SOURCE.toUpperCase()}]`)
  console.log(`📦 Product: ${productKey} → ${product.url}`)
  if (SOURCE !== 'osm') console.log(`📄 Pages: ${pages} (~${pages * 10} results)\n`)

  let rawLeads: Lead[] = []

  if (SOURCE === 'osm') {
    rawLeads = await scrapeOSM(CATEGORY, CITY, LIMIT)
  } else if (COUNTRY === 'uk' || SOURCE === 'yell') {
    rawLeads = await scrapeYell(CATEGORY, CITY, pages)
  } else {
    rawLeads = await scrapeYelp(CATEGORY, CITY, pages)
  }

  // Deduplicate by name
  const seen  = new Set<string>()
  const leads = rawLeads.filter(l => {
    const key = l.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, LIMIT)

  console.log(`\n✅ ${leads.length} unique leads found`)

  // Build CSV
  const outDir = path.join(process.cwd(), 'leads')
  fs.mkdirSync(outDir, { recursive: true })

  const date     = new Date().toISOString().slice(0, 10)
  const filename = `${date}-${CITY.toLowerCase().replace(/\s+/g, '-')}-${CATEGORY.toLowerCase().replace(/\s+/g, '-')}-${productKey}.csv`
  const outPath  = path.join(outDir, filename)

  const header = ['name', 'address', 'phone', 'website', 'email_guess', 'product', 'url', 'email_subject', 'email_body']
  const rows   = leads.map(l => {
    const emailGuess = guessEmail(l.name, l.website)
    const subject    = product.subject(l.name, CITY)
    const body       = product.body(l.name, CITY)
    return [l.name, l.address, l.phone, l.website, emailGuess, productKey, product.url, subject, body]
      .map(csvEscape).join(',')
  })

  fs.writeFileSync(outPath, [header.join(','), ...rows].join('\n'), 'utf8')

  console.log(`\n📁 CSV saved: leads/${filename}`)
  console.log(`\n--- PREVIEW (first 3) ---`)
  leads.slice(0, 3).forEach(l => {
    console.log(`  ${l.name} | ${l.phone} | ${l.website || 'no website'}`)
    console.log(`  → ${product.subject(l.name, CITY)}`)
    console.log()
  })

  console.log(`\n📋 Next steps:`)
  console.log(`  1. Open leads/${filename} in Excel/Sheets`)
  console.log(`  2. Filter rows that have email_guess or website`)
  console.log(`  3. Import into Instantly.ai or Apollo.io`)
  console.log(`  4. Send 20-30/day max — don't blast all at once`)
}

main().catch(console.error)
