/**
 * import-csv.ts — Import a business-agent leads CSV into the global Neon `leads` table
 *
 * Usage (must pass .env.local via --env-file — no dotenv dep in this project):
 *   node --env-file=.env.local --import=tsx/esm scripts/import-csv.ts --csv ../business-agent/leads/<file>.csv
 *   # or add npm script: "import-csv": "node --env-file=.env.local --import=tsx/esm scripts/import-csv.ts"
 *
 * Dedupes against existing rows by email. Creates a fixed 'system'
 * user on first run since the leads table requires a userId FK and CLI scraping
 * has no session. All scraped leads across every project land in this one table —
 * that's the global lead DB outreach-crm, emailSender.ts, and followUpSender.ts all read from.
 */
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import { pgTable, text, timestamp, boolean, integer, serial, pgEnum } from 'drizzle-orm/pg-core'

// Inline schema (avoid @/* alias which tsx --import doesn't resolve)
const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'replied', 'interested', 'converted', 'unsubscribed', 'bounced'])
const users = pgTable('users', {
  id:    text('id').primaryKey(),
  name:  text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
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
const schema = { users, leads }

const SYSTEM_USER_ID = 'system'
const SYSTEM_USER_EMAIL = 'info.siva@gmail.com'

const args = process.argv.slice(2)
const get = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }

const CSV_PATH = get('--csv')
const PRODUCT_OVERRIDE = get('--product')
const CATEGORY_OVERRIDE = get('--category')
const CITY_OVERRIDE = get('--city')

if (!CSV_PATH) {
  console.error('Usage: npx tsx scripts/import-csv.ts --csv <path-to-csv> [--product X] [--category Y] [--city Z]')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set — run from outreach-crm/ with .env.local present')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const db = drizzle(sql, { schema: { users, leads } })

async function main() {
  const resolvedPath = path.resolve(CSV_PATH!)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`CSV not found: ${resolvedPath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8')
  const rows: Array<Record<string, string>> = parse(raw, { columns: true, skip_empty_lines: true })

  if (!rows.length) {
    console.log('CSV has no rows — nothing to import')
    return
  }

  await db.insert(schema.users).values({
    id: SYSTEM_USER_ID,
    email: SYSTEM_USER_EMAIL,
    name: 'System (CLI import)',
  }).onConflictDoNothing()

  const product = PRODUCT_OVERRIDE ?? rows[0].product ?? null
  const sourceName = path.basename(resolvedPath)

  let imported = 0
  let skipped = 0

  for (const r of rows) {
    const email = r.email_guess || r.email
    if (!email || !email.includes('@')) { skipped++; continue }

    const existing = await db.query.leads.findFirst({
      where: (l) => and(eq(l.email, email), eq(l.userId, SYSTEM_USER_ID)),
    })
    if (existing) { skipped++; continue }

    await db.insert(schema.leads).values({
      userId: SYSTEM_USER_ID,
      name: r.name || 'Unknown',
      email,
      company: r.name ?? null,
      city: CITY_OVERRIDE ?? r.city ?? null,
      category: CATEGORY_OVERRIDE ?? r.category ?? null,
      product: PRODUCT_OVERRIDE ?? r.product ?? product,
      website: r.website ?? null,
      phone: r.phone ?? null,
      source: sourceName,
    })
    imported++
  }

  console.log(`Imported ${imported} leads, skipped ${skipped} (no email or duplicate) from ${sourceName}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
