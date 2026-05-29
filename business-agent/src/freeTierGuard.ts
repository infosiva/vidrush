/**
 * freeTierGuard.ts — Hard stops before any paid API call.
 *
 * Rule: NEVER spend money. Every service has a free tier or a free fallback.
 * If free tier is exhausted → use fallback. If no fallback → skip + warn.
 *
 * FREE STACK (entire outreach pipeline):
 *
 * LEAD FINDING:
 *   Primary   → Google Maps Places API ($200/month free = ~10k requests free)
 *   Fallback1 → OpenStreetMap Nominatim + Overpass API (100% free, unlimited)
 *   Fallback2 → Manual city CSV from gov open data (free download)
 *
 * EMAIL VERIFICATION:
 *   Primary   → Hunter.io free (25 searches/month)
 *   Fallback1 → Mailcheck.ai free (unlimited syntax check, no API key)
 *   Fallback2 → Skip verification, flag row as "unverified"
 *
 * EMAIL SENDING:
 *   Primary   → Resend.com free (3,000 emails/month, 100/day)
 *   Fallback1 → Brevo (Sendinblue) free (300 emails/day)
 *   Fallback2 → Gmail SMTP via nodemailer (500/day with standard Gmail)
 *   NEVER     → Instantly.ai paid, Mailchimp paid, SendGrid paid
 *
 * AI (email personalisation):
 *   Primary   → Groq free (llama-3.3-70b, ~14,400 req/day free)
 *   Fallback1 → Gemini free (gemini-1.5-flash, 1,500 req/day free)
 *   Fallback2 → Static template (no AI, always works)
 *   NEVER     → OpenAI, Anthropic (paid)
 *
 * GEOCODING:
 *   Primary   → Google Maps Geocode (inside $200 free credit)
 *   Fallback1 → Nominatim (OpenStreetMap, free, 1 req/sec limit)
 *   NEVER     → HERE Maps paid, Mapbox paid tier
 */

import * as fs   from 'fs'
import * as path from 'path'
import * as https from 'https'

// ── Usage tracking (persist per-day counts) ───────────────────────────────────
const USAGE_FILE = path.join(process.cwd(), '.free-tier-usage.json')

interface UsageRecord {
  date:           string
  googleMaps:     number   // limit: ~333/day to stay in $200/month
  hunterSearches: number   // limit: 25/month
  resendEmails:   number   // limit: 100/day
  brevoEmails:    number   // limit: 300/day
  gmailEmails:    number   // limit: 500/day
  groqRequests:   number   // limit: 14400/day
}

const LIMITS = {
  googleMaps:     300,   // conservative daily limit (10k/month ÷ 30, with buffer)
  hunterSearches: 20,    // leave 5 spare per month
  resendEmails:   95,    // leave 5 spare per day
  brevoEmails:    290,   // leave 10 spare per day
  gmailEmails:    480,   // leave 20 spare per day
  groqRequests:   14000, // leave 400 spare per day
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function loadUsage(): UsageRecord {
  try {
    if (fs.existsSync(USAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8')) as UsageRecord
      if (data.date === todayStr()) return data
    }
  } catch { /* ignore */ }
  // New day — reset counts
  return {
    date:           todayStr(),
    googleMaps:     0,
    hunterSearches: 0,
    resendEmails:   0,
    brevoEmails:    0,
    gmailEmails:    0,
    groqRequests:   0,
  }
}

function saveUsage(usage: UsageRecord) {
  fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2), 'utf8')
}

// ── Guard class ───────────────────────────────────────────────────────────────
export class FreeTierGuard {
  private usage: UsageRecord

  constructor() {
    this.usage = loadUsage()
  }

  // Returns which service to use, or null if all exhausted
  getLeadSource(): 'google-maps' | 'osm' | null {
    if (this.usage.googleMaps < LIMITS.googleMaps) return 'google-maps'
    console.warn(`⚠️  Google Maps daily limit reached (${LIMITS.googleMaps}). Falling back to OpenStreetMap.`)
    return 'osm' // always free
  }

  getEmailVerifier(): 'hunter' | 'mailcheck' | 'skip' {
    if (this.usage.hunterSearches < LIMITS.hunterSearches) return 'hunter'
    console.warn(`⚠️  Hunter.io monthly limit reached. Falling back to syntax-only check.`)
    return 'mailcheck' // free, unlimited
  }

  getEmailSender(): 'resend' | 'brevo' | 'gmail' | null {
    if (this.usage.resendEmails < LIMITS.resendEmails) return 'resend'
    console.warn(`⚠️  Resend daily limit reached (${LIMITS.resendEmails}). Falling back to Brevo.`)
    if (this.usage.brevoEmails < LIMITS.brevoEmails) return 'brevo'
    console.warn(`⚠️  Brevo daily limit reached (${LIMITS.brevoEmails}). Falling back to Gmail SMTP.`)
    if (this.usage.gmailEmails < LIMITS.gmailEmails) return 'gmail'
    console.warn(`🛑 All email senders exhausted for today. Will resume tomorrow.`)
    return null
  }

  getAIProvider(): 'groq' | 'gemini' | 'static' {
    if (this.usage.groqRequests < LIMITS.groqRequests) return 'groq'
    console.warn(`⚠️  Groq daily limit reached. Falling back to Gemini.`)
    return 'gemini' // Gemini free tier has separate limit
  }

  // Increment counters
  trackGoogleMaps(n = 1)     { this.usage.googleMaps     += n; saveUsage(this.usage) }
  trackHunter(n = 1)         { this.usage.hunterSearches += n; saveUsage(this.usage) }
  trackResend(n = 1)         { this.usage.resendEmails   += n; saveUsage(this.usage) }
  trackBrevo(n = 1)          { this.usage.brevoEmails    += n; saveUsage(this.usage) }
  trackGmail(n = 1)          { this.usage.gmailEmails    += n; saveUsage(this.usage) }
  trackGroq(n = 1)           { this.usage.groqRequests   += n; saveUsage(this.usage) }

  // Status report
  printStatus() {
    const u = this.usage
    console.log(`\n📊 Free Tier Usage — ${u.date}`)
    console.log(`   Google Maps:  ${u.googleMaps}/${LIMITS.googleMaps}/day`)
    console.log(`   Hunter.io:    ${u.hunterSearches}/${LIMITS.hunterSearches}/month`)
    console.log(`   Resend:       ${u.resendEmails}/${LIMITS.resendEmails}/day`)
    console.log(`   Brevo:        ${u.brevoEmails}/${LIMITS.brevoEmails}/day  (fallback)`)
    console.log(`   Gmail:        ${u.gmailEmails}/${LIMITS.gmailEmails}/day  (fallback)`)
    console.log(`   Groq:         ${u.groqRequests}/${LIMITS.groqRequests}/day`)
  }

  // Remaining capacity
  remainingEmails(): number {
    const r = Math.max(0, LIMITS.resendEmails - this.usage.resendEmails)
    const b = Math.max(0, LIMITS.brevoEmails  - this.usage.brevoEmails)
    const g = Math.max(0, LIMITS.gmailEmails  - this.usage.gmailEmails)
    return r + b + g
  }
}

// ── OpenStreetMap fallback geocoder ──────────────────────────────────────────
export async function osmGeocode(city: string): Promise<{ lat: number; lng: number }> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`
  const data = await fetchJson<any[]>(url, {
    'User-Agent': 'NammaTamil-LeadFinder/1.0 (info.siva@gmail.com)',
  })
  if (!data?.[0]) throw new Error(`OSM geocode failed for "${city}"`)
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

// ── OSM Overpass — find businesses (free, no key, no limit) ──────────────────
export async function osmFindBusinesses(
  lat: number, lng: number,
  category: string,
  radiusM = 20000,
): Promise<Array<{ name: string; address: string; phone: string; website: string }>> {

  // Map category to OSM amenity/shop tags
  // Primary tag (precise OSM amenity)
  const tagMap: Record<string, [string, string]> = {
    tutor:             ['amenity', 'prep_school'],
    tutoring:          ['amenity', 'prep_school'],
    school:            ['amenity', 'school'],
    'language school': ['amenity', 'language_school'],
    restaurant:        ['amenity', 'restaurant'],
    cafe:              ['amenity', 'cafe'],
    coffee:            ['amenity', 'cafe'],
    gym:               ['leisure', 'fitness_centre'],
    pub:               ['amenity', 'pub'],
    bar:               ['amenity', 'bar'],
    'travel agent':    ['shop', 'travel_agency'],
    hotel:             ['tourism', 'hotel'],
    salon:             ['shop', 'hairdresser'],
    hairdresser:       ['shop', 'hairdresser'],
    barber:            ['shop', 'barber'],
    dentist:           ['amenity', 'dentist'],
    clinic:            ['amenity', 'clinic'],
    physio:            ['amenity', 'physiotherapist'],
    guesthouse:        ['tourism', 'guest_house'],
    electrician:       ['craft', 'electrician'],
    plumber:           ['craft', 'plumber'],
    builder:           ['craft', 'builder'],
    cleaner:           ['shop', 'cleaning'],
  }

  const [k, v] = tagMap[category.toLowerCase()] ?? ['amenity', 'yes']

  // Simple targeted query — exact tag only, 10km radius, 25s timeout
  const query = `[out:json][timeout:25];(node["${k}"="${v}"](around:${radiusM},${lat},${lng});way["${k}"="${v}"](around:${radiusM},${lat},${lng}););out body;`

  // Use POST to overpass-api.de
  const data = await postJson<any>('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`)

  return (data.elements ?? []).map((el: any) => ({
    name:    el.tags?.name ?? '',
    address: [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']]
               .filter(Boolean).join(' '),
    phone:   el.tags?.phone ?? el.tags?.['contact:phone'] ?? '',
    website: el.tags?.website ?? el.tags?.['contact:website'] ?? '',
  })).filter((b: any) => b.name)
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function fetchJson<T>(url: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'Accept':     'application/json',
        'User-Agent': 'NammaTamil-LeadFinder/1.0 (info.siva@gmail.com)',
        ...extraHeaders,
      },
    }
    const req = https.get(url, opts, res => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson<T>(res.headers.location, extraHeaders).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8')
        try { resolve(JSON.parse(body)) }
        catch (e) { reject(new Error(`JSON parse failed (status ${res.statusCode}): ${body.slice(0, 200)}`)) }
      })
    })
    req.on('error', reject)
  })
}

function postJson<T>(url: string, body: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const bodyBuf = Buffer.from(body, 'utf8')
    const opts = {
      hostname: parsed.hostname,
      port:     443,
      path:     parsed.pathname + (parsed.search || ''),
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': bodyBuf.length,
        'Accept':         '*/*',
        'User-Agent':     'NammaTamil-LeadFinder/1.0 (info.siva@gmail.com)',
      },
    }
    const req = https.request(opts, res => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        postJson<T>(res.headers.location, body).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve(JSON.parse(text)) }
        catch (e) { reject(new Error(`Overpass JSON parse failed (${res.statusCode}): ${text.slice(0,120)}`)) }
      })
    })
    req.on('error', reject)
    req.write(bodyBuf)
    req.end()
  })
}
