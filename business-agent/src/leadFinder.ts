/**
 * leadFinder.ts — Find local businesses via Google Maps Places API → CSV for outreach
 *
 * Free tier: $200/month credit → ~10,000 nearby searches free
 *
 * Usage:
 *   npx tsx src/leadFinder.ts --city "Manchester" --category "tutoring" --product tutiq --limit 60
 *   npx tsx src/leadFinder.ts --city "London" --category "restaurant" --product draftcal --limit 100
 *   npx tsx src/leadFinder.ts --city "Birmingham" --category "language school" --product speakiq --limit 50
 *   npx tsx src/leadFinder.ts --city "Leeds" --category "pub" --product kwizzo --limit 40
 *
 * Env vars:
 *   GOOGLE_MAPS_KEY — Google Maps Places API key (required)
 *
 * Output: leads/YYYY-MM-DD-{city}-{category}-{product}.csv
 */

import * as fs   from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as dotenv from 'dotenv'
import { FreeTierGuard, osmGeocode, osmFindBusinesses } from './freeTierGuard.js'

dotenv.config({ path: path.join(process.cwd(), '.env') })
dotenv.config({ path: path.join(process.cwd(), '../.env.shared') })

const guard = new FreeTierGuard()

// ── CLI args ──────────────────────────────────────────────────────────────────
const args  = process.argv.slice(2)
const get   = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i+1] : null }

const CITY     = get('--city')     ?? 'London'
const CATEGORY = get('--category') ?? 'tutoring'
const PRODUCT  = get('--product')  ?? 'tutiq'
const LIMIT    = parseInt(get('--limit') ?? '60', 10)
const API_KEY  = process.env.GOOGLE_MAPS_KEY ?? ''

// API_KEY absence is OK — will fall back to OSM (free, no key)
if (!API_KEY) {
  console.warn('\n⚠️  GOOGLE_MAPS_KEY not set — using OpenStreetMap fallback (100% free, no key needed)')
  console.warn('   To enable Google Maps: add GOOGLE_MAPS_KEY to agents/.env.shared\n')
}

// ── Product templates ─────────────────────────────────────────────────────────
const PRODUCTS: Record<string, {
  url: string
  subject: (biz: string, city: string) => string
  body: (biz: string, city: string) => string
}> = {
  tutiq: {
    url: 'tutiq.app',
    subject: (biz, city) => `Free AI tutor for your students in ${city}`,
    body: (biz, city) =>
`Hi,

Saw ${biz} in ${city} — thought this might be useful for your students.

Tutiq is a free AI tutor. It explains any subject step by step, adapts to the student's age, and gives practice questions. Students use it between sessions when you're unavailable.

No account needed. Free at tutiq.app.

Siva`,
  },

  draftcal: {
    url: 'draftcal.app',
    subject: (biz, city) => `30 days of social posts for ${biz} — written by AI`,
    body: (biz, city) =>
`Hi,

Running ${biz} in ${city} is busy — social media usually falls behind.

DraftCal generates a full month of Instagram/Facebook captions for your business in 60 seconds. You just copy and post.

Free at draftcal.app

Siva`,
  },

  kwizzo: {
    url: 'kwizzo.app',
    subject: (biz, city) => `Free quiz tool for events at ${biz}`,
    body: (biz, city) =>
`Hi,

If you run quiz nights or events at ${biz}, Kwizzo saves a lot of prep.

AI generates questions on any topic instantly. Runs on everyone's phone — no downloads, live leaderboard.

Free at kwizzo.app

Siva`,
  },

  quizbites: {
    url: 'quizbites.app',
    subject: (biz, city) => `Live quiz tool for ${biz} — free`,
    body: (biz, city) =>
`Hi,

QuizBites lets you run live quizzes with any group. Participants answer on their phones, you see a live leaderboard.

Works for classroom revision, training sessions, team events. No downloads needed.

Free at quizbites.app

Siva`,
  },

  roamplan: {
    url: 'roamplan.app',
    subject: (biz, city) => `AI itinerary tool for your ${city} clients`,
    body: (biz, city) =>
`Hi,

RoamPlan builds full day-by-day trip itineraries with AI — clients describe the trip, it handles the planning.

Useful to share with clients before they book. Saves consultation time.

Free at roamplan.app

Siva`,
  },

  speakiq: {
    url: 'speakiq.app',
    subject: (biz, city) => `AI conversation practice for your language students`,
    body: (biz, city) =>
`Hi,

SpeakIQ gives language learners a conversation partner to practice with between lessons — corrects grammar naturally, available any time.

Works for 20+ languages. Free to share with students.

Free at speakiq.app

Siva`,
  },

  bookingcall: {
    url: 'bookingcall.app',
    subject: (biz, city) => `Never miss a booking call at ${biz} again`,
    body: (biz, city) =>
`Hi,

Missed calls = missed bookings. BookingCall is an AI receptionist that answers calls 24/7, takes bookings, and sends confirmation texts — while you focus on the work.

No hardware. No monthly contract to start. Works for salons, clinics, and any appointment-based business.

Try it free at bookingcall.app

Siva`,
  },

  invoicemint: {
    url: 'invoicemint.cloud',
    subject: (biz, city) => `Send professional invoices in 30 seconds — free`,
    body: (biz, city) =>
`Hi,

If you're still copy-pasting invoice templates, InvoiceMint is worth trying.

Fill in the job, the amount, the client — AI formats a professional PDF invoice in 30 seconds. Download and send.

Free at invoicemint.cloud

Siva`,
  },

  agencyos: {
    url: 'agencyos.vercel.app',
    subject: (biz, city) => `One brief → blog + social + email done for ${biz}`,
    body: (biz, city) =>
`Hi,

Creating content for ${biz} is time-consuming. AgencyOS takes one brief and generates a blog post, social captions, and email draft all at once — in under 2 minutes.

Built for small businesses that don't have a marketing team.

Free to try at agencyos.vercel.app

Siva`,
  },
}

// ── Category → product suggestions ───────────────────────────────────────────
const CAT_PRODUCT: Record<string, string> = {
  tutoring:           'tutiq',
  tutor:              'tutiq',
  school:             'tutiq',
  'language school':  'speakiq',
  restaurant:         'draftcal',
  cafe:               'draftcal',
  coffee:             'draftcal',
  gym:                'draftcal',
  salon:              'bookingcall',
  hairdresser:        'bookingcall',
  barber:             'bookingcall',
  dentist:            'bookingcall',
  clinic:             'bookingcall',
  physio:             'bookingcall',
  pub:                'kwizzo',
  bar:                'kwizzo',
  'travel agent':     'roamplan',
  hotel:              'roamplan',
  guesthouse:         'roamplan',
  freelancer:         'invoicemint',
  electrician:        'invoicemint',
  plumber:            'invoicemint',
  builder:            'invoicemint',
  cleaner:            'invoicemint',
  accountant:         'agencyos',
  'marketing agency': 'agencyos',
  'estate agent':     'agencyos',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlaceResult {
  place_id:             string
  name:                 string
  formatted_address?:   string
  vicinity?:            string
  formatted_phone_number?: string
  website?:             string
  rating?:              number
  user_ratings_total?:  number
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Geocode city → lat/lng ────────────────────────────────────────────────────
async function geocodeCity(city: string): Promise<{ lat: number; lng: number }> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${API_KEY}`
  const res = await fetchJson<any>(url)
  if (res.status !== 'OK' || !res.results?.[0]) {
    throw new Error(`Geocode failed for "${city}": ${res.status}`)
  }
  return res.results[0].geometry.location
}

// ── Nearby search (returns up to 20 per call, use pagetoken for more) ─────────
async function nearbySearch(
  lat: number, lng: number,
  keyword: string,
  pageToken?: string,
): Promise<{ results: PlaceResult[]; next_page_token?: string }> {
  let url = pageToken
    ? `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pageToken}&key=${API_KEY}`
    : `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}&radius=20000&keyword=${encodeURIComponent(keyword)}` +
      `&type=establishment&key=${API_KEY}`

  return fetchJson<any>(url)
}

// ── Place details (gets phone + website) ──────────────────────────────────────
async function getPlaceDetails(placeId: string): Promise<PlaceResult> {
  const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`
  const res  = await fetchJson<any>(url)
  return res.result ?? {}
}

// ── Guess email from website domain ──────────────────────────────────────────
function guessEmail(name: string, website: string): string {
  if (website) {
    try {
      const domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname
        .replace(/^www\./, '')
      return `info@${domain}`
    } catch { /* fallthrough */ }
  }
  // Guess from business name — works for small local businesses
  // e.g. "Rush Hair Manchester" → info@rushhair.co.uk (not verified, needs Hunter check)
  if (name) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)       // first 2 words only
      .join('')
    if (slug.length >= 4) return `info@${slug}.co.uk`
  }
  return ''
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function csvEsc(s: string): string {
  s = String(s ?? '')
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const productKey = PRODUCTS[PRODUCT]
    ? PRODUCT
    : CAT_PRODUCT[CATEGORY.toLowerCase()] ?? 'draftcal'
  const product = PRODUCTS[productKey]

  console.log(`\n🔍 "${CATEGORY}" near ${CITY}`)
  console.log(`📦 Product: ${productKey} → ${product.url}`)
  console.log(`🎯 Target: ${LIMIT} leads\n`)

  // 1. Geocode + search — guard picks source automatically
  guard.printStatus()
  const source = (API_KEY && guard.getLeadSource() === 'google-maps') ? 'google-maps' : 'osm'
  let activeSource = source

  console.log(`📍 Geocoding ${CITY}...`)
  let lat: number, lng: number
  try {
    const coords = activeSource === 'google-maps'
      ? await geocodeCity(CITY)
      : await osmGeocode(CITY)
    lat = coords.lat; lng = coords.lng
  } catch (err: any) {
    if (activeSource === 'google-maps') {
      console.warn(`⚠️  Google Maps denied (APIs not yet enabled) — switching to OpenStreetMap`)
      console.warn(`   Fix: console.cloud.google.com/apis/library`)
      console.warn(`   Enable: "Geocoding API" and "Places API"\n`)
      activeSource = 'osm'
      const coords = await osmGeocode(CITY)
      lat = coords.lat; lng = coords.lng
    } else { throw err }
  }
  console.log(`   Source: ${activeSource === 'google-maps' ? 'Google Maps ✓' : 'OpenStreetMap (free fallback)'}`)
  console.log(`   → ${lat}, ${lng}`)

  // 2. Find businesses
  const leads: Array<{
    name: string; address: string; phone: string; website: string
    email: string; rating: number; reviews: number
  }> = []

  if (activeSource === 'google-maps') {
    // Google Maps: paged nearby search + place details
    const placeIds: string[] = []
    let pageToken: string | undefined

    for (let page = 0; page < 3 && placeIds.length < LIMIT; page++) {
      if (page > 0 && !pageToken) break
      if (page > 0) await sleep(2000)
      console.log(`\n📄 Searching page ${page + 1}...`)
      const res = await nearbySearch(lat, lng, CATEGORY, pageToken)
      if (res.results) {
        for (const r of res.results) {
          if (!placeIds.includes(r.place_id)) placeIds.push(r.place_id)
        }
        console.log(`   Found ${res.results.length} → total ${placeIds.length}`)
      }
      pageToken = res.next_page_token
    }

    const targetIds = placeIds.slice(0, LIMIT)
    console.log(`\n🔎 Fetching details for ${targetIds.length} places...`)

    for (let i = 0; i < targetIds.length; i++) {
      process.stdout.write(`   ${i + 1}/${targetIds.length} `)
      try {
        const detail  = await getPlaceDetails(targetIds[i])
        const website = detail.website ?? ''
        const email   = guessEmail(detail.name ?? '', website)
        leads.push({ name: detail.name ?? '', address: detail.formatted_address ?? '',
          phone: detail.formatted_phone_number ?? '', website, email,
          rating: detail.rating ?? 0, reviews: detail.user_ratings_total ?? 0 })
        process.stdout.write(`✓ ${detail.name}\n`)
        guard.trackGoogleMaps(2) // 1 nearby + 1 details = 2 requests
        await sleep(100)
      } catch { process.stdout.write(`✗ failed\n`) }
    }

  } else {
    // OSM fallback — 100% free, no key, no limit
    console.log(`\n🗺️  Searching OpenStreetMap (free, no limit)...`)
    await sleep(1000) // Nominatim 1 req/sec policy
    const results = await osmFindBusinesses(lat, lng, CATEGORY)
    console.log(`   Found ${results.length} businesses`)
    for (const r of results.slice(0, LIMIT)) {
      const email = guessEmail(r.name, r.website)
      leads.push({ ...r, email, rating: 0, reviews: 0 })
    }
  }

  // 4. Sort — businesses with website first (better chance of email)
  leads.sort((a, b) => {
    if (a.website && !b.website) return -1
    if (!a.website && b.website) return 1
    return b.reviews - a.reviews
  })

  // 5. Write CSV
  const outDir  = path.join(process.cwd(), 'leads')
  fs.mkdirSync(outDir, { recursive: true })

  const date     = new Date().toISOString().slice(0, 10)
  const slug     = `${CITY}-${CATEGORY}-${productKey}`.toLowerCase().replace(/\s+/g, '-')
  const filename = `${date}-${slug}.csv`
  const outPath  = path.join(outDir, filename)

  const header = [
    'name', 'address', 'phone', 'website', 'email_guess',
    'rating', 'reviews', 'product', 'url', 'email_subject', 'email_body',
  ]
  const rows = leads.map(l => [
    l.name, l.address, l.phone, l.website, l.email,
    l.rating, l.reviews, productKey, product.url,
    product.subject(l.name, CITY),
    product.body(l.name, CITY),
  ].map(csvEsc).join(','))

  fs.writeFileSync(outPath, [header.join(','), ...rows].join('\n'), 'utf8')

  // 6. Stats
  const withWebsite = leads.filter(l => l.website).length
  const withEmail   = leads.filter(l => l.email).length

  console.log(`\n✅ Done — ${leads.length} leads`)
  console.log(`   With website:  ${withWebsite}`)
  console.log(`   With email:    ${withEmail}`)
  console.log(`   Without email: ${leads.length - withEmail} (manual lookup needed)`)
  console.log(`\n📁 Saved: leads/${filename}`)

  // Preview
  console.log(`\n--- TOP 5 LEADS ---`)
  leads.slice(0, 5).forEach((l, i) => {
    console.log(`${i + 1}. ${l.name}`)
    console.log(`   📞 ${l.phone || 'no phone'} | ⭐ ${l.rating} (${l.reviews} reviews)`)
    console.log(`   🌐 ${l.website || 'no website'}`)
    console.log(`   📧 ${l.email || 'no email guess'}`)
    console.log()
  })

  console.log(`📋 Next steps:`)
  console.log(`   1. Open leads/${filename}`)
  console.log(`   2. Paste email_guess column into Hunter.io "Verify" (free — confirms real emails)`)
  console.log(`   3. Import into Instantly.ai or Mailchimp`)
  console.log(`   4. Send max 30/day from a warmed domain`)
  console.log(`   5. Tomorrow: different city, same product\n`)
}

main().catch(console.error)
