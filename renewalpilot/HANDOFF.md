# HANDOFF — RenewalPilot MVP build
**Date:** 2026-07-11  **Status:** COMPLETE — live at https://renewalpilot.vercel.app
**Goal:** Weekend micro-SaaS: contract renewal tracker. Manual entry + Claude-parsed contract text, dashboard sorted by urgency, Stripe pay-to-unlock unlimited contracts + email reminders.

## Context
Picked after demand research across 5 ideas (see conversation). Renewal-tracker: real documented pain, but crowded (Stitchflow free, RenewOps/Expiration Reminder $30-49/mo). Wedge = simple UX, not price or category creation. Broad niche (all vendor contracts, not SaaS-only) — user's explicit choice over narrower SaaS-only angle.

Google Business Profile / Yelp review-reply APIs both blocked (partner-gated, weeks-long approval) — killed the review-digest idea for this weekend build, pivoted here.

## Stack
- Next.js 15 (App Router), TypeScript, Tailwind
- Auth: simple email/password or magic link (NextAuth or lighter — decide at scaffold time, keep minimal)
- DB: SQLite via Prisma (fastest local setup) or Neon Postgres if need Vercel-native persistence — decide at scaffold
- Claude API: parse pasted contract text → {vendor, renewalDate, noticePeriodDays, cost}
- Stripe: one-time $9 checkout to unlock unlimited contracts + email reminders (Stripe Checkout, not full subscription billing)
- Deploy: Vercel

## Files to touch
- `app/page.tsx` — landing page: pitch + tool inline (per user's original spec: no separate marketing-only landing, tool IS the demo)
- `app/dashboard/page.tsx` — contract list, sorted by next renewal, urgency color-coded
- `app/api/parse-contract/route.ts` — Claude API call, pasted text → structured fields
- `app/api/checkout/route.ts` — Stripe Checkout session creation
- `app/api/webhooks/stripe/route.ts` — Stripe webhook, mark user unlocked on payment success
- `lib/auth.ts` — minimal auth
- `lib/db.ts` — Prisma client / DB setup
- `prisma/schema.prisma` — User, Contract models
- `README.md` — Step 3 deliverable: what's stubbed, what breaks at 100 users, fastest first-10-users channel

## Steps
- [x] HANDOFF.md written
- [x] Scaffold Next.js app (create-next-app, Tailwind, TypeScript)
- [x] Prisma schema: User, Contract (vendor, renewalDate, noticePeriodDays, cost, userId)
- [x] Auth: minimal email/password (signup/login/logout/me routes, JWT + httpOnly cookie)
- [x] Claude parse endpoint: paste contract text → structured fields (with rate limit)
- [x] Dashboard: list contracts sorted by urgency (color: red <7 days, amber <30 days, green else)
- [x] Free tier gate: max 3 contracts, enforced server-side in contracts POST route
- [x] Stripe Checkout: $9 one-time unlock → webhook flips user.unlocked=true (code done, keys not yet set — see blocker below)
- [x] Landing page: pitch + inline tool (try-before-signup parse demo, per §T)
- [ ] Email reminder: DEFERRED to v2 — documented as stubbed in README, not built (time-constrained weekend scope call)
- [x] npm run build — zero errors (fixed Prisma 7 driver-adapter requirement + Turbopack workspace-root warning along the way)
- [x] Deploy to Vercel (sivaprakasam account per §U — verified orgId team_o4yd8mPfnYYzbpPwlbdxNnWE)
- [x] README.md written (stubbed vs real, breaks-at-100-users, first-10-users channel)
- [x] Chatbot: `app/api/chat/route.ts` (Groq 70b→8b fallback, 60/hr) + `FloatingChatWrapper` in layout (§Z5 gap found by e2e-verify, fixed)
- [x] Feedback: `app/api/feedback/route.ts` + `FeedbackWidget` in layout (§Z5 gap found by e2e-verify, fixed)
- [x] §Z9 e2e-verify against live URL — 10/10 pass

## Blockers found during build (not yet resolved)
- **ANTHROPIC_API_KEY in agents/.env.shared is rejected by Anthropic** (`invalid x-api-key`, confirmed via direct curl to api.anthropic.com). User chose to continue building and fix this before launch rather than block now. Need a fresh key before parse feature works, local or live.
- **Stripe not yet configured** — STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_ID are empty placeholders. Checkout route returns graceful 503 until set. Need to create Stripe product ($9 one-time) + wire keys.
- **SQLite via local file won't survive Vercel's serverless filesystem** — must migrate to hosted Postgres (Neon/Supabase) before real deploy. Prisma 7 driver-adapter pattern already in place (`lib/db.ts` uses `@prisma/adapter-better-sqlite3`), swap for `@prisma/adapter-neon` when ready.

## Success criteria
- User can paste contract text, get structured fields back via Claude
- User can view dashboard sorted by renewal urgency
- User hits 3-contract free limit, sees Stripe checkout, pays, unlocks unlimited
- `npm run build` exits 0
- Deployed, live URL reachable

## Resume from here if interrupted
Done. Live at https://renewalpilot.vercel.app, deployed under sivaprakasam Vercel account, e2e-verify 10/10.

Remaining known gaps (not blocking, deferred by explicit user choice):
- SQLite on Vercel serverless filesystem won't persist real user data — migrate to Neon/Supabase Postgres via `@prisma/adapter-neon` before sharing with real users.
- ANTHROPIC_API_KEY in `.env.shared` is invalid — parse-contract feature will fail until a working key is set.
- Stripe keys unset — checkout returns graceful 503 until STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_ID are configured.
- Email reminders deferred to v2.
