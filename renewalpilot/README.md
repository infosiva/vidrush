# RenewalPilot

Paste a vendor contract, lease, or insurance policy → Claude extracts vendor, renewal date,
notice period, and cost → dashboard tracks it sorted by urgency. Free up to 3 contracts,
$9 one-time unlock for unlimited.

## What's real vs stubbed

**Real:**
- Claude 3.5 Haiku tool-use extraction (`lib/parseContract.ts`) — forced structured output, not freeform chat
- Auth: JWT + httpOnly cookie, bcrypt password hashing (`lib/auth.ts`)
- Contracts CRUD scoped to the logged-in user, backed by SQLite/Prisma
- Free-tier gate (3 contracts) enforced server-side in `app/api/contracts/route.ts`, not just UI
- Stripe one-time Checkout + webhook to flip `user.unlocked` (`app/api/checkout`, `app/api/webhooks/stripe`)
- Rate limiting on the parse endpoint (in-memory, 20 req/hr/IP)

**Stubbed / not built:**
- **Email reminders** — not implemented. Dashboard shows urgency visually (color-coded) but nothing
  emails you before a renewal date. Fastest path to add: Resend + a daily Vercel Cron hitting
  `/api/cron/remind` that queries contracts within N days and emails the owning user.
- **Password reset** — no flow. A user who forgets their password is stuck. Fine for a weekend
  launch with <50 users; add before any real growth.
- No pagination on the contracts list — fine at 3-30 contracts, breaks visually well before 100.

## What breaks first at 100 concurrent users

1. **Rate limiter is in-memory** (`lib/rateLimit.ts`) — resets on every redeploy/cold-start restart,
   and doesn't share state across serverless instances on Vercel. At 100 users it under-limits, not
   over-limits (each instance has its own counter) — not a correctness bug yet, but stops being a
   real rate limit. Upgrade path: Upstash Redis, same interface.
2. **SQLite via a local file** (`dev.db`) — this does not survive Vercel's serverless filesystem
   (ephemeral, and not shared across function invocations/regions). **This is the actual
   blocker for real deployment**, not a 100-user scaling problem — it will misbehave even at
   1 concurrent user in production. Must migrate to a hosted Postgres (Neon/Supabase) before
   going live. Prisma schema is already adapter-based (Prisma 7 driver adapters); swap
   `@prisma/adapter-better-sqlite3` for `@prisma/adapter-neon` or `@prisma/adapter-pg` and update
   `DATABASE_URL`.
3. **No queue on Claude calls** — every parse is a synchronous request-response. At high concurrency,
   Anthropic rate limits (not app rate limits) will start returning 429s with no retry/backoff logic.

## Known blocker before any real launch

The `ANTHROPIC_API_KEY` currently in `.env` (copied from `agents/.env.shared`) is **rejected by
Anthropic's API** (`invalid x-api-key`) as of this build — confirmed via direct `curl` against
`api.anthropic.com/v1/models`, not a wiring issue in this app. Get a fresh key from
console.anthropic.com and replace it before the parse feature will work at all, live or local.

Same applies to Stripe — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` are
empty placeholders. Create a Stripe product ($9 one-time) and wire the keys before the
upgrade flow works. Until then `/api/checkout` returns a graceful 503, it doesn't crash.

## Fastest channel for first 10 users to test pricing

**r/smallbusiness or r/Entrepreneur** — post as "I built a tool because I kept forgetting to
cancel vendor contracts before auto-renewal — feedback welcome" with the live link. This niche
(small office / small business owner juggling leases, insurance, SaaS renewals manually) matches
the exact buyer this was scoped for, and both subreddits have a strong "I built X, roast it"
culture that gets genuine replies fast, not just upvotes. Post the tool itself, not a landing
page — let people paste a real contract and see the extraction work before asking for money.

Second choice: Indie Hackers "Show IH" — slower feedback loop but higher-intent audience already
primed to try new SaaS and comment on pricing specifically.
