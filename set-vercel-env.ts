#!/usr/bin/env npx tsx
/**
 * set-vercel-env.ts
 *
 * Syncs shared env vars to Vercel projects across TWO accounts:
 *   - infosiva      (VERCEL_TOKEN)     — existing projects, bug fixes
 *   - sivaprakasam  (VERCEL_TOKEN_NEW) — all new projects go here
 *
 * !! WHEN ADDING A NEW VERCEL PROJECT !!
 *   - Add to SIVAPRAKASAM_PROJECTS array below
 *
 * Run:
 *   sync-vercel-env        → both accounts
 *   sync-vercel-env-new    → sivaprakasam account only
 *
 * Safe to re-run anytime — deletes old values before writing, no duplicates.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const TOKEN_INFOSIVA     = process.env.VERCEL_TOKEN
const TOKEN_SIVAPRAKASAM = process.env.VERCEL_TOKEN_NEW

if (!TOKEN_INFOSIVA && !TOKEN_SIVAPRAKASAM) {
  console.error('Set VERCEL_TOKEN (infosiva) and/or VERCEL_TOKEN_NEW (sivaprakasam) before running')
  process.exit(1)
}

// ── Account config ─────────────────────────────────────────────────────────────
const INFOSIVA_TEAM_ID     = 'team_2XHm064mWA86v38GDJ01Veli'
const SIVAPRAKASAM_TEAM_ID = 'team_o4yd8mPfnYYzbpPwlbdxNnWE'

// ── Shared keys synced to ALL projects on both accounts ───────────────────────
const SHARED_KEYS = [
  'GROQ_API_KEY', 'GROQ_API_KEY_1', 'GEMINI_API_KEY', 'CEREBRAS_API_KEY',
  'NVIDIA_API_KEY', 'KIMI_API_KEY', 'ANTHROPIC_API_KEY', 'EDGE_CONFIG', 'RESEND_API_KEY',
]

// ── Project-specific env vars ─────────────────────────────────────────────────
const PROJECT_SPECIFIC: Record<string, Record<string, string>> = {
  // ── infosiva ─────────────────────────────────────────────────────────────────
  'ai-resume-builder': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: 'price_1TYK4tQmuhMl0F31r1z4t16K',
    NEXT_PUBLIC_AUTH_API_URL: 'http://31.97.56.148:3110',
  },
  'social-media-calendar': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_DRAFTCAL ?? '',
  },
  'language-learning-bot': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_SPEAKIQ ?? '',
  },
  'kwizzo': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_KWIZZO ?? '',
  },
  'questly': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_QUIZBITES ?? '',
  },
  'ai-toolkit': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID_AI_TOOLKIT: process.env.STRIPE_PRICE_ID_AI_TOOLKIT ?? '',
  },
  'nudge': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_TUTIQ ?? '',
  },
  'ai-travel-planner': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_ROAMPLAN ?? '',
    NEXT_PUBLIC_AUTH_API_URL: 'http://31.97.56.148:3110',
  },
  'ai-investment-tracker': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_TRACKWEALTH ?? '',
  },
  'agenttrace': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_AGENTTRACE ?? '',
  },
  'tradespot':   { NEXT_PUBLIC_AUTH_API_URL: 'http://31.97.56.148:3110' },
  'health-tracker': { NEXT_PUBLIC_AUTH_API_URL: 'http://31.97.56.148:3110' },
  'hub': {
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD ?? 'siva2026',
    VERCEL_TOKEN: process.env.VERCEL_TOKEN ?? '',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? '',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? '',
    CRON_SECRET: process.env.CRON_SECRET ?? '',
  },
  // ── sivaprakasam ─────────────────────────────────────────────────────────────
  'zerostaff': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_ZEROSTAFF ?? '',
    NEXT_PUBLIC_AUTH_API_URL: 'http://31.97.56.148:3110',
  },
  'clipforge-ai': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_CLIPFORGE ?? '',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  },
  'aicoachlab': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_AICOACHLAB ?? '',
  },
  'mandirates': {
    NEXT_PUBLIC_AUTH_API_URL: 'http://31.97.56.148:3110',
  },
  // ── migrated to sivaprakasam 2026-05-23 ──────────────────────────────────────
  'neuralos': {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? '',
    NEXTAUTH_URL: 'https://neuralagent.app',
    DATABASE_URL: process.env.NEURALOS_DATABASE_URL ?? '',
  },
  'pixelforge': {
    FAL_KEY: process.env.FAL_KEY ?? '',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID_PIXELFORGE ?? '',
  },
  'invoicemint': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  },
  'protoforge': {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  },
  'rideflow': {},
  'weekendai': {},
  'meetscribe': {},
  'voicejournal': {},
  'pdfideas': {},
  'complybuddy': { NEXT_PUBLIC_AUTH_API_URL: 'http://31.97.56.148:3110' },
}

// ── Project lists ─────────────────────────────────────────────────────────────

// infosiva account — existing projects + bug fixes
const INFOSIVA_PROJECTS = [
  'nudge',                  // tutiq.app
  'kwizzo',                 // kwizzo.app
  'questly',                // quizbites.app
  'ai-resume-builder',      // resumevault.app
  'tradespot',              // anylocal.app
  'social-media-calendar',  // draftcal.app
  'ai-investment-tracker',  // trackwealth.app
  'ai-travel-planner',      // roamplan.app
  'language-learning-bot',  // speakiq.app
  'agenttrace',             // agentlogs.app
  'ai-social-content',
  'ai-resume-screener',
  'ai-voice-home',
  'yt-portal',
  'idea-agent',
  'ai-toolkit',             // aitoolkit.app
  'health-tracker',         // myvitals.app
  'hub',                    // ops dashboard
]

// sivaprakasam account — ALL new projects go here
const SIVAPRAKASAM_PROJECTS = [
  'zerostaff',              // zerostaff.app
  'clipforge-ai',           // clipforge.ai
  'aicoachlab',             // aicoachlab.app
  'mandirates',             // mandirates.app
  // ↓ migrated 2026-05-23
  'rideflow',               // rideflow.app
  'neuralos',               // neuralagent.app
  'protoforge',             // protofast.app
  'weekendai',              // weekendai.app
  'pixelforge',             // arcadeforge.app
  'meetscribe',             // meetscribe.app
  'voicejournal',           // voicejournal.app
  'pdfideas',               // pdfideas.app
  'complybuddy',            // complyscan.app
  'invoicemint',            // invoicemint.app
  'outreach-crm',           // outreachcrm — new 2026-05-29
]

// ── Environments ──────────────────────────────────────────────────────────────
const TARGETS: Array<'production' | 'preview' | 'development'> = ['production', 'preview', 'development']

// ── Vercel API helpers ────────────────────────────────────────────────────────
const BASE = 'https://api.vercel.com'

function makeHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function projectUrl(project: string, path: string, teamId?: string) {
  const q = teamId ? `?teamId=${teamId}` : ''
  return `${BASE}${path.replace('{project}', project)}${q}`
}

async function listEnvs(project: string, token: string, teamId?: string) {
  const url = projectUrl(project, '/v9/projects/{project}/env', teamId)
  const r = await fetch(url, { headers: makeHeaders(token) })
  if (!r.ok) {
    const e = await r.text()
    throw new Error(`listEnvs ${project}: ${r.status} ${e.slice(0, 200)}`)
  }
  const data: any = await r.json()
  return (data.envs ?? []) as Array<{ id: string; key: string; target: string[] }>
}

async function deleteEnv(project: string, envId: string, token: string, teamId?: string) {
  const url = projectUrl(project, `/v9/projects/{project}/env/${envId}`, teamId)
  const r = await fetch(url, { method: 'DELETE', headers: makeHeaders(token) })
  if (!r.ok) {
    const e = await r.text()
    console.warn(`  ⚠ delete ${envId}: ${r.status} ${e.slice(0, 100)}`)
  }
}

async function createEnv(project: string, key: string, value: string, token: string, teamId?: string) {
  const url = projectUrl(project, '/v10/projects/{project}/env', teamId)
  const r = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(token),
    body: JSON.stringify({ key, value, type: 'encrypted', target: TARGETS }),
  })
  if (!r.ok) {
    const e = await r.text()
    throw new Error(`createEnv ${project}/${key}: ${r.status} ${e.slice(0, 200)}`)
  }
}

// ── Load .env.shared ──────────────────────────────────────────────────────────
function loadSharedEnv(): Record<string, string> {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '.env.shared')
  if (!existsSync(envPath)) {
    console.error('.env.shared not found at', envPath)
    process.exit(1)
  }
  const vars: Record<string, string> = {}
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (SHARED_KEYS.includes(key) && val) vars[key] = val
  }
  return vars
}

const SHARED_VARS = loadSharedEnv()
console.log(`Loaded ${Object.keys(SHARED_VARS).length} shared vars from .env.shared`)

// ── Sync one project ──────────────────────────────────────────────────────────
async function syncProject(project: string, token: string, teamId?: string) {
  const account = teamId === SIVAPRAKASAM_TEAM_ID ? '[sivaprakasam]' : '[infosiva]'
  console.log(`\n▶ ${project} ${account}`)

  const existing = await listEnvs(project, token, teamId)

  for (const [key, value] of Object.entries(SHARED_VARS)) {
    for (const e of existing.filter(e => e.key === key)) {
      await deleteEnv(project, e.id, token, teamId)
    }
    await createEnv(project, key, value, token, teamId)
    console.log(`  ✓ ${key} (shared)`)
  }

  const specific = PROJECT_SPECIFIC[project] ?? {}
  for (const [key, value] of Object.entries(specific)) {
    if (!value) { console.log(`  ⊘ ${key} (empty — skipping)`); continue }
    for (const e of existing.filter(e => e.key === key)) {
      await deleteEnv(project, e.id, token, teamId)
    }
    await createEnv(project, key, value, token, teamId)
    console.log(`  ✓ ${key} (project-specific)`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const results: { project: string; ok: boolean; account: string; error?: string }[] = []

  // Sync infosiva account projects
  if (TOKEN_INFOSIVA) {
    console.log(`\n═══ infosiva (${INFOSIVA_TEAM_ID}) — ${INFOSIVA_PROJECTS.length} projects ═══`)
    for (const project of INFOSIVA_PROJECTS) {
      try {
        await syncProject(project, TOKEN_INFOSIVA, INFOSIVA_TEAM_ID)
        results.push({ project, ok: true, account: 'infosiva' })
      } catch (e: any) {
        console.error(`  ✗ ${e.message}`)
        results.push({ project, ok: false, account: 'infosiva', error: e.message })
      }
    }
  } else {
    console.log('\n⚠ VERCEL_TOKEN not set — skipping infosiva projects')
  }

  // Sync sivaprakasam account projects
  if (TOKEN_SIVAPRAKASAM) {
    console.log(`\n═══ sivaprakasam (${SIVAPRAKASAM_TEAM_ID}) — ${SIVAPRAKASAM_PROJECTS.length} projects ═══`)
    for (const project of SIVAPRAKASAM_PROJECTS) {
      try {
        await syncProject(project, TOKEN_SIVAPRAKASAM, SIVAPRAKASAM_TEAM_ID)
        results.push({ project, ok: true, account: 'sivaprakasam' })
      } catch (e: any) {
        console.error(`  ✗ ${e.message}`)
        results.push({ project, ok: false, account: 'sivaprakasam', error: e.message })
      }
    }
  } else {
    console.log('\n⚠ VERCEL_TOKEN_NEW not set — skipping sivaprakasam projects')
  }

  console.log('\n── Summary ───────────────────────────────────')
  for (const r of results) {
    const tag = r.account === 'sivaprakasam' ? '[sivaprakasam]' : '[infosiva]'
    console.log(r.ok ? `  ✅ ${tag} ${r.project}` : `  ❌ ${tag} ${r.project} — ${r.error}`)
  }

  const failed = results.filter(r => !r.ok)
  if (failed.length) process.exit(1)
}

main()
