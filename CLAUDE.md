# agents/ — Project Standards

## MANDATORY: Load project-update-wave skill first

**Before ANY work in this directory:**

```
/project-update-wave
```

This skill is the single source of truth for ALL portfolio standards. It covers:
- §0  Research gate (competitor check before impl)
- §1  HANDOFF.md (write before first line of code)
- §2  UI design (Canvas → Open Design → Emil → Animate pipeline)
- §3  Chatbot (mobile bottom-sheet, llama-3.1-8b-instant, createChatRoute, useFingerprint, scope enforcement, attractive-taste gate)
- §4  Build gate (npm run build must pass)
- §5  Playwright screenshots (375px + 1280px before push)
- §6  Commit hygiene (specific files, info.siva@gmail.com)
- §7  Push sequence
- §8  Memory + HANDOFF update
- §9  Project map
- §10 Failure modes
- §11 Vercel env (OLLAMA_HOST never pushed)
- §12 Token minimisation (graphify, claude-mem, Canvas)
- §13 Feature flags (Edge Config, lib/flags.ts)
- §14 Security (.env never in git, rate limiting on every AI endpoint)
- §15 AI model cascade (Ollama → Groq → Gemini → Cerebras → Together → OpenRouter → Mistral → NVidia NIM → Kimi → DeepSeek → OpenAI → Anthropic)
- §16 Auth scope (gate actions not browsing, NextAuth v5, freemium pattern)
- §17 Tool iteration limits (prevent runaway agents)
- §18 Rich media embedding (image/video/animated demo on every page)
- §19 Project scope differentiation (research-driven niche depth, not generic templates)
- §20 Zero hardcoded data (no fake stats/testimonials/lists anywhere)
- §21 Smart AI model selection (task-aware, dynamic, free-tier first)
- §22 Feedback section (every project, DB-backed, no auth)
- §T  Live demo on landing (product IS the demo, real output, zero auth for core action)
- §U  All new Vercel projects → sivaprakasam account only (infosiva FROZEN)

**Do NOT skip this skill.** Every rule above is enforced by it.

## §V — DESIGN STANDARD: Mixed Theme by Category (HARD RULE — enforced 2026-06-15)

**Full spec: `DESIGN-STANDARD.md` in repo root. Read it before any UI work.**

### What's permanently banned (every project, every touch)
- `radial-gradient(ellipse...rgba(20,184,166` teal mesh blobs — DEAD PATTERN
- `#0a0a0f` / `#0a0a0b` / `#080712` dark bg for consumer apps
- Dot-grid `radial-gradient(rgba(255,255,255,0.038) 1px` overlays on dark bg
- Any two portfolio projects sharing same bg hex + accent hex
- Orange/amber + near-black combo

### Consumer / lifestyle → LIGHT theme
White or tinted bg (`#f8fafc`, `#f0f9ff`, `#fffbf5`), dark text (`#0f172a`), category accent.
No gradient blobs. Clean borders (`#e2e8f0`).

### Dev tools / AI infra → DARK theme (flat, no blobs)
Flat dark navy (`#0b1120`, `#0c0f1a`, `#0f0f23`). No radial blobs. No dot grid.

### Category → accent (quick ref)
| Category | Bg | Accent |
|---|---|---|
| Education/quiz | `#f0f9ff` sky-tint | `#0284c7` sky-blue |
| Health/wellness | `#f8fafc` white | `#0d9488` teal |
| Travel/local | `#f0fdf4` green-tint | `#059669` emerald |
| Finance/billing | `#f8fafc` white | `#059669` emerald |
| Productivity/SaaS | `#ffffff` white | `#2563eb` blue |
| Food/cultural | `#fffbf5` warm-white | `#ea580c` orange |
| News/trends | `#f9fafb` white | `#dc2626` red |
| Dev tools/agents | `#0b1120` dark navy | `#6366f1` indigo |
| AI infra/resume | `#0c0f1a` dark | `#7c3aed` violet |
| Gaming/creative | `#0f0f23` deep navy | `#f59e0b` amber |
| Media/video | `#0a0a0f` near-black | `#e879f9` fuchsia |

**Per-project assignments: `DESIGN-STANDARD.md` has the full table (33 projects).**

Auto-trigger: any landing page (`app/page.tsx`) touch OR new project → check DESIGN-STANDARD.md, verify bg+accent not reused.

## HARD RULES — permanent, fire on every session, every project, every push

### §U — ALL new Vercel projects go to sivaprakasam account (HARD RULE — NO EXCEPTIONS)

**infosiva account (`team_2XHm064mWA86v38GDJ01Veli`) is FROZEN — no new projects ever.**
**ALL new projects → sivaprakasam account (`team_o4yd8mPfnYYzbpPwlbdxNnWE`)**

Before ANY `vercel link` or `vercel deploy` for a new project:
```bash
vswitch sivaprakasam   # MANDATORY first step
vlink                  # links to sivaprakasam scope
```

Verify correct account before linking:
```bash
vercel whoami          # must show sivaprakasam, not infosiva
cat .vercel/project.json | grep orgId  # must be team_o4yd8mPfnYYzbpPwlbdxNnWE
```

**If orgId is `team_2XHm064mWA86v38GDJ01Veli` (infosiva) in any new project = stop, relink to sivaprakasam.**

Existing 29 infosiva projects stay there — do NOT migrate them. Only NEW projects enforce this rule.
Auto-trigger: any `vercel link`, `vercel deploy --yes`, or new project scaffold → run `vswitch sivaprakasam` first.

### §A — Vercel build green before EVERY push (no exceptions)
NEVER run `git push` without verifying the Vercel build will pass first.
Local build check is MANDATORY:
```bash
npm run build   # must exit 0 with zero TypeScript errors
```
Then Playwright smoke:
```bash
npx playwright screenshot --browser chromium --viewport-size 1280,800 http://localhost:PORT /tmp/PROJECT-desktop.png
npx playwright screenshot --browser chromium --viewport-size 375,812 http://localhost:PORT /tmp/PROJECT-mobile.png
```
Read both screenshots. If any layout broken, fix before push.
Agents that push without build check = incomplete work. Main session must verify Vercel deployment green after push.

### §B — Hub dashboard must reflect every project update
After ANY project change (redesign, new page, SEO fix, deploy, feature add):
- Update `hub` project at `/Users/sivaprakasam/projects/agents/hub/`
- Hub tracks: project name, URL, status (live/wip/needs-work), last_updated, health items
- Hub pulls from Edge Config `ecfg_s5cumfsw58v5mpe9ahpkb7axmigs` — projects registered there
- Hub must be CUSTOMISABLE without code redeploy — all project metadata in Edge Config
- After any wave of changes: run hub sync to update all statuses
- Command: `vercel env pull && npx ts-node hub/scripts/sync-projects.ts` (or equivalent)

### §C — Auto-reschedule on quota limit
If Claude Code hits rate/quota limit mid-session:
1. Write current state to HANDOFF.md ("Resume from here if interrupted")
2. Use `/schedule` to set wakeup: "resume HANDOFF.md portfolio wave"
3. Wakeup fires automatically — user does not need to re-trigger
This rule means long waves (10+ projects) never silently stall.

### §D — AdSense meta tag in ALL projects (every layout.tsx)
Every `app/layout.tsx` must have inside `<head>`:
```html
<meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX" />
```
Publisher ID placeholder until AdSense account approved. Wire real ID once approved.
Auto-trigger: any layout.tsx edit → check AdSense tag present. Missing = add it.

### §E — Testing pipeline before push (full sequence)
1. `npm run build` — zero errors
2. `npm run dev &` — start server
3. Playwright screenshots 375px + 1280px — read and verify visually
4. Check: no horizontal overflow mobile, hero visible above fold, CTA clickable, chatbot FAB visible
5. `git push` only after all 4 pass
6. After push: `vercel ls` or check Vercel dashboard — deployment must go green
7. If Vercel build fails: fix immediately, do NOT leave broken deploy

### §F — Every new project scaffold (mandatory checklist)
When creating ANY new project, these files must exist before first deploy:
```
app/layout.tsx        ← metadataBase, keyword title, OG png, JSON-LD, AdSense meta
app/sitemap.ts        ← all static routes listed
app/privacy/page.tsx  ← required for AdSense + GDPR
public/robots.txt     ← Allow: /, Sitemap: https://DOMAIN/sitemap.xml
public/og.png         ← 1200×630 (generate with sharp/SVG)
app/api/feedback/route.ts  ← §22 feedback endpoint
```
No project goes live without all 6. Verify with: `ls app/sitemap.ts app/privacy public/og.png public/robots.txt`

### §G — No push to main without PR review for shared infrastructure
Files that affect ALL projects (hub, shared-ui, ai-platform-template, set-vercel-env.ts, vswitch.sh):
NEVER push directly to main. Create a branch + PR, verify Vercel preview deploy works, then merge.
Single project files: direct push to main is fine after build passes.

### §H — Rate limiting on EVERY AI endpoint (no exceptions)
Every `app/api/` route that calls an LLM must have rate limiting:
```typescript
const { ok } = checkRateLimit(ip, 10)  // max 10 req/hr
if (!ok) return new Response('Rate limit', { status: 429 })
```
No AI endpoint ships without this. Unprotected endpoints = instant quota burn + potential abuse.

### §I — Environment variables: never hardcode, always validate at startup
Every project must fail LOUDLY (not silently) if required env vars are missing:
```typescript
if (!process.env.GROQ_API_KEY) console.warn('[ai] GROQ_API_KEY missing — AI features disabled')
```
Use optional chaining in cascade — missing key = skip provider, not crash.
NEVER: `const key = process.env.KEY || 'hardcoded-fallback'`

### §J — Chatbot scope enforcement (every project chatbot)
Every project chatbot MUST end its system prompt with:
```
If asked anything outside [TOPIC], respond: "I'm trained for [SITENAME]. For that, try Google or ChatGPT!"
```
Unconstrained chatbot = off-brand responses + prompt injection risk.

### §K — Performance: no unused AI providers in production
Remove any provider from cascade that has no API key set in Vercel env.
Dead providers add latency (timeout per provider = wasted seconds for users).
After setting env vars: test cascade with `curl /api/health` and verify which provider responds.

### §L — Responsive: every page must work at 375px with zero horizontal scroll
Before every push: `npx playwright screenshot --viewport-size 375,812` and visually verify.
Horizontal overflow on mobile = instant CRO killer. Fix before push, not after.

### §M — All internal links must resolve (no dead nav/footer links)
Before push, grep every `href="/..."` in layout/page/footer against actual routes in `app/`.
A footer/nav link to a page that doesn't exist = 404 on click = instant trust loss.
If a planned page isn't built yet, either build a minimal stub or remove the link — never ship a dead link.

### §N — Custom 404 page in every project
`app/not-found.tsx` must exist, branded (same nav/footer, on-brand copy), with a link back to `/`.
Default Next.js 404 = unstyled, looks broken, kills AdSense trust signal.

### §O — package-lock.json always committed alongside package.json
Every dependency add (`npm install`) must commit both `package.json` AND `package-lock.json` together.
Mismatched/missing lockfile = non-reproducible Vercel builds, "works locally, fails on Vercel" class of bugs.
This was the root cause of multiple build failures this session (rideflow, mandirates, kwizzo).

### §P — "Build green" must be independently re-verified by main session, never trusted from agent self-report
A subagent saying "build passed" is not sufficient. Main session must run `npm run build` itself
(or read the agent's actual build log output) before marking a project step `[x]` in HANDOFF.md.
Agent self-reports can be wrong, stale, or run against uncommitted state — verify against the committed tree.

### §Q — Background agents: assume failure on session restart, always re-check
If Claude Code restarts/compacts mid-wave, background agents tracked in HANDOFF.md may report
"failed" even if they made real file changes before dying. On resume: run `git status`/`git diff`
on their target files FIRST to recover any uncommitted work before re-dispatching — don't redo
work that's already on disk, and don't lose work that's on disk but uncommitted.

### §R — Promo code / trial discount system (MANDATORY — add to every project)

**Every project must ship a promo code system for marketing trials + discounted access.**
This is the primary acquisition lever — a code unlocks Pro/extended free tier without payment.

#### What to build (same pattern everywhere, copy from `lib/promoCode.ts` canonical)

```typescript
// lib/promoCode.ts (copy into every project)
// Promo codes unlock Pro features for N days without payment
// Codes live in PROMO_CODES env var (JSON array) or Edge Config — NEVER hardcoded in source
// Format: [{ "code": "LAUNCH50", "daysUnlocked": 30, "feature": "pro" }]

export type PromoEntry = { code: string; daysUnlocked: number; feature: string }

export function getPromoCodes(): PromoEntry[] {
  try {
    return JSON.parse(process.env.PROMO_CODES ?? '[]')
  } catch { return [] }
}

export function validatePromoCode(input: string): PromoEntry | null {
  const codes = getPromoCodes()
  return codes.find(c => c.code.toLowerCase() === input.trim().toLowerCase()) ?? null
}
```

#### API route (every project: `app/api/promo/route.ts`)
```typescript
import { validatePromoCode } from '@/lib/promoCode'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ valid: false }, { status: 400 })
  const entry = validatePromoCode(code)
  if (!entry) return NextResponse.json({ valid: false, message: 'Invalid code' })
  // Store in cookie (no auth required)
  const res = NextResponse.json({ valid: true, daysUnlocked: entry.daysUnlocked, feature: entry.feature })
  res.cookies.set('promo_unlocked', JSON.stringify({ ...entry, activatedAt: Date.now() }), {
    maxAge: entry.daysUnlocked * 86400, httpOnly: false, sameSite: 'lax', path: '/',
  })
  return res
}
```

#### Client hook (`hooks/usePromo.ts`)
```typescript
'use client'
import { useState, useEffect } from 'react'
export function usePromo() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [daysLeft, setDaysLeft] = useState(0)
  useEffect(() => {
    try {
      const raw = document.cookie.split(';').find(c => c.trim().startsWith('promo_unlocked='))
      if (!raw) return
      const data = JSON.parse(decodeURIComponent(raw.split('=')[1]))
      const elapsed = (Date.now() - data.activatedAt) / 86400000
      const remaining = data.daysUnlocked - elapsed
      if (remaining > 0) { setIsUnlocked(true); setDaysLeft(Math.ceil(remaining)) }
    } catch { /* ignore */ }
  }, [])
  return { isUnlocked, daysLeft }
}
```

#### UI placement (every project)
- **Landing page**: small "Have a promo code?" link under the primary CTA button
- **Gate/paywall modal**: "Enter promo code" input at bottom — unlocks instantly without page reload
- **Unlocked state**: show green banner "🎉 Pro access active — X days remaining" in nav or hero
- Use `usePromo()` hook to check gate — if `isUnlocked`, skip paywall and render Pro features directly

#### Env var setup (every project)
```
PROMO_CODES=[{"code":"LAUNCH50","daysUnlocked":30,"feature":"pro"},{"code":"BETA100","daysUnlocked":90,"feature":"pro"}]
```
Add to Vercel env via `set-vercel-env.ts`. Never hardcode codes in source. Rotate codes per campaign.

#### Marketing use cases
- Launch codes: `LAUNCH50` → 30 days free Pro (tweet/email campaign)
- Partner codes: `PARTNERNAME` → 60 days (affiliate/collab)
- Event codes: `CRICKET2026` → 14 days (tournament organizer community)
- Referral codes: unique per referrer, generate dynamically from PROMO_CODES env array

#### Auto-trigger rules
- Any new project scaffold → add `lib/promoCode.ts` + `app/api/promo/route.ts` + `hooks/usePromo.ts`
- Any paywall/gate implementation → wire `usePromo()` before building payment flow
- Any marketing push → rotate codes in PROMO_CODES env (no code deploy needed)
- `§F` new project checklist now includes: `lib/promoCode.ts` + `hooks/usePromo.ts` + `app/api/promo/route.ts`

### §S — Landing page identity: unique bg/accent/layout + sensible content + branded logo (MANDATORY — no exceptions)

**Violation = redo the work.** This is the #1 recurring failure across the portfolio (multiple sites converged on white/`#f8fafc` bg with no accent var, or generic split-hero with no real product demo).

#### 1. Background + accent — must be unique AND match category
- Before touching any landing page, grep `globals.css` of 3 other portfolio projects for `--background` / `--accent` hex values.
- Pick bg+accent that (a) no other project currently uses, AND (b) matches the category table in §2 of project-update-wave (fintech=navy+emerald, health=white+teal, productivity=white+blue, creative=light+violet, food/local=warm-white+orange, gaming=deep-navy+amber, education=sky+blue, travel=green-tint+green).
- `--accent` (and `--accent-2` if used) MUST be defined in `globals.css` — never leave a project on raw Tailwind defaults (`slate`/`gray`/`blue-600` with no CSS var). No-accent-var = instant fail.
- BANNED PERMANENTLY: `#0a0a0f`/`#0f0905`-style near-black bg + orange/amber/terracotta accent — this includes near-misses, not just exact hex matches.

#### 2. Layout — must differ from the last 3 projects touched
- Split `lg:grid-cols-2` hero is fine ONLY if the right panel demo type is different from the other projects using split layout.
- If 2+ projects share the same component file-naming AND same layout AND similar bg — that's a collision, redesign the newer one.
- Half-finished redesigns (mixed old+new bg classes in the same file, e.g. both `bg-white` and `bg-[#020c14]` in one hero) are NOT acceptable — finish or revert, never ship half-migrated.

#### 3. Sensible landing content — no generic SaaS filler
- Hero headline + subhead must reference the ACTUAL product/niche by name — never generic "Build faster with AI" boilerplate that could apply to any product.
- Right panel demo must show the REAL product UI for THIS project (its actual cards/data/flow) — not a stock illustration or a demo copy-pasted from another project.
- Stats row, steps row, social proof — must be product-specific and real (per §20 zero hardcoded data). Remove anything generic enough to paste into a competitor's site unchanged.

#### 4. Branded logo — navbar AND header, every project
- Every `NavBar.tsx` (or equivalent) MUST show a branded mark: emoji/icon + product name, with the product name's key word in the project's accent color (e.g. `Match<span style={{color:'var(--accent-2)'}}>ly</span>`).
- Use `app/icon.svg` or `app/icon.tsx` for the favicon — branded, not default Next.js icon. (Tracked separately in the portfolio favicon wave — verify present, don't skip on new projects.)
- Logo must be present and visible at both 375px and 1280px — check in the mandatory Playwright screenshot gate (§A/§L).
- No project ships with just a text wordmark in default foreground color — accent-colored key letter/word is mandatory.

#### 5. Clarity + no forced login — visitor must "get it" and try it instantly
- Hero H1 must say what/who/next in under ~8 words — visitor understands what the tool does and who it's for within 5-10 seconds, no scroll.
- One primary CTA above the fold. Never 3+ competing CTAs on the same screen.
- Core feature must work with ZERO auth — visitor completes one full real action (the actual thing the tool does) before any login prompt. Gate only save/export/history (per §16) — never gate the "try it" action itself.
- Max 1 scroll to see: headline, live demo, CTA, "how it works" steps. If a new visitor can't grasp + try the product within one viewport scroll, redesign.
- Trust signals (stats/quotes/logos) must be real or removed — never placeholder "1000+ users" / fake ratings / fake company logos (ties to §20, called out here because hero is the highest-visibility violation spot).

#### Auto-trigger
- Any landing page (`app/page.tsx`) touch → run all 5 checks above before commit.
- Any new project scaffold → bg/accent/layout/demo-panel decided via the differentiation check BEFORE `/design-shotgun`, not after.
- Portfolio audit (ongoing) tracks collisions found — see `PORTFOLIO-QUALITY-WAVE.md`.

### §T — Landing page: product IS the demo, zero auth for core action (HARD RULE)

**Violation = redo the work.** A landing page that shows a screenshot instead of running the product, or gates the first action behind a login, is broken by definition.

#### 1. The product activates on the landing page — no redirect, no signup wall
- The core tool action must execute ON `app/page.tsx` — not behind `/app`, `/dashboard`, or a login wall.
- Visitor's first action = product action. Not "watch a video", not "sign up to try".
- Pattern: **inline hero input → inline result, same page, no modal, no new tab**.
- If the tool requires async work (AI generation), show a loading state inline — result appears below input, not on a new route.

#### 2. Demo output must be real — never hardcoded fake responses
Four acceptable approaches (pick one per project):
1. **Pre-seeded real examples** — 3-5 real inputs+outputs the tool actually produced, rotate via typewriter animation.
2. **Live API call on load** — tool runs a fixed seed query on mount, displays real result. Visitor sees fresh output every visit.
3. **User-submitted gallery** — real outputs from real users shown in hero. Combined social proof + demo.
4. **Interactive live call** — visitor types own input, hits generate, gets real API response. Highest trust.

Never: hardcoded `const fakeResult = "Great job! Here's your plan..."` in the hero. If caught in code review = instant revert.

#### 3. Above-the-fold constraint — headline + demo + CTA in one viewport
- At 768px height: **headline (≤8 words) + live demo area + one primary CTA** must all be visible without scroll.
- If it doesn't fit: remove elements (trim stats row, collapse steps), never shrink font or increase scroll.
- Layout patterns by category:

| Category | Hero layout |
|---|---|
| Search/query tools | Full-width input bar center-screen |
| AI generators / converters | Split: input left / live output right |
| Canvas / editor tools | Full working canvas loads on page |
| AI agents / automation | Terminal/typewriter showing real output |
| Before/after tools | Card flip or side-by-side comparison |

#### 4. Gate only: save, export, history, bulk — never gate the core action
Per category, what is FREE (zero auth) vs GATED:

| Category | Free (zero auth) | Gate only |
|---|---|---|
| AI text generators | Generate 1 full result | Download, save, history |
| Quiz tools | Play full quiz, see score | Save score, leaderboard entry |
| Booking tools | See slots, fill enquiry form | Calendar confirmation / invite |
| Job portals | Search + view 10 listings | Apply / upload CV |
| Invoice tools | Generate + view/print 1 invoice | Download PDF, send by email |
| Travel planners | Generate full itinerary | Save, share, export |
| AI screeners | Upload + get 1 full analysis | Bulk upload, export report |
| Content tools | Generate 1 piece of content | Save to library, schedule |

#### 5. Entertainment without scroll — what converts vs what's noise
**Use:** Real rotating outputs (actual product results), live real usage counter (only if ≥500), typewriter showing real sample queries cycling, instant response to visitor's own input.
**Remove:** Fake stat badges ("10k users"), star ratings with no source, autoplay demo videos, pure decorative animations with no content, press logos not earned.

#### Auto-trigger
- Any `app/page.tsx` touch → verify §T compliance: is core action runnable without auth? Is demo output real? Does it fit one viewport?
- New project scaffold → decide "what is the free action" BEFORE writing any UI code. Document it in a comment at top of `app/page.tsx`.
- If the free action requires an API key: use the AI cascade (Groq free tier first) — never block the demo because of missing paid key.

## Quality-lift wave (next-week target) — see `PORTFOLIO-QUALITY-WAVE.md`
Per-project brief template, TaskFlow board spec, and review-agent spec for the
visuals/differentiation/no-hardcode/chatbot/feedback initiative. Plan-only —
execution not yet dispatched.

## Projects in this directory

| Dir | URL | Repo |
|-----|-----|------|
| agenttrace/apps/dashboard | agentlogs.app | infosiva/agenttrace |
| speakiq | speakiq.app | infosiva/speakiq |
| resumevault | resumevault.app | infosiva/resumevault |
| draftcal | draftcal.app | infosiva/draftcal |
| trackwealth | trackwealth.app | infosiva/trackwealth |
| roamplan | roamplan.app | infosiva/roamplan |
| worldtrends | worldtrends.today | infosiva/worldtrends |
| kwizzo | kwizzo.app | infosiva/kwizzo |
| myvitals | myvitals.app | infosiva/myvitals |
| aicoachlab | aicoachlab.app | infosiva/aicoachlab |
| neuralos | neuralagent.app | infosivas-projects/neuralos |
| pixelforge | arcadeforge.app | infosiva/pixelforge |

## MANDATORY: Secret Prevention Rules — NO EXCEPTIONS

**These rules are permanent. Violations = secrets in public git history. That already happened once.**

### Never commit these file types
```
.env / .env.* / *.env
client_secrets.json
credentials.json
service_account*.json
token_*.pickle / *.pickle
*.pem / *.p12 / *.pfx
*_key.json
```

### Never hardcode secrets as fallback defaults
```typescript
// BANNED — token exposed if file is committed
const TOKEN = process.env.API_KEY || 'sk-real-value-here';

// REQUIRED — fail loudly, never silently use hardcoded value
const TOKEN = process.env.API_KEY || '';
```

### Before every `git add` — mental checklist
1. Does any staged file contain an API key, token, password, or OAuth secret?
2. Does any staged file match the blocked patterns above?
3. Does any new `const X = process.env.Y || 'hardcoded'` exist?

If yes to ANY → do not commit. Fix first.

### Pre-commit hook is active at `.git/hooks/pre-commit`
It scans filenames AND diff content for: `gho_`, `ghp_`, `GOCSPX-`, `sk-ant-`, `gsk_`, `vcp_` patterns.
If hook fires → stop, fix, re-stage.

### History purge (when a secret leaks anyway)
```bash
# Remove file from ALL history + force push
git filter-repo --path path/to/secret.json --invert-paths
git push --force-with-lease origin main
# Then rotate the exposed credential immediately
```

### CLAUDE.md and AGENTS.md must never contain real tokens
Document token FORMAT only (e.g. `gho_...36chars`), never actual values.

## Git identity (always)
```bash
git config user.email "info.siva@gmail.com"
git config user.name "Siva"
```

---

## HARD RULES ADDED 2026-06-16 (permanent — fire every session, every project, no exceptions)

### §W — Playwright Live-Site QA (MANDATORY, re-triggerable anytime)

Every project must pass 10 browser checks against the live URL before any task is marked complete.

**10 checks (P1-P10):**
1. P1 — Landing loads, HTTP 200, H1 visible, no console errors
2. P2 — All navbar links resolve (no 404)
3. P3 — All footer links resolve (no 404)
4. P4 — Core action runs zero auth — real output, not "Sign in to continue"
5. P5 — Chatbot FAB visible, sends "hello", real response within 10s
6. P6 — Feedback form submits, returns 200
7. P7 — Mobile 375px: no horizontal scroll, hero above fold, CTA clickable
8. P8 — Desktop 1280px: layout intact, demo panel visible
9. P9 — Auth gate check: `/dashboard` or `/app` without login redirects (doesn't crash)
10. P10 — Page load < 5s (no runaway JS bundle)

**Every P1-P10 result logs to TaskFlow "Portfolio QA Audit" board via `qa-insert-task.mjs`.**

**Trigger anytime:**
```bash
# From taskflow/ dir:
node --env-file=.env.local scripts/run-playwright-qa.mjs --project kwizzo
node --env-file=.env.local scripts/run-playwright-qa.mjs --all
```

This is a permanent protocol. Every site update → run it. Results appear in TaskFlow in real-time.

### §X — Token Limits (mandatory in every project, every AI call)

```typescript
// lib/tokenLimit.ts — copy into every project
const LIMITS = {
  free: { maxInputTokens: 800, maxOutputTokens: 400 },
  pro:  { maxInputTokens: 4000, maxOutputTokens: 2000 },
}
export function getTokenLimit(plan: 'free' | 'pro') { return LIMITS[plan] }
```

Rules:
- Every LLM call passes `max_tokens` from getTokenLimit — never omit it
- Chatbot: cap history at last 6 messages max
- Free tier: trim user input to 800 tokens before sending
- Checklist: `rate_limit` check also verifies `max_tokens` present in AI route

### §Y — Chatbot Never Breaks (MANDATORY — never leave chatbot dead)

**Chatbot must have a multi-tier fallback. Never one model, never one provider.**

```typescript
// Fallback order (copy into every chatbot route):
// 1. Groq llama-3.3-70b (free, fast, primary)
// 2. Groq llama-3.1-8b-instant (free, faster, fallback)
// 3. Gemini 2.0-flash (free tier, backup)
// 4. Cerebras llama3.1-70b (free tier, backup)
// 5. Together.ai deepseek-r1 (cheap, last resort)
// If ALL fail → return graceful error: "Chat is resting — try again in a moment."
// NEVER return a 500 or blank screen to the user.
```

Model selection must be dynamic — read from Edge Config or env var, not hardcoded. Hub dashboard controls which model each project uses (see §Z).

Free tier = unlimited chatbot usage. No auth gate on chatbot. No token-count paywall on chatbot.
Rate limit chatbot at 60 req/hr per IP (not 10 — chatbot is conversational, needs headroom).

### §Z — Hub Dashboard Controls Everything (MANDATORY, no code changes for config)

**Hub (`https://ai-products-hub.vercel.app`) is the single control panel for ALL 49 projects.**

What must be configurable from Hub without code deploy:
- Chatbot model per project (stored in Edge Config `ecfg_s5cumfsw58v5mpe9ahpkb7axmiges`)
- Rate limits per project (req/hr, max_tokens)
- Feature flags per project (chatbot on/off, feedback on/off, promo active)
- Promo codes per project (active/expired toggle)
- Project status (live/maintenance/wip)
- Health check last-run timestamp + result

**Rule: NO project-specific config lives in code or env vars if Hub can own it.**
If you're about to hardcode a limit or toggle in a project file → stop, put it in Edge Config instead.

Hub dashboard redesign is required (current is too cluttered) — see open task in TaskFlow.

### §Z2 — Drag-to-In-Progress Triggers Agent (TaskFlow automation)

When a task in the "Portfolio QA Audit" board is dragged from "Needs Fix" → "In Progress":
- TaskFlow fires a webhook to the agent endpoint
- Agent reads task notes (exact failures + fix steps)
- Agent executes fixes on the project (rate limit, feedback widget, chatbot, etc.)
- Agent logs progress back to TaskFlow task as comments in real-time
- On completion: agent moves task to "Passed" group automatically

**Implementation needed:** `app/api/webhooks/board-move/route.ts` in taskflow + dispatcher agent.

### §Z3 — No Purple Background (BANNED permanently, added 2026-06-16)

Purple (`#7c3aed`, `#8b5cf6`, `#9333ea`, `#6d28d9`, `fdf4ff`, `faf5ff`) is BANNED as a background color.
Purple accent on dark bg is fine. Purple AS the page background = banned.

Affected projects needing fix:
- `pdfideas` — bg=`#fdf4ff` (purple-tint) → change to `#f8fafc` white, keep `#9333ea` accent
- `quizbytesdaily` — bg=`#faf5ff` (purple-tint) → change to `#f0f9ff` sky-tint, accent `#7c3aed` ok

### §Z3b — Vercel Account Assignment (permanent — no exceptions, no grey area)

**Which projects go where — hardcoded forever:**

| Account | orgId | Rule |
|---|---|---|
| `infosiva` | `team_2XHm064mWA86v38GDJ01Veli` | FROZEN — existing 29 projects ONLY, never new |
| `sivaprakasam` | `team_o4yd8mPfnYYzbpPwlbdxNnWE` | ALL new projects from 2026-05-01 onward |

**infosiva projects (do NOT migrate, do NOT re-deploy to other account):**
kwizzo, tutiq, quizbites, speakiq, trackwealth, invoicemint, roamplan, flighttracker, billslash, resumevault, aijobsportal, draftcal, aicoachlab, ai-social-content, agenttrace, neuralos, protoforge, idea-agent, aitoolkit, pixelforge, clipforge-ai, yt-portal, ai-resume-screener, clawdbotai, myvitals, worldtrends, mandirates, bookingcall, firstline (29 total)

**sivaprakasam projects (new, all future):**
zerostaff, outreach-crm, aicoachlab (new), hub, taskflow, pdfideas, quizbytesdaily, meetscribe, voicejournal, weekendai, parceliq, homecanvas, vidrush, campaignforge, rideflow, agencyos, anylocal, quicktech, replydesk, nammatamil, photorestore, ai-toolkit, ai-jobs-portal, billslash-v2, playsmart + all future projects

**Before ANY vercel deploy:**
```bash
# Check which account the project is linked to:
cat .vercel/project.json | grep orgId
# infosiva = team_2XHm064mWA86v38GDJ01Veli → only ok for 29 listed
# sivaprakasam = team_o4yd8mPfnYYzbpPwlbdxNnWE → all new
# Wrong account = stop, relink with vlink
```

### §Z4 — Standard Protocol for Every Site Update (permanent)

**No code change merges without running this sequence:**
1. `npm run build` — exit 0, zero TS errors
2. `npm run dev &` — start local
3. Playwright screenshots 375px + 1280px — read both visually
4. `git push` → wait for Vercel green
5. `node --env-file=.env.local scripts/run-playwright-qa.mjs --project <name>` on live URL
6. All P1-P10 pass → move TaskFlow task to "Passed"
7. If any P1-P10 fail → fix immediately, repeat from step 1

This sequence is non-negotiable. "I'll check later" = violation.
