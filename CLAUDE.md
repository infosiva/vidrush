# agents/ — Project Standards

## §0-EDGE-CONFIG-QUOTA — NEVER UNCACHED EDGE CONFIG READS (HARD RULE — added 2026-08-01, NO EXCEPTIONS)

**Incident 2026-08-01: shared Edge Config store (all ~43 portfolio projects read the same store) got the whole infosiva Vercel account auto-paused — `DEPLOYMENT_DISABLED`, 300% over the 50,000/mo free-tier Global Config Reads cap. Root cause: `loadSiteTheme()` in every project's `lib/theme-loader.ts` called `get()` uncached on every single page render. Fixed by wrapping every call in `unstable_cache(fn, [key], { revalidate: 600 })`. Vercel granted a one-time courtesy 3x-limit-for-30-days unblock — this does NOT repeat. Next overage = paid Pro upgrade or extended downtime, no second courtesy.**

### Permanent rules — every project, every touch, no exceptions
1. **Every Edge Config `get()`/`getAll()` call MUST be wrapped** in `unstable_cache` (`next/cache`) with `revalidate` set (600s / 10min is the portfolio standard) — or `export const revalidate = N` on the route/page if reading at request time. A bare `await get(...)` with no cache wrapper is banned, full stop.
2. **Enforced automatically** — global pre-commit hook (`~/.claude/git-hooks/pre-commit`, §4 "Edge Config uncached-read guard") scans every staged `.ts`/`.tsx` file for `@vercel/edge-config` usage without a nearby `unstable_cache`/`revalidate`/`next/cache` marker and blocks the commit. This applies to ALL git repos on this machine (global `core.hooksPath`), not just `agents/`.
3. **Monthly usage check** — run `node agents/scripts/check-edge-config-quota.mjs` (or equivalent Vercel API usage check) before any portfolio-wide wave/redesign session, and periodically otherwise. Treat >50% of the 50k/mo quota consumed before month-end as an early warning — go find what's reading uncached.
4. **New project scaffold** — if the new project reads Edge Config at all, `lib/theme-loader.ts` (or equivalent) must be copied from an already-fixed project (kwizzo is the reference), never written from scratch without the cache wrapper.
5. **Any code review / agent-authored change touching Edge Config** — verify the cache wrapper is present before considering the change done. This is the same enforcement class as `§0-VISUAL-QA` — a change that reads Edge Config without caching is incomplete work, redo it.

### Why this matters more than most rules here
One project's mistake pauses the ENTIRE account — all ~29 infosiva-account production sites go down at once, not just the offending project. There is no per-project blast radius on a shared Edge Config store.

## §0-REF-AWESOME-LLM-APPS — reference repo, read-only (added 2026-07-15)
`awesome-llm-apps/` (Shubhamsaboo/awesome-llm-apps, shallow clone, gitignored — not a submodule, not deployed) — curated real-world agent/LLM app examples across `advanced_ai_agents/`, `advanced_llm_apps/`, `agent_skills/`, `mcp_ai_agents/`, `rag_tutorials/`, `starter_ai_agents/`, `voice_ai_agents/`, `always_on_agents/`, `generative_ui_agents/`. Grep here for working reference implementations before building a new agent pattern from scratch. Update: `cd awesome-llm-apps && git pull`.

## §0-MOBBIN — MOBBIN MCP MANDATORY ON EVERY UI/DESIGN TOUCH (HARD RULE — added 2026-07-13, NO EXCEPTIONS)

**Mobbin MCP (`mcp__mobbin__*`) installed 2026-07-13. Real production app screens/flows — grounds every layout decision in actually-shipped UI instead of invented patterns.**

### Mandatory sequence — fires alongside §0-UI-QUALITY-GATE, before `/design-shotgun`
1. `mcp__mobbin__*` — pull 3-5 real reference screens matching the project's category (fintech, quiz, dashboard, booking, etc.) BEFORE running `/design-shotgun` on any new layout, hero, or component
2. Layer on top, same order as always: `/ui-ux-pro-max` → `/taste-skill` → `/21st-registry` → matching Open Design skill → `/emil-design-eng` → `/animate`
3. Use Mobbin references to validate spacing/hierarchy/motion choices during `/ui-ux-pro-max` and `/emil-design-eng` passes — not just at the start

### Auto-trigger
Fires on: any `app/page.tsx`/`app/layout.tsx` touch, any new component, any "redesign"/"polish"/"make it look better" request, any new project scaffold — same trigger list as `§0-UI-QUALITY-GATE`.

### Skip condition
Only skip if Mobbin MCP is down/unauthenticated (OAuth needed on first use) — don't block the task on it, note the skip in the report, proceed with the rest of the pipeline. Never skip because "this is a small change."

**A UI touch that runs `/ui-ux-pro-max` + layout skills but never queried Mobbin = incomplete — same enforcement class as skipping `/ui-ux-pro-max` itself.**

## §0-TOOL-HYGIENE — CONNECT TOOLS ONLY WHEN NEEDED, QUICK CHECKUP EVERY SESSION (HARD RULE — added 2026-07-07, NO EXCEPTIONS)

**Connect a tool (MCP server, plugin) only when a task actually needs it — not "just in case." Minimize token/cost waste from idle connected tools.**

### Quick recurring checkup — do this regularly, not on a fixed calendar delay
1. Run `codeburn optimize --period 30days` — check real usage per tool (fast, cheap, no reason to defer)
2. Any tool at zero/near-zero use → disconnect it: `claude mcp remove <name> -s user` (and `-s local` if it also shows there)
3. Before disconnecting anything tied into memory/session-load hooks (e.g. claude-mem) — check the hook files first, never remove blind
4. Log what was removed in MEMORY.md (one line)
5. Re-adding a removed tool later is quick and low-risk — leaving unused tools connected is the higher-cost default, always err toward disconnecting

**Do this check often as a routine habit — start of a session, after wiring up any new tool, whenever things feel slow — not just once and forget.**

## §0-TOKEN-FIX — RUN /fix-tokens ON A HARD CADENCE, NOT JUST ON DEMAND (HARD RULE — added 2026-07-07)

**Token-waste remediation is now a standing rule, not a one-off tool.** CodeBurn diagnoses; `/fix-tokens` (this repo: `agents/scripts/fix-tokens/`) applies the fix under a diff+approval gate; both must be used routinely, not only when explicitly asked.

### Mandatory cadence
- **SessionStart hook** (`agents/hooks/token-fix-nudge.sh`, wired into `~/.claude/settings.json`) prints a one-line nudge whenever cached fixable-finding count > 0. This is a cheap, cached check (<100ms) — it does not run a full scan every session.
- **Run `/fix-tokens` whenever the nudge fires.** Do not dismiss it repeatedly across sessions — treat 3+ consecutive nudges without running the skill as a violation of this rule.
- **Run `/fix-tokens` proactively at the end of any multi-hour or multi-project session wave** (e.g. after a portfolio wave, after any session that touched 5+ projects), even without a nudge — these are exactly the sessions CodeBurn flags as context-heavy or low-delivery.
- **Never auto-apply a fix without the diff+approval gate** — this tool follows the same irreversible-action discipline as the rest of this environment (see root-level Claude behavior: risky/config-changing actions require confirmation, never silent execution).

### Complementary token tools — use frequently, not just this one
- **ponytail mode** — apply its ladder (reuse > stdlib > native > existing dep > one-liner) on every task, not just when reminded. Standing behavioral rule, restated here so it's linked to the token-cost discipline this section establishes.
- **RTK (Rust Token Killer)** — `rtk gain` / `rtk discover` — check periodically for missed token-saving opportunities in CLI usage (see `~/.claude/RTK.md`).
- **graphify** — query the pre-built knowledge graph instead of grep/Read exploration (see root CLAUDE.md § graphify) — one of the largest token-saving levers already in place; keep using it first.
- **CodeBurn `optimize`** — the sole diagnosis source for `/fix-tokens`; also usable standalone (`codeburn optimize --format json`) for a quick read without going through the full fix flow.

### What NOT to do
- Do not build a second/competing diagnosis engine — CodeBurn remains the sole data source (see `docs/superpowers/specs/2026-07-07-ai-trace-advisor-design.md`).
- Do not skip the approval gate "because it's just a paste" or "just removing an unused MCP server" — every fix, regardless of perceived triviality, gets a diff and an explicit y/n.

**Full spec:** `docs/superpowers/specs/2026-07-07-ai-trace-advisor-design.md`
**Full plan:** `docs/superpowers/plans/2026-07-07-ai-trace-fixer.md`

## §0-PUBLIC-APIS — FREE API LIBRARY (HARD RULE — CHECK BEFORE ADDING ANY DATA FEATURE)

**Repo cloned at:** `/Users/sivaprakasam/projects/agents/public-apis/` (1631 free APIs, 40+ categories)
**Parser script:** `node public-apis/extract-for-projects.mjs`
**Full spec:** `~/.claude/projects/-Users-sivaprakasam-projects-agents/memory/project_public_apis.md`

### MANDATORY — before any of these actions:
- Hardcoding mock/fake data for any feature
- Paying for a third-party API subscription
- Building a scraper for data that might have a free API

**Check the library first:**
```bash
# See all free APIs matching a project's category
node /Users/sivaprakasam/projects/agents/public-apis/extract-for-projects.mjs

# Filter by category (Finance, Jobs, Weather, News, etc.)
node /Users/sivaprakasam/projects/agents/public-apis/extract-for-projects.mjs --cat Finance

# Full JSON — pipe to jq for custom filtering
node /Users/sivaprakasam/projects/agents/public-apis/extract-for-projects.mjs --json | jq '.[] | select(.auth == "none")'
```

**Key free no-auth APIs already confirmed useful:**
| Need | API | URL |
|---|---|---|
| Quiz questions | Open Trivia DB | `opentdb.com/api.php` |
| Weather | Open-Meteo | `api.open-meteo.com` |
| Currency rates | Frankfurter | `api.frankfurter.app` |
| Geocoding/maps | Nominatim | `nominatim.openstreetmap.org` |
| Nutrition/food | Open Food Facts | `world.openfoodfacts.org/api` |
| Books | Open Library | `openlibrary.org/api` |
| Flight data | OpenSky Network | `opensky-network.org/api` |
| News | GNews | `gnews.io` (free tier) |

**Update library:**
```bash
cd /Users/sivaprakasam/projects/agents/public-apis && git pull && node extract-for-projects.mjs --json > apis.json
```

---

## §0-VISUAL-QA — PLAYWRIGHT VISUAL GATE MANDATORY BEFORE EVERY PUSH (HARD RULE — NO EXCEPTIONS, PERMANENT)

**This rule was added 2026-07-02 after speakiq.app shipped with white text on light background — invisible above the fold. The QA script caught 12 contrast/overflow failures that were invisible to code review.**

### What fires on every `git push`
Pre-push hook at `.git/hooks/pre-push` runs `scripts/visual-qa.mjs` automatically.

**5 checks per viewport (375px mobile + 1280px desktop = 10 checks total):**
1. H1 visible and readable above fold
2. No horizontal overflow (scrollbar = mobile UX broken)
3. No console errors (JS crashes hidden from code review)
4. **Contrast ratio ≥ 2.5:1 above fold** — catches white-on-white, low-opacity text on similar bg
5. Primary CTA visible without scroll

**Exit codes:**
- `0` = all pass → push allowed
- `1` = warnings → push allowed, review screenshots
- `2` = critical fail → **PUSH BLOCKED** — fix before pushing

**Screenshots always saved to:** `/tmp/vqa-<project>-mobile.png` and `/tmp/vqa-<project>-desktop.png` — READ THEM before reporting QA done.

### Install hooks
```bash
# Single project (run from project dir):
bash /Users/sivaprakasam/projects/agents/scripts/install-visual-qa-hook.sh

# All Next.js projects at once:
bash /Users/sivaprakasam/projects/agents/scripts/install-visual-qa-hook.sh --all
```

### Run manually (any time)
```bash
# Against live deployed URL:
node agents/scripts/visual-qa.mjs --url https://speakiq.app --project speakiq --no-server

# Against local dev server (auto-starts if not running):
node agents/scripts/visual-qa.mjs --project kwizzo

# Against known live URL by project name:
node agents/scripts/visual-qa.mjs --live speakiq
```

### Projects with hooks installed (2026-07-02)
speakiq, roamplan, draftcal, protoforge, kwizzo, quizbites, tutiq, invoicemint, trackwealth, resumevault

**Install on every new project at scaffold time.** Add to §F scaffold checklist.

### What this catches (that code review misses)
| Issue | Example caught |
|---|---|
| White text on light bg | speakiq hero: `rgba(255,255,255,0.42)` on `rgba(255,255,255,0.04)` = ratio 1.0 |
| Dark text on dark bg | Any project using `var(--foreground)` without setting bg |
| Horizontal overflow | Marquee/orb elements positioned outside viewport |
| H1 missing/invisible | Page renders but headline has 0 height (CSS collision) |
| Console JS errors | Silent crashes that break features |

### Hard rules
- NEVER `git push` without visual QA passing (exit 0 or 1)
- Exit code 2 = stop, fix the contrast/layout issue, re-run
- Skip only allowed with `git push --no-verify` AND only when pushing a non-UI change (e.g. env var update, backend-only route) — document the skip reason in commit message
- After fixing a contrast issue: re-run `--live` against deployed URL to confirm fix visible in production, not just in build

### Common contrast fixes
```typescript
// LOW CONTRAST: rgba(255,255,255,0.42) on rgba(255,255,255,0.04) → ratio 1.0
// FIX: raise opacity of text AND/OR background
color: 'rgba(255,255,255,0.75)',      // was 0.42
background: 'rgba(255,255,255,0.10)', // was 0.04

// LOW CONTRAST: light-colored text on same-hue translucent bg
color: '#e0e7ff',                     // white-tinted, not colored
background: 'rgba(99,102,241,0.22)',  // was 0.10

// Hero text invisible on wrong bg:
// → Add explicit dark bg to hero section wrapper, not body
// → Never rely on layout.tsx bg color for hero sections with white text
```

---

## §0-BG-CONTRAST — EVERY DARK-THEME COMPONENT MUST SET ITS OWN BACKGROUND (HARD RULE — NO EXCEPTIONS, PERMANENT, added 2026-07-08)

**Root cause pattern, confirmed recurring on speakiq.app across 2+ separate incidents (SampleLesson section on landing page, then `/converse` page — same bug, different files, both reported by user, both had shipped "fixed" before and recurred): a component is written entirely with dark-theme styling (`text-white`, `bg-white/[0.0X]`, `border-white/10`, `rgba(255,255,255,*)`) but the component/page root never sets an explicit `background`. It silently inherits whatever the parent/body background happens to be. If that inherited bg is light, every string of text and card in the component goes near-invisible — and `§0-VISUAL-QA`'s existing check only screenshots the landing-page fold, so it never caught this on secondary routes (`/converse`) or below-the-fold sections.**

### The rule
Any component/page file that uses `text-white`, `text-white/*`, `rgba(255,255,255,*)` as a **primary** text/border color MUST also explicitly set its own `background` (not rely on inheritance) — either on its own root element or via a wrapping element it controls. Never assume a dark ancestor exists.

### Applies globally — every project, not just speakiq
This is not a speakiq-only fix. Grep every project for the same pattern before considering any project "done":
```bash
# Per project — find components styled dark-only with no local background set:
grep -rLZ "background" $(grep -rl "text-white\|rgba(255,255,255" --include="*.tsx" src/ app/ 2>/dev/null) 2>/dev/null | tr '\0' '\n'
```
Any file returned = a component assuming a dark ancestor without setting one — audit and fix.

### Fix pattern (canonical, copy this shape)
```typescript
// Root of any dark-styled section/page:
<section style={{
  background: 'linear-gradient(180deg, #0d0b1e 0%, #120f2a 100%)', // own explicit dark bg
  // ...existing padding/layout
}}>
  {/* existing text-white / rgba(255,255,255,*) children now actually visible */}
</section>
```
Prefer reusing the project's own hero gradient/token (grep `globals.css` / hero component for the exact stops already in use) over inventing a new flat color — the fixed section should read as a continuation of the theme, not a mismatched patch.

### Coverage gap this closes in §0-VISUAL-QA
`§0-VISUAL-QA`'s Playwright gate only screenshots the landing page (`/`) above-the-fold. This rule requires manually auditing (grep above) **every route and every below-the-fold section** for the same inherited-background assumption — landing page mid-scroll sections, `/converse`, `/dashboard`, `/app`, any secondary route. Do this audit on every project touch, not just when a user reports a visible bug.

### Auto-trigger
- Any project touch (per `§0-DESIGN-PIPELINE` / `§0-UI-QUALITY-GATE`) → run the grep above across the whole project, not just the file being edited
- Any user report of "text invisible" / "can't read this" / "never been corrected" → assume this exact pattern first, check ALL routes for the same bug (it is never isolated to one file — verified twice now on speakiq alone)
- After fixing → re-screenshot the SPECIFIC route/scroll-position that was broken (not just `/`), at both 375px and 1280px, before considering it resolved

---

## §0-UI-QUALITY-GATE — `/ui-ux-pro-max` + PLAYWRIGHT CLI MANDATORY ON EVERY PROJECT TOUCH (HARD RULE — NO EXCEPTIONS, PERMANENT, added 2026-07-08)

**`/ui-ux-pro-max` is not one optional step in a longer pipeline — it is a standalone mandatory gate, same enforcement class as `§0-VISUAL-QA`. No UI/layout/component touch ships without it.**

### Mandatory sequence, every UI touch (new project, redesign, or single-component edit)
1. `/ui-ux-pro-max` — run BEFORE writing/editing any layout, hero, or component. Quality pass on hierarchy, spacing, type scale, motion, accessibility.
2. Layer these on top, in order, before implementation is considered done:
   - `/taste-skill` — anti-slop quality gate (does this look premium, or generic?)
   - `/21st-registry` — pull polished components instead of hand-rolling
   - Matching Open Design skill (`/frontend-design`, `/interface-design`, `/shadcn-ui`, `/theme-factory` — pick per `~/.claude/CLAUDE.md` § UI Design PRIMARY TOOL SELECTION table)
   - `/emil-design-eng` — polish pass (spacing, micro-interactions)
   - `/animate` — motion, easing, spring physics
   - `/fixing-accessibility` — WCAG audit
3. **Playwright CLI verification — mandatory, not optional:**
   ```bash
   npx playwright screenshot --browser chromium --viewport-size 1280,800 <url> /tmp/<project>-desktop.png
   npx playwright screenshot --browser chromium --viewport-size 375,812 <url> /tmp/<project>-mobile.png
   node agents/scripts/visual-qa.mjs --project <name>   # contrast/overflow/H1 gate, §0-VISUAL-QA
   ```
   Read both screenshots. `/ui-ux-pro-max` output is not verified until screenshots are actually read and confirmed matching.
4. Only after steps 1–3 pass → implementation is "done." A component built without running `/ui-ux-pro-max` first, or shipped without the Playwright screenshot check, is incomplete work — redo it, don't patch around it.

### Auto-trigger
Fires on: any `app/page.tsx`/`app/layout.tsx` touch, any new component, any "make it look better"/"polish"/"redesign" request, any new project scaffold. Same trigger list as `§0-DESIGN-PIPELINE` — this gate runs alongside it, not instead of it.

### Why standalone (not just step 3 of the design pipeline)
`§0-DESIGN-PIPELINE` governs full project builds (16 steps). This gate exists so that even a **single-component edit** — not a full project touch — still gets the quality-pass + Playwright-verify discipline. A one-line button-color change doesn't need all 16 steps; it still needs `/ui-ux-pro-max` + a screenshot check before it's called done.

---

## §0-VERCEL — WHICH PROJECT GOES WHERE (HARD RULE — NO EXCEPTIONS, PERMANENT)

**This rule exists because 8 old projects were accidentally relinked to sivaprakasam, making them unreachable for weeks.**

### Two accounts, two rules — memorise this:

| Account | Vercel slug | orgId | Rule |
|---|---|---|---|
| `infosiva` | `infosivas-projects` | `team_2XHm064mWA86v38GDJ01Veli` | ALL existing/old projects — frozen list below |
| `sivaprakasam` | `itsmesivaprakasam-6380s-projects` | `team_o4yd8mPfnYYzbpPwlbdxNnWE` | ALL new projects from 2026-05-01 onward |

### infosiva projects (NEVER move, NEVER redeploy to sivaprakasam):
`kwizzo` `tutiq` `quizbites` `speakiq` `trackwealth` `invoicemint` `roamplan` `flighttracker` `billslash` `resumevault` `aijobsportal` `draftcal` `aicoachlab` `ai-social-content` `agenttrace` `neuralos` `protoforge` `idea-agent` `aitoolkit` `pixelforge` `clipforge-ai` `yt-portal` `ai-resume-screener` `clawdbotai` `myvitals` `worldtrends` `mandirates` `bookingcall` `firstline`

### MANDATORY before ANY `vercel link` or `vercel --prod`:
```bash
# 1. Check which account the project belongs to (lookup list above)
# 2. For infosiva projects:
vercel --prod --yes --scope infosivas-projects --token $VERCEL_TOKEN_INFOSIVA
# 3. For sivaprakasam projects:
vswitch sivaprakasam && vercel --prod --yes
# 4. After deploy, verify .vercel/project.json has correct orgId:
cat .vercel/project.json | grep orgId
# infosiva old projects → team_2XHm064mWA86v38GDJ01Veli
# sivaprakasam new projects → team_o4yd8mPfnYYzbpPwlbdxNnWE
```

### Auto-trigger: fires on EVERY deploy action
- Before `vercel link` → check project name against infosiva list above
- Before `vercel --prod` → verify `.vercel/project.json` orgId matches expected account
- Wrong orgId found → STOP. Fix .vercel/project.json or relink before deploying.
- **BEFORE touching any project: `curl -s -o /dev/null -w "%{http_code}" https://domain` — if 200, the site is LIVE. Do NOT redeploy, do NOT delete .vercel, do NOT make code changes unless the code itself is broken. A live site is not broken just because the account assignment is wrong in a config file.**
- **NEVER `rm -rf .vercel` on a live project** — deleting + redeploying creates NEW project, detaches domains, breaks live sites immediately
- To fix wrong orgId: ONLY edit `.vercel/project.json` in place — change `orgId` and `projectId` values, never delete the file
- Wrong account found → fix the JSON, verify domain still attached via Vercel API, then redeploy. Never nuke and redo.

---

## §0-DESIGN-PIPELINE — CSS-ONLY CHANGES ARE BANNED (HARD RULE — NO EXCEPTIONS, PERMANENT)

**This rule was added because CSS-var-only fixes were shipped as "complete" when 15 of 16 pipeline steps were skipped.**

### What happened (never repeat this)
Updating `--background` and `--accent` in `globals.css` is NOT a project update. It is step 3 of 16. Shipping CSS vars without the rest = wasted push, false sense of progress, projects still broken.

### The ONLY acceptable "project update" = ALL 16 steps complete:

| Step | What | Skip condition |
|------|------|----------------|
| 1 | HANDOFF.md written before first file touch | none |
| 2 | `/design-shotgun` → 3 directions → pick layout archetype DIFFERENT from last 3 touched | none |
| 3 | Unique bg+accent from category table, no collision | none |
| 4 | Animated right panel — REAL product demo, not illustration or static image | none |
| 5 | Branded navbar — accent-colored key word + icon/emoji mark | none |
| 6 | `app/icon.tsx` favicon | none |
| 7 | Context/level-adaptive AI prompts (if project has AI feature) | only if no AI feature |
| 8 | Live stats — real session data only, hidden when zero, NO fake baselines | none |
| 9 | Plan preview — free vs pro real diff, `PlanPreview` component | none |
| 10 | Dashboard/feature preview — empty-state motivates upgrade, `DashboardPreview` | none |
| 11 | Trending/dynamic content section — hidden until real data exists | only if not applicable |
| 12 | Promo code system — `lib/promoCode.ts` + `app/api/promo/route.ts` + `hooks/usePromo.ts` | none |
| 13 | Chatbot — `FloatingChatWrapper`, Groq fallback chain, 60 req/hr, scoped system prompt | none |
| 14 | Feedback widget — `app/api/feedback/route.ts` + `FeedbackWidget` in layout | none |
| 15 | Zero fake data — all stats/quotes/logos real or removed | none |
| 16 | `npm run build` → Playwright 375+1280px → push → E2E live verify | none |

### Canonical reference: quizbites
quizbites (`agents/quizbites/`) is the reference implementation. Before touching any project, read its component list and replicate the same depth.

### Layout selection rule (step 2 of pipeline)
1. Check `design-system/LAYOUT-PROMPTS.md` — find template matching project category (T1–T18)
2. If project already has correct T1–T18 layout implemented and working → KEEP IT, skip to step 3
3. If project has wrong or missing layout → pick closest T1–T18 template, build in protofast first
4. Only if NO template fits → design a new archetype, add it to LAYOUT-PROMPTS.md as T19+
5. NEVER run `/design-shotgun` with open-ended "pick any layout" — always anchor to the template list
6. **Every template (existing or new) must have its AI-tool row filled in** per the AI-tool-layer table in `LAYOUT-PROMPTS.md` (Nano Banana / Stitch / NotebookLM / Veo / code-generated). A template with a visual need and no AI-tool assigned is incomplete — fill it in before using the template, don't skip.

### Auto-trigger
ANY of these phrases = full 16-step pipeline, NOT a CSS fix:
- "update [project]", "fix [project]", "redesign [project]", "add theme", "make it look better"
- "wave all projects", "do all projects", "update the portfolio"

**Doing step 3 alone and calling it done = violation. Redo the work.**

---

## §0-DESIGN-LOCK — FINALIZE DESIGN BEFORE ANY CODE CHANGE (HARD RULE — NO EXCEPTIONS, PERMANENT)

**Design must be fully decided — tool-checked, layout-picked, logo-assigned — before the first line of code or CSS changes. No code-first, theme-later.**

### Order, every project, every touch:
1. Check Google free-tool workflow (`~/.claude/CLAUDE.md` § Google Free-Tool Workflow) — Stitch wireframe / NotebookLM research / Nano Banana visuals considered, not skipped
2. Run full design tool pipeline (`/design-shotgun` → `/design-html` → `/ui-ux-pro-max` → `/21st-registry` → Open Design skill match → `/emil-design-eng` → `/animate`) and pick the T1–T17 layout per §0-DESIGN-PIPELINE step 2
3. Lock bg+accent, layout archetype, demo panel type, and **logo concept** — write all 4 into HANDOFF.md as a finalized design block BEFORE touching any file
4. Only after the design block is written → start implementation

**If a design tool needed for the job is missing or not installed → STOP, install/wire it first.** Never substitute raw Tailwind or skip a step because the tool isn't set up yet — fix the gap, then proceed. "We don't have that tool" is not a reason to skip; it's a reason to install it.

### Dedicated logo — MANDATORY, every project, no exceptions
- Every project ships a **real, project-specific logo mark** — not the Next.js default, not a bare emoji standing alone, not a copy-pasted mark from another project.
- Logo = icon/symbol (can be emoji-based or SVG) + wordmark, with the product's key word in `var(--accent)`, used consistently in: navbar, `app/icon.tsx` favicon, and OG image.
- Favicon (`app/icon.tsx`) color MUST match the project's actual accent — verify against `globals.css`, never leave a stale/wrong-color gradient (this exact bug hit quizbites — purple favicon on an amber-themed site).
- No stray root-level `app/icon.tsx` shadowing `src/app/` — check for this every time (recurring portfolio bug, confirmed in draftcal/resumevault/trackwealth).

### End-of-pipeline completeness test — MANDATORY, run before marking any project done
Before declaring a project pipeline complete, verify EVERY item below is actually true — not assumed:
- [ ] All 16 §0-DESIGN-PIPELINE steps done (not just step 3)
- [ ] Logo present: navbar + favicon + OG image, correct accent color, visible at 375px and 1280px
- [ ] Google free-tool checklist considered (step 1 above)
- [ ] No stray `app/icon.tsx` shadowing bug
- [ ] Chatbot + feedback widget both live and responding
- [ ] `npm run build` exits 0
- [ ] Pushed to main, Vercel deploy green
- [ ] §Z9 E2E verify run against the LIVE url (not localhost) — P1–P10 checked
- [ ] MCP/tool check: every design tool the pipeline calls for (21st-registry MCP, Figma MCP if used, image-gen/Nano Banana if used) actually returned real output — not silently skipped or failed

**If ANY box is unchecked → project is NOT done. Go back and complete it. 100% or it doesn't count as shipped.**

---

## §0-PRE — PLAN BEFORE ANY ACTION (HARD RULE — NO EXCEPTIONS)

**Before ANY fix, deploy, code change, or agent dispatch:**
1. Show the plan — what will be done, per project, in order
2. Wait for explicit user approval ("yes", "go", "proceed", "looks good")
3. Only then execute

**Never:**
- Start fixing before showing plan
- Ask "should I proceed?" mid-execution
- Assume approval from context or prior conversation
- Dispatch fix agents without a written plan visible to user first

**Plan format (minimum):**
```
## Plan — [task name]
### What we found: [findings summary]
### What we'll fix, in order:
1. [project] — [exact action] — [why]
2. ...
### What we won't touch: [scope boundary]
### Risks: [anything irreversible or risky]
```

This rule fires EVERY time. No exceptions for "small" fixes, "obvious" changes, or "just adding" something.

---

## MANDATORY: Portfolio Design System (HARD RULE — auto-trigger every UI touch)

**Source of truth: `agents/design-system/MASTER.md`**

### Before ANY visual change to ANY project:
1. **Read `design-system/MASTER.md`** — check theme registry, confirm no bg+accent collision
2. **Pick layout prompt from `design-system/LAYOUT-PROMPTS.md`** — matching category (finance, education, health, dev-tools, productivity, creative, travel)
3. **Run `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<project> <category>" --design-system --stack nextjs`** — get palette + style + UX
4. **Apply globals-template.css** — copy to project, replace `%%TOKENS%%` with tokens from MASTER.md
5. **Animated right panel is MANDATORY** — every project hero has live product demo, not static illustration

### Design tool pipeline (all 7 steps, no skipping):
```
/design-shotgun       → 3 directions, pick furthest from portfolio
/design-html          → canvas HTML+Tailwind generation
/ui-ux-pro-max        → quality + motion + accessibility pass
/21st-registry        → pull polished components (never hand-roll common UI)
/emil-design-eng      → spacing, taste, micro-interactions
/animate              → Framer Motion, spring physics
/fixing-accessibility → WCAG 4.5:1, focus states, aria
```

### Collision guard (hard rule):
- Grep `design-system/MASTER.md` "Quick Collision Checker" section before assigning any theme
- If bg hex already in use → pick different shade
- After assigning → add to MASTER.md collision list

### protofast design system:
- Tokens: `--background: #080d1a`, `--accent: #6366f1` (indigo), dark dev-tools category
- Uses TEMPLATE 4 from LAYOUT-PROMPTS.md
- Right panel: code snippet typing + live preview rendering

---

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
2. `npm run dev &` — start server on PORT
3. **`node agents/scripts/visual-qa.mjs --url http://localhost:PORT --project <name> --no-server`** — runs 10 checks (contrast, H1, overflow, CTA, errors), saves screenshots to `/tmp/vqa-<name>-{mobile,desktop}.png`
4. READ both screenshots — confirm hero readable, CTA visible, no layout breaks
5. Exit 0 or 1 → `git push` (pre-push hook re-runs visual-qa automatically)
6. Exit 2 → fix the failure, re-run, never push with `--no-verify` on UI changes
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

**Incident 2026-08-03: flighttracker committed a real Groq API key hardcoded in `scripts/setup-secrets.sh` and in `wrangler.toml`'s `[vars]` block (plaintext, not the Cloudflare secrets store). GitHub's secret-scanning partner program caught it and Groq auto-revoked the key — broke the shared AI cascade portfolio-wide (weekendai.app and others hit "Failed to generate plan"). Root cause: this section documented a pre-commit hook scanning for `gho_`/`ghp_`/`GOCSPX-`/`sk-ant-`/`gsk_`/`vcp_` patterns — but the actual global hook (`~/.claude/git-hooks/pre-commit`) never had that logic wired in. The check was aspirational documentation, not real enforcement. Fixed by: (1) rewriting `setup-secrets.sh` to read all values from env vars with a required-vars validation loop, (2) removing the hardcoded key from `wrangler.toml`, (3) actually implementing the secret-pattern scan in the global pre-commit hook — positioned to fire unconditionally before any project-type gate (a first attempt placed it after a `package.json` existence check, which silently skipped non-Node repos; caught via test and moved earlier). Verified: a throwaway repo with a fake `gsk_...` key now gets blocked at commit time regardless of project type.**

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

### §Z5 — Chatbot + Feedback MANDATORY on every project (HARD RULE — added 2026-06-16)

**Every project must have both before any code push. No exceptions.**

#### Chatbot requirements
- `FloatingChatWrapper` (or equivalent) imported in `app/layout.tsx` — fixed bottom-right FAB
- `app/api/chatbot/route.ts` (or `app/api/chat/route.ts`) — Groq llama-3.3-70b primary, llama-3.1-8b-instant fallback
- System prompt scoped to product: ends with "If asked anything outside [TOPIC], respond: 'I'm trained for [SITENAME]. For that, try Google or ChatGPT!'"
- Rate limit: 60 req/hr per IP (chatbot is conversational — NOT 10 req/hr)
- Multi-tier fallback: Groq → Gemini → Cerebras → graceful error message (NEVER 500)
- Free tier: unlimited chatbot, no auth gate, no token paywall

#### Feedback requirements
- `app/api/feedback/route.ts` — accepts `{type, rating, message, email?, page?, site?}`
- Logs to console + Telegram if `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set
- `FeedbackWidget` component imported in `app/layout.tsx`
- No auth required — any visitor can submit

#### Auto-trigger
- Any `app/layout.tsx` edit → verify both `FloatingChatWrapper` and `FeedbackWidget` present
- Any new project scaffold → add chatbot + feedback BEFORE first deploy
- `§F` scaffold checklist now includes: `app/api/chatbot/route.ts` + `app/api/feedback/route.ts` + both components in layout

### §Z6 — Design System Tools MANDATORY — no raw Tailwind from scratch (HARD RULE — added 2026-06-16)

**Every UI change must use the design system pipeline. Violation = redo the work.**

#### Pipeline (fires on every project touch — no exceptions)
0. `/taste-skill` — DEFAULT FIRST STEP on every UI task. Quality gate before any design work. Anti-slop taste check. If existing design: audit it. If new: sets the taste bar.
0b. `/imagegen-frontend-web` — before generating ANY web UI image. Crafts the taste-aware prompt. Then pipe to `/image-gen` (fal.ai). Mobile images: `/imagegen-frontend-mobile` instead.
1. `/redesign-skill` (if redesigning existing landing) OR `/design-shotgun` (if new) — 3 directions, pick furthest from portfolio
2. `/design-html` — Claude canvas generates production HTML + Tailwind
3. `/ui-ux-pro-max` — premium quality pass (layout, spacing, hierarchy)
4. `/21st-registry` — pull polished components before hand-rolling (buttons, cards, forms, pricing). **MCP wired 2026-06-17**: `mcp__21st-dev-magic__*` tools live via `21st-dev-magic` server in `~/.claude/settings.json` (key in `.env.shared` as `TWENTYFIRST_API_KEY`) — call the MCP tool directly for real component code, don't just reference the skill name in a prompt.
5. **Open Design MANDATORY (added 2026-06-17)** — check `~/.claude/open-design/skills/` (109 skills) before writing ANY UI block:
   - Marketing hero/landing → `/frontend-design`
   - SaaS dashboard/app → `/interface-design`
   - Forms, dialogs, tables → `/shadcn-ui`
   - CSS vars / design tokens → `/theme-factory`
   - Component spec/brief → `/design-brief` + `/design-review`
   - Auth/login flows → `/login-flow`
   - Multi-tenant products → `/platform-design`
   - Production component code → `/frontend-dev`
   **Enforcement:** Open Design skill invoked → its output = base layer. Then layer Emil + animate. Raw Tailwind from scratch = violation.
6. `/emil-design-eng` — polish pass (spacing, micro-interactions, taste)
7. `/animate` — Framer Motion, spring physics, easing
8. `/fixing-accessibility` + `/fixing-metadata` — audit
9. **`/design-loop` (installed 2026-06-17, MANDATORY final pass)** — github.com/andrejkanuch/design-lenses. Orchestrates 8 specialist agents × 4 iterations (diagnose → fix → harden → polish) on the finished file. Run on every landing page / hero file before push: `/design-loop app/page.tsx --domain=<category>`. Domains: motorcycle, fitness, finance, ecommerce, medical, default. Use `--dry-run` first to preview, `--no-apply` for a report-only pass if you want to review before auto-edit. `/design-brainstorm` = faster 3-agent version for quick checks. `/design-status` = check progress on a running loop.

Steps 3-5 and 9 MANDATORY on every new project or landing page touch.

#### Hard bans (permanent — violation = revert)
- NEVER write raw `className="..."` from scratch for layout/hero sections
- NEVER two portfolio projects with same bg hex + accent hex
- BANNED bg combos: `#0a0a0f`/near-black + orange/amber; purple as page background (`#7c3aed`, `#8b5cf6`, `fdf4ff`, `faf5ff`)
- BANNED patterns: `radial-gradient(ellipse...rgba(20,184,166` teal mesh blobs; dot-grid `radial-gradient(rgba(255,255,255,0.038) 1px` overlays
- Static right panel = incomplete. Animated live product demo mandatory.

#### Category → theme (canonical, never deviate)
| Category | Bg | Accent |
|---|---|---|
| Productivity/SaaS | `#ffffff` white | `#2563eb` blue |
| Education/quiz | `#f0f9ff` sky-tint | `#0284c7` sky-blue |
| Health/wellness | `#f8fafc` white | `#0d9488` teal |
| Finance/billing | `#f8fafc` white | `#059669` emerald |
| Travel/local | `#f0fdf4` green-tint | `#059669` emerald |
| Food/cultural | `#fffbf5` warm-white | `#ea580c` orange |
| News/trends | `#f9fafb` white | `#dc2626` red |
| Dev tools/agents | `#0b1120` dark navy | `#6366f1` indigo |
| AI infra/resume | `#0c0f1a` dark | `#7c3aed` violet |
| Gaming/creative | `#0f0f23` deep navy | `#f59e0b` amber |
| Media/video | `#0a0a0f` near-black | `#e879f9` fuchsia |

Auto-trigger: any `app/page.tsx` or `app/layout.tsx` touch → verify bg+accent matches category, not reused across portfolio.

### §Z7 — Hub Dashboard URL (HARD RULE — added 2026-06-16)

Hub production URL: **`https://ai-products-hub.vercel.app`**

- All internal links, memory files, HANDOFF.md references → use this URL
- Hub controls chatbot model, rate limits, feature flags, promo codes for ALL 40 projects via Edge Config `ecfg_s5cumfsw58v5mpe9ahpkb7axmiges`
- After any portfolio-wide change → update hub project metadata in Edge Config
- Hub redesign needed (tracked in TaskFlow) — current layout cluttered

### §Z8 — Protofast-First: Prototype Before Implementing (HARD RULE — added 2026-06-17)

**Every new layout archetype or skill demo MUST be prototyped in protofast before building into any real project.**

**URL:** `https://protofast.app` | **Local:** `agents/protoforge/`

#### Rule
- Any new landing page layout → build in protofast first, screenshot 375+1280px, approve visually
- Any new Open Design skill invocation (T8–T17 archetypes) → run in protofast first
- Only after prototype passes → copy to real project + implement

#### Why
- Prevents wasted full-project implementations of wrong layouts (happened 10+ times)
- Protofast self-promotes: each skill demo = published page at `/demos/[skill-name]`
- Forces visual validation before commit

#### Protofast prototype steps (every time)
```
1. Pick template from design-system/LAYOUT-PROMPTS.md (T1–T17)
2. Run matching Open Design skill: /swiss-creative-mode-template, /field-notes-editorial-template, etc.
3. Paste output into protofast editor → view at localhost
4. Playwright screenshot 375px + 1280px → read both
5. Pass → copy to real project. Fail → iterate in protofast, NOT in real project
6. Protofast publishes demo at /demos/[layout-name] automatically
```

#### Open Design skills for new archetypes (T8–T17)
All installed at `~/.claude/open-design/skills/`:
| Archetype | Open Design Skill | Extra skills |
|-----------|-------------------|-------------|
| T8 Swiss Editorial | `/swiss-creative-mode-template` or `/digits-fintech-swiss-template` | `/gsap-core` `/d3-visualization` |
| T9 Bento Grid | `/shadcn-ui` + `/ui-skills` | `/animate` `/transitions-dev` |
| T10 Cinematic | `/after-hours-editorial-template` | `/gsap-scrolltrigger` `/fal-kling-o3` |
| T11 Typewriter Terminal | `/interface-design` | `/gsap-timeline` `/animate` |
| T12 Magazine Editorial | `/field-notes-editorial-template` or `/editorial-burgundy-principles-template` | `/gsap-scrolltrigger` `/emil-design-eng` |
| T13 Floating Cards | `/algorithmic-art` | `/animate` `/emil-design-eng` |
| T14 Generative Art | `/shader-dev` or `/algorithmic-art` | `/threejs` `/animate` |
| T15 D3 Data Hero | `/d3-visualization` | `/gsap-core` `/animate` |
| T16 Full-Width Input | `/frontend-design` + `/shadcn-ui` | `/transitions-dev` `/animate` |
| T17 Asymmetric Split | `/ui-skills` + `/frontend-design` | `/gsap-scrolltrigger` `/animate` |

#### Canonical 33-site layout assignment
Source of truth: `design-system/LAYOUT-PROMPTS.md` → "FULL 33-SITE ASSIGNMENT" table.
Check it before touching any project's `app/page.tsx`. Never deviate without updating the table.

---

### §Z9 — E2E Verify After Every Push (HARD RULE — added 2026-06-17, no exceptions)

**Every push to any project main branch MUST be followed by an E2E verify run against the live URL. A push without verification is not a completed task.**

#### Why
- Local build passing ≠ live site working. Mixed-content blocks, env var differences, CDN caching, and DNS issues only show up live.
- Caught example: protofast.app shipped a `<Script src="http://...">` tracker tag that browsers silently blocked on HTTPS — `npm run build` passed, Playwright local passed, but every real visit threw a console error. Only a live E2E run against the deployed URL caught it.
- Agent self-report of "pushed, build green" is not sufficient — verify the live artifact, not the local one.

#### Tool
```bash
node agents/scripts/e2e-verify.mjs --project <name> --url https://<live-url> [--checks p1,p7,p8,p10] [--log-db]
```
- Runs P1–P10 checks (see §W) via Playwright against the live URL — not localhost.
- Exit code 0 = all pass, 1 = some fail (non-critical), 2 = critical fail (P1/P7/P8 — landing broken, mobile overflow, desktop layout broken).
- `--log-db` writes results to TaskFlow "Portfolio QA Audit" board (needs `DATABASE_URL` env).
- Screenshots always saved to `/tmp/e2e-<project>-mobile.png` and `/tmp/e2e-<project>-desktop.png` — read them, don't just trust the exit code.

#### Mandatory sequence (replaces old §Z4 step 5)
```
1. npm run build — zero errors
2. git push origin main
3. Wait for Vercel deploy to go green (vercel ls or dashboard)
4. node agents/scripts/e2e-verify.mjs --project <name> --url <live-url>
5. Exit code 2 → STOP, fix immediately, do not move to next project
6. Exit code 1 → triage: fix now if quick, else log to TaskFlow and continue
7. Exit code 0 → task complete
```

#### Auto-trigger
- Any `git push origin main` on a project with a live Vercel URL → run e2e-verify immediately after, before marking the task done in HANDOFF.md or reporting "complete" to the user.
- Multi-project waves (logo wave, design wave, etc.) → e2e-verify each project right after its push, not batched at the end — catches problems while context is still loaded.
- If a project has no live URL yet (new, unpushed) → skip, note in HANDOFF.md as "no live URL to verify yet".
- **Password-gated internal tools (hub)**: P1/P8 checks expect a public H1 + nav and will false-positive on a login wall. Run `--checks p10` only (load time), or visually confirm via screenshot instead of trusting exit code.
