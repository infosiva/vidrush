# Portfolio QA Wave — Full Spec
**Date:** 2026-06-16  **Status:** READY FOR EXECUTION

## Goal
Audit all 49 portfolio projects against the expanded checklist. Push one TaskFlow task per project with exact findings + fixes needed. You (Siva) then prioritise which projects get immediate fixes.

---

## Checklist — 30 Points (20 automated + 10 new hard rules)

### Automated (from checklist-agent.ts) — 20 points

| # | ID | What it checks | Fix if fail |
|---|---|---|---|
| 1 | `sitemap` | `app/sitemap.ts` exists | Create sitemap listing all routes |
| 2 | `robots` | `public/robots.txt` exists | Create with `Allow: /`, point to sitemap |
| 3 | `og_png` | `public/og.png` exists (1200×630) | Generate with `/image-gen` or sharp |
| 4 | `metadataBase` | `layout.tsx` has `metadataBase` set to prod HTTPS domain | Add `metadataBase: new URL('https://domain.app')` |
| 5 | `json_ld` | JSON-LD structured data in layout (WebSite schema min) | Add `<script type="application/ld+json">` |
| 6 | `no_fake_stats` | No fabricated numbers ("10,000 users", "4.9/5") in page.tsx | Remove/replace with real data or feature pills |
| 7 | `chatbot` | `FloatingChatWrapper` or `ChatWidget` component present | Add chatbot (Groq llama-3.1-8b-instant, bottom-right FAB) |
| 8 | `feedback` | `FeedbackWidget` component present | Add FeedbackWidget (DB-backed, no auth) |
| 9 | `rate_limit` | `checkRateLimit` or `rateLimit` in AI routes | Add rate limit (10 req/hr per IP) to every `/api/` AI route |
| 10 | `no_hardcoded_keys` | No `process.env.KEY \|\| 'sk-...'` patterns | Remove hardcoded fallback values — fail loudly, not silently |
| 11 | `no_env_committed` | `.env` not tracked by git | Remove from git, add to `.gitignore` |
| 12 | `package_json` | `package.json` exists | Scaffold missing (shouldn't happen) |
| 13 | `app_router` | Next.js App Router (`app/` dir) present | N/A — legacy projects need migration |
| 14 | `app_layout` | `app/layout.tsx` exists | Create with metadataBase + JSON-LD |
| 15 | `no_fake_press` | No CNN/Forbes/Guardian/WIRED/TechCrunch logos unless earned | Remove fake press section |
| 16 | `no_landing_auth_wall` | Landing page doesn't redirect to `/login` | Move auth check inside app routes only |
| 17 | `ai_fallback` | Groq cascade or `lib/ai.ts` present | Wire AI cascade (Ollama→Groq→Gemini→Cerebras) |
| 18 | `keyword_title` | `layout.tsx` has keyword-rich `title:` | Pattern: `"Brand — Category Descriptor"` |
| 19 | `analytics` | Plausible / GTM / PostHog or VPS tracker present | Add tracker script to layout |
| 20 | `freemium_gate` | No global auth wall in middleware/app layout | Gate only save/export/history, never core action |

### New Hard Rules — 10 points (manual audit required)

| # | ID | What to check | Fix needed |
|---|---|---|---|
| 21 | `unique_layout` | Layout type differs from other projects (split-hero, centered, full-canvas, terminal, etc.) | Research 3 alternatives via `/design-shotgun`, pick furthest from current portfolio |
| 22 | `unique_colors` | bg hex + accent hex combination used by NO other project in DESIGN-STANDARD.md | Pick new pair from category table, update `globals.css` CSS vars |
| 23 | `chatbot_works` | Chatbot FAB visible on landing, sends message, gets real AI response | Fix endpoint URL, check GROQ_API_KEY in Vercel env, test scope enforcement |
| 24 | `landing_content` | Hero headline is product-specific (≤8 words, says what/who/next). Subhead is ≥2 sentences with real value prop. No generic SaaS copy | Rewrite headline + subhead specific to this product's niche |
| 25 | `live_demo` | Core product action works on landing page without login — real output, not hardcoded | Wire real API call inline on page.tsx, show result below input |
| 26 | `mobile_pwa` | Mobile view (375px): above-fold shows headline+demo+CTA, no horizontal overflow, app-like feel, minimal scroll | Fix: bottom-nav for app shell, collapse demo to 4-card snap-scroll, remove excess sections |
| 27 | `upgrade_scope` | Upgrade/Pro section clearly lists what user gets (features, limits, price) — not vague "unlock premium" | Add clear feature gate table: Free vs Pro, show specific limits |
| 28 | `promo_code` | `lib/promoCode.ts` + `/api/promo/route.ts` + `hooks/usePromo.ts` exist | Add promo system from §R template in CLAUDE.md |
| 29 | `feedback_works` | FeedbackWidget submits to `/api/feedback` and saves to DB — not just UI present | Test submit, check DB row created, fix if API route missing |
| 30 | `no_login_triage` | User can complete ONE full core action (generate/search/calculate/play) with zero auth | Remove auth check from core action handler; gate only save/export |

---

## Projects — Automated Results (run 2026-06-16)

Total: 49 projects · 915 passed · 65 failed across 20-point check.

### 🔴 Worst (4+ failures)

| Project | Failures | Automated Score |
|---|---|---|
| `photorestore` | og_png, chatbot, feedback, rate_limit, ai_fallback | 15/20 |
| `outreach-crm` | sitemap, robots, json_ld, feedback | 16/20 |
| `hub` | og_png, feedback, rate_limit, ai_fallback | 16/20 |

### 🟠 Bad (3 failures)

| Project | Failures | Score |
|---|---|---|
| `ai-jobs-portal` | feedback, rate_limit, ai_fallback | 17/20 |
| `billslash` | chatbot, rate_limit, analytics | 17/20 |
| `firstline` | json_ld, feedback, analytics | 17/20 |
| `playsmart` | feedback, rate_limit, analytics | 17/20 |
| `quicktech` | chatbot, feedback, rate_limit | 17/20 |

### 🟡 Needs Fix (2 failures) — 13 projects

`ai-resume-screener` (feedback, rate_limit) · `ai-toolkit` (feedback, rate_limit) · `invoicemint` (feedback, rate_limit) · `mandirates` (feedback, rate_limit) · `meetscribe` (feedback, rate_limit) · `nammatamil` (og_png, rate_limit) · `parceliq` (feedback, rate_limit) · `protoforge` (feedback, rate_limit) · `replydesk` (og_png, feedback, rate_limit) · `rideflow` (feedback, rate_limit) · `voicejournal` (feedback, rate_limit) · `weekendai` (feedback, rate_limit) · `quizbytesdaily` (rate_limit)

### 🔵 Minor (1 failure) — 13 projects

`agencyos` (feedback) · `anylocal` (feedback) · `campaignforge` (feedback) · `clawdbotai` (rate_limit) · `homecanvas` (feedback) · `idea-agent` (rate_limit) · `quizbites` (chatbot) · `tutiq` (chatbot) · `vidrush` (feedback) · `yt-portal` (rate_limit) · `zerostaff` (chatbot)

### ✅ Clean on 20-point (still need 30-point manual audit)

`kwizzo` · `speakiq` · `resumevault` · `draftcal` · `trackwealth` · `roamplan` · `worldtrends` · `myvitals` · `aicoachlab` · `neuralos` · `pixelforge` · `agenttrace` · `ai-social-content` · `bookingcall` · `clipforge-ai` · `complybuddy` · `pdfideas`

---

## Fix Categories (what agents will do)

### Fix A — Rate Limit (affects 27 projects)
Add to every `app/api/*/route.ts` that calls an LLM:
```typescript
import { checkRateLimit } from '@/lib/rateLimit'
const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
const { ok } = checkRateLimit(ip, 10)
if (!ok) return new Response('Rate limit', { status: 429 })
```

### Fix B — FeedbackWidget (affects 28 projects)
1. Copy `FeedbackWidget.tsx` from `kwizzo/components/`
2. Copy `app/api/feedback/route.ts` from `kwizzo/`
3. Import + render `<FeedbackWidget />` at bottom of `app/page.tsx`

### Fix C — Chatbot (affects 5 projects: billslash, photorestore, quicktech, quizbites, tutiq, zerostaff)
1. Copy `FloatingChatWrapper.tsx` from `kwizzo/components/`
2. Add topic-scoped system prompt for this project
3. Import in `app/layout.tsx`
4. Verify Vercel env has `GROQ_API_KEY`

### Fix D — OG Image (affects 4 projects: hub, nammatamil, photorestore, replydesk)
Generate `public/og.png` 1200×630 with project name + tagline using sharp/canvas.

### Fix E — AI Fallback (affects 4 projects: ai-jobs-portal, hub, photorestore, ai-toolkit)
Copy `lib/ai.ts` from `ai-platform-template/lib/ai.ts` into project. Update imports.

### Fix F — SEO (affects 3 projects: outreach-crm, firstline)
Add `app/sitemap.ts`, `public/robots.txt`, JSON-LD WebSite schema.

### Fix G — Analytics (affects 3 projects: billslash, firstline, playsmart)
Add VPS tracker script or Plausible to `app/layout.tsx`.

### Fix H — Unique Layout + Colors (ALL 49 projects — manual audit)
Per project: check DESIGN-STANDARD.md assignment, verify globals.css uses correct bg/accent vars, verify layout type differs from neighbours. Fix any collision.

### Fix I — Mobile PWA Feel (ALL 49 projects)
Per project:
- Add `app/manifest.ts` with PWA metadata
- Ensure above-fold at 375px: headline + demo + CTA visible no scroll
- Demo panel collapses to 4-card snap-scroll strip on mobile (`lg:hidden` full panel)
- Consider bottom-nav shell for app-like navigation on mobile

### Fix J — Landing Content (ALL 49 projects — content audit)
Per project: read current `app/page.tsx` hero section. If headline is generic, rewrite it. Subhead must be ≥2 sentences with product-specific value prop. Steps row must reference actual product features.

### Fix K — Upgrade/Promo Scope (ALL 49 projects)
Add or fix upgrade section: Free tier limits listed explicitly, Pro tier features listed, promo code input under CTA. Wire `usePromo()` hook to gate.

---

## Execution Plan

### Phase 1 — TaskFlow board populated (TODAY, by agent)
- Run this spec through insertion script
- Create 1 task per project in TaskFlow "Portfolio QA" board
- Each task: title = project name, description = exact failures + fixes needed
- You review board → mark priority projects

### Phase 2 — Fix waves (after your priority sort)
- Wave 1: Fix A (rate_limit) + Fix B (feedback) across all 27+28 projects — mechanical, fast
- Wave 2: Fix C (chatbot) on 6 projects
- Wave 3: Fix D/E/F/G (og_png, ai_fallback, SEO, analytics) — per project
- Wave 4: Fix H (layout+colors) — research + redesign, 1 project at a time
- Wave 5: Fix I (mobile PWA) — per project
- Wave 6: Fix J (landing content) — per project
- Wave 7: Fix K (upgrade/promo) — per project

### Phase 3 — Re-run checklist, verify 30/30

---

## TaskFlow Board Structure

Board: **"Portfolio QA Audit"** (already exists)
Groups:
- 🔴 Critical (score ≤16 or chatbot/ai_fallback/sitemap fail)
- 🟡 Needs Fix (score 17-19 or any new rule fails)
- 🟢 Passed (30/30 clean)

Columns: Project · URL · Issue Type · Severity · Notes (fix steps)

---

## New Hard Rules Added 2026-06-16 (permanent, fire every session, every project)

### §W — Playwright Live-Site Testing (MANDATORY before every push + re-triggerable anytime)

Every project must pass a full Playwright browser test on the live URL. Not just build checks — actual browser interaction. Log results to TaskFlow.

**Test suite per project (run via `npx playwright test` or Playwright MCP):**

| Step | What to test | Pass criteria |
|---|---|---|
| P1 | Load landing page (`/`) | HTTP 200, H1 visible, no console errors |
| P2 | Nav links | Click every `<a>` in navbar — all resolve (200 or valid redirect, no 404) |
| P3 | Footer links | Click every `<a>` in footer — no 404 |
| P4 | Core action (no auth) | Find primary input/button, interact with it, get real output — not "Sign in to continue" |
| P5 | Chatbot FAB | Click chatbot button, type "hello", verify response arrives within 10s |
| P6 | Feedback widget | Find feedback form, submit test message, verify 200 response |
| P7 | Mobile 375px | Viewport 375×812: no horizontal scroll, hero visible above fold, CTA clickable |
| P8 | Desktop 1280px | Viewport 1280×800: layout not broken, demo panel visible |
| P9 | Auth gate check | Try `/dashboard` or `/app` without login — should redirect, not crash |
| P10 | Page speed | Page load < 5s on 3G throttle (Playwright `networkThrottling`) |

**Logging:** Every P1-P10 result → `qa-insert-task.mjs` with severity `pass` or `critical`/`high`.

**Trigger protocol:**
```bash
# Re-run any time from taskflow/ dir:
node --env-file=.env.local scripts/run-playwright-qa.mjs --project kwizzo
# Or all projects:
node --env-file=.env.local scripts/run-playwright-qa.mjs --all
```

Results appear in TaskFlow "Portfolio QA Audit" board within minutes.

### §X — Tokenisation Strategy (per project, mandatory)

Every project must have explicit token limits to prevent runaway AI cost:

```typescript
// lib/tokenLimit.ts (copy into every project)
const LIMITS = {
  free: { maxInputTokens: 800, maxOutputTokens: 400 },
  pro:  { maxInputTokens: 4000, maxOutputTokens: 2000 },
}
export function getTokenLimit(plan: 'free' | 'pro') { return LIMITS[plan] }
```

Rules:
- Free tier: cap input at 800 tokens, output at 400 tokens — trim user input before sending
- Pro tier: 4000/2000 — still capped, never unlimited
- Every LLM call must pass `max_tokens` from the limit function — never omit it
- Chatbot: limit conversation history to last 6 messages to prevent context blowout
- Checklist check: `grepR(dir, 'max_tokens')` must return true in AI route files

### §Y — Standard Protocol for Site Updates (fires every time any project is touched)

Before ANY change to a live project:
1. `npm run build` — must exit 0
2. `npm run dev &` — start local server
3. Playwright screenshots 375px + 1280px — read both
4. After push: wait for Vercel deployment green
5. Run `node --env-file=.env.local scripts/run-playwright-qa.mjs --project <name>` against live URL
6. All P1-P10 must pass before marking task complete in TaskFlow
7. Update TaskFlow task → "Passed" group

This protocol is permanent. No shortcut. No "I'll check later."

---

## Script to Push All 49 Tasks

See: `scripts/push-portfolio-tasks.mjs` — inserts one task per project with full findings.
Run: `node --env-file=.env.local scripts/push-portfolio-tasks.mjs`
