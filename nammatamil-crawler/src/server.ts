/**
 * nammatamil-crawler API server
 * Runs on VPS port 3096 via PM2
 * Serves crawled movie data to nammatamil.live (Vercel) at build time
 */

import express from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { crawl } from './crawler-export'
dotenv.config()

const app = express()
const PORT = parseInt(process.env.PORT ?? '3096', 10)
const DATA_FILE = path.join(__dirname, '..', 'data', 'movies.json')

app.use(cors({ origin: ['https://nammatamil.live', 'http://localhost:3000'] }))
app.use(express.json())

// ── Helper: load data file ────────────────────────────────────────────
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return null
  }
}

// ── GET /api/movies — all crawled movies, sorted by relevance ─────────
app.get('/api/movies', (req, res) => {
  const data = loadData()
  if (!data) return res.status(503).json({ error: 'Data not yet crawled. Run crawler first.' })

  let { platform, genre, q, limit } = req.query as Record<string, string>
  let movies = data.movies

  if (platform && platform !== 'All') {
    movies = movies.filter((m: any) => m.streamingOn?.includes(platform))
  }
  if (genre && genre !== 'All') {
    movies = movies.filter((m: any) =>
      m.genre?.some((g: string) => g.toLowerCase().includes(genre.toLowerCase()))
    )
  }
  if (q) {
    const query = q.toLowerCase()
    movies = movies.filter((m: any) =>
      m.title?.toLowerCase().includes(query) ||
      m.director?.toLowerCase().includes(query) ||
      m.cast?.some((c: string) => c.toLowerCase().includes(query)) ||
      m.genre?.some((g: string) => g.toLowerCase().includes(query)) ||
      m.vibeTag?.toLowerCase().includes(query)
    )
  }
  if (limit) movies = movies.slice(0, parseInt(limit, 10))

  res.json({
    generatedAt: data.generatedAt,
    count: movies.length,
    movies,
  })
})

// ── GET /api/movies/ott — only movies with OTT info ───────────────────
app.get('/api/movies/ott', (_req, res) => {
  const data = loadData()
  if (!data) return res.status(503).json({ error: 'No data' })
  const ott = data.movies.filter((m: any) => m.ottDate)
  res.json({ count: ott.length, movies: ott })
})

// ── GET /api/movies/coming-soon ───────────────────────────────────────
app.get('/api/movies/coming-soon', (_req, res) => {
  const data = loadData()
  if (!data) return res.status(503).json({ error: 'No data' })
  const soon = data.movies.filter((m: any) => m.ottDate === 'Coming Soon')
  res.json({ count: soon.length, movies: soon })
})

// ── GET /api/status — health check + stats ────────────────────────────
app.get('/api/status', (_req, res) => {
  const data = loadData()
  res.json({
    ok: true,
    dataExists: !!data,
    movieCount: data?.count ?? 0,
    generatedAt: data?.generatedAt ?? null,
    uptime: process.uptime(),
  })
})

// ── Visitor counter ───────────────────────────────────────────────────
const VISITOR_FILE = path.join(__dirname, '..', 'data', 'visitors.json')
const ONLINE_WINDOW = 5 * 60 * 1000
const SESSION_WINDOW = 30 * 60 * 1000 // 30min — new session = new unique visit

// session_id → last seen timestamp (in-memory, resets on restart)
const sessionMap = new Map<string, number>()

function loadVisitors(): { total: number } {
  try { return JSON.parse(fs.readFileSync(VISITOR_FILE, 'utf-8')) } catch { return { total: 0 } }
}
function saveVisitors(v: { total: number }) {
  try { fs.writeFileSync(VISITOR_FILE, JSON.stringify(v)) } catch { /**/ }
}
function onlineNow(): number {
  const cutoff = Date.now() - ONLINE_WINDOW
  let count = 0
  for (const ts of sessionMap.values()) { if (ts > cutoff) count++ }
  return Math.max(1, count)
}

// POST /api/visitors/hit — session-deduped unique visit counter
app.post('/api/visitors/hit', (req, res) => {
  const sid: string | undefined = req.body?.session_id
  const now = Date.now()
  const v = loadVisitors()

  if (sid) {
    const last = sessionMap.get(sid)
    // Count as new unique visit if: brand new session, or returning after 30min
    if (!last || now - last > SESSION_WINDOW) {
      v.total += 1
      saveVisitors(v)
    }
    sessionMap.set(sid, now)
  } else {
    // No session_id — still count (legacy clients), update total
    v.total += 1
    saveVisitors(v)
  }

  res.json({ count: v.total, online: onlineNow() })
})

// Keep GET for backward compat (read-only, no increment)
app.get('/api/visitors', (_req, res) => {
  res.json({ count: loadVisitors().total, online: onlineNow() })
})

// ── POST /api/crawl — manually trigger a crawl run ───────────────────
// Protected by a simple secret header
app.post('/api/crawl', async (req, res) => {
  const secret = process.env.CRAWL_SECRET ?? 'nammatamil-secret'
  if (req.headers['x-crawl-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  res.json({ ok: true, message: 'Crawl started in background' })
  // Run crawl async so response returns immediately
  crawl().catch(err => console.error('[Crawl] Error:', err))
})

// ── Startup ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎬 nammatamil-crawler API running on port ${PORT}`)
  console.log(`   GET  /api/movies        — all movies`)
  console.log(`   GET  /api/movies/ott    — OTT releases`)
  console.log(`   GET  /api/movies/coming-soon`)
  console.log(`   GET  /api/status        — health check`)
  console.log(`   POST /api/crawl         — trigger manual crawl`)

  const data = loadData()
  if (data) {
    console.log(`\n📦 Loaded ${data.count} movies from ${DATA_FILE}`)
    console.log(`   Last crawled: ${data.generatedAt}`)
  } else {
    console.log('\n⚠️  No data file yet. Run: npm run crawl')
  }
})
