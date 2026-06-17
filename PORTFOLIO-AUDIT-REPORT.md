# Portfolio Visual Audit Report
**Date:** 2026-06-17  
**Scope:** 38 deployed projects (screenshots at 1280px desktop)  
**Method:** Playwright screenshots + manual visual review

---

## CRITICAL — Sites Completely Down or Wrong Project Deployed

| Project | URL | Issue |
|---------|-----|-------|
| **homecanvas** | homecanvas.vercel.app | `DEPLOYMENT_NOT_FOUND` — no deployment linked |
| **anylocal** | anylocal.vercel.app | `DEPLOYMENT_NOT_FOUND` — no deployment linked |
| **rideflow** | rideflow.vercel.app | Blank white page — content not rendering |
| **ai-resume-screener** | ai-resume-screener.vercel.app | Blank white page — content not rendering |
| **photorestore** | photorestore.vercel.app | Shows **"restorePhotos.io"** — WRONG PROJECT deployed (competitor clone/template) |
| **idea-agent** | idea-agent.vercel.app | Chinese-language UI — wrong project deployed |
| **voicejournal** | voicejournal.vercel.app | Shows **"Yappr"** branding — wrong product name deployed |
| **invoicemint** | invoicemint.cloud | Shows **"DealFlow"** branding — wrong product name deployed |
| **aicoachlab** | aicoachlab.app | Black spinner only — JS bundle error, content never loads |
| **billslash** | billslash.app | Blank dark green gradient — content not rendering |
| **roamplan** | roamplan.app | Near-blank — hero content missing |
| **flightbrain** | flightbrain.app | Unstyled raw HTML — CSS bundle not loading |

**Action required:** Deploy or fix these 12 projects before any marketing push.

---

## HIGH — Functional But Major Issues

| Project | Issue | Fix |
|---------|-------|-----|
| **agencyos** | Immediately shows Sign In wall — core action gated (§T violation). Footer says "AIO Media LLC" (wrong company) | Add public landing, remove auth gate on `/` |
| **tutiq** | Mobile 375px: completely blank (hero-entry animation, prefers-reduced-motion) | Same fix as kwizzo: add `prefers-reduced-motion` override in globals.css |
| **quizbites** | Mobile 375px: blank (same hero-entry issue as tutiq) | Same fix |
| **pdfideas** | Hero content extremely low contrast — text barely readable (purple on near-black, opacity ~0.4) | Increase text opacity, improve contrast ratio |
| **clawdbotai** | Hero section partially invisible — dark text on dark bg, content rendering but not visible in screenshot | Check contrast, fix bg/text combo |
| **meetscribe** | Right panel is static screenshot mockup (§Z6 violation — animated demo required) | Animate the demo panel |
| **draftcal** | Functional but branding/design inconsistent with portfolio standards | Design refresh needed |

---

## MEDIUM — Works But Needs Improvement

| Project | Issue |
|---------|-------|
| **kwizzo** | Mobile hero blank fixed ✅ (prefers-reduced-motion fix applied last session). Desktop looks good. |
| **speakiq** | DNS not resolving (registrar issue — manual fix needed, tracked in HANDOFF) |
| **mandirates** | data.gov.in API key expired — showing only 1 fallback record (11 hardcoded). Needs new API key from data.gov.in |
| **quizbytes** | Questions loading async (spinner visible in screenshot) — UX ok but slow perceived load |
| **myvitals** | Shows "Setup" state immediately — new visitor sees onboarding before value. Should show demo/features first |
| **worldtrends** | Looks great overall ✅. Possible issue: top story was a GitHub repo (IPTV channels list) — source aggregation may pull noise |
| **bookingcall** | Right panel "AI Matcher" area mostly empty in screenshot — demo not animating |

---

## PASSED — Looking Good ✅

| Project | Notes |
|---------|-------|
| **trackwealth** | Clean dashboard, good branding |
| **resumevault** | Good hero, upload CTA visible |
| **aijobsportal** | Job search UI functional |
| **agenttrace** | Dashboard loads, charts visible |
| **neuralos** | Agent UI loads |
| **protoforge** | Prototyping tool, functional |
| **pixelforge** | Arcade forge, dark gaming theme ✅ |
| **draftcal** | Calendar UI visible |
| **ai-social-content** | Loads (though earlier was flagged as Bolt shell — may have been fixed) |
| **nammatamil** | Tamil news site ✅ — live news, real content, category tabs, responsive |
| **worldtrends** | Live trending stories, BREAKING ticker, clean warm-white theme ✅ |
| **mandirates** | Branded "MandiRates LIVE", commodity prices, chatbot FAB ✅ (data stale due to API key) |
| **bookingcall** | Hero loads, CTAs visible, Feedback button present |
| **campaignforge** | Excellent ✅ — dark theme, 9 AI agent pills live, input CTA, no auth gate |
| **meetscribe** | Functional hero, pricing link, transcription demo mockup |
| **quizbytes** | Functional ✅ — loads questions, Feedback button, chatbot FAB |
| **pdfideas** | Functional (low contrast issue noted above) |
| **clawdbotai** | Partially visible — dark theme AI showcase |
| **hub** | Dashboard loads |

---

## SaaS Product Improvement Analysis

### 1. Branding Consistency (CRITICAL — fix this week)
Three projects are deploying the **wrong product entirely**:
- `photorestore` → "restorePhotos.io" (competitor)
- `voicejournal` → "Yappr"  
- `invoicemint` → "DealFlow"
- `idea-agent` → Chinese UI

Root cause: these were likely scaffolded from templates and never properly renamed before deploying. Fix: update `package.json` name, all `layout.tsx` metadata, and navbar brand text.

### 2. Hero Animation Bug (affects 3+ projects)
`kwizzo`, `tutiq`, `quizbites` all use `.hero-entry` CSS class that starts at `opacity: 0`. Playwright (and real users with `prefers-reduced-motion`) see a blank page.

**Fix already applied to kwizzo.** Apply same to tutiq + quizbites:
```css
@media (prefers-reduced-motion: reduce) {
  .hero-entry { opacity: 1 !important; transform: none !important; animation: none !important; }
}
```

### 3. Auth Gates on Landing (§T violation)
- `agencyos` — home page IS the login page. Zero value prop visible without account.
- Fix: build a proper marketing landing at `/` that converts before login.

### 4. Deployment Infrastructure
- `homecanvas`, `anylocal` have no live deployment — Vercel project not linked or domain unlinked.
- `rideflow`, `ai-resume-screener` render blank — likely missing env vars causing client-side crash.

### 5. Demo Panel Quality
Most projects use static screenshots in the right panel. Per §Z6, this must be animated live product simulation. Top offenders: `meetscribe`, `bookingcall`.

### 6. Chatbot Coverage
After last session's FeedbackWidget wave, chatbot FABs are now present on most projects. Spot-check confirms: `quizbytes` ✅, `mandirates` ✅, `myvitals` ✅, `bookingcall` ✅.

### 7. Wrong Company Name in Footer
- `agencyos` footer: "© 2026 AIO Media LLC" — should be your brand
- Check other projects for similar template footers

### 8. Data/API Issues
- `mandirates` — API key expired, showing stale fallback data (30/04/2025 date visible)
- `worldtrends` — aggregating GitHub repos as "news" — need better source filtering

---

## Priority Fix List (ordered by impact)

### P0 — Do today (complete breakage)
1. `homecanvas` + `anylocal` — deploy to Vercel (DEPLOYMENT_NOT_FOUND)
2. `photorestore` — fix wrong project (shows restorePhotos.io)
3. `voicejournal` — fix wrong branding (shows "Yappr")
4. `invoicemint` — fix wrong branding (shows "DealFlow")
5. `idea-agent` — fix wrong project (Chinese UI)
6. `aicoachlab` — fix JS bundle error (blank spinner)
7. `billslash` + `roamplan` + `rideflow` + `ai-resume-screener` — fix blank pages

### P1 — This week (high visibility)
8. `tutiq` + `quizbites` — apply prefers-reduced-motion fix (blank mobile hero)
9. `agencyos` — add public landing page, remove auth gate on `/`
10. `pdfideas` — fix contrast (text nearly invisible)
11. `agencyos` footer — fix "AIO Media LLC" → correct brand name
12. `flightbrain` — fix CSS bundle not loading

### P2 — Next sprint (quality improvements)
13. `meetscribe` — animate right panel demo
14. `bookingcall` — animate AI Matcher panel
15. `myvitals` — show features/value before onboarding flow
16. `mandirates` — new data.gov.in API key
17. `worldtrends` — filter GitHub/code repos from news feed

### P3 — Design refresh (longer term)
18. Apply DESIGN-STANDARD category themes to projects still using generic palettes
19. Animated demo panels on all split-layout projects (§Z6)

---

## Manual Actions Required (cannot be automated)

| Action | Owner | Notes |
|--------|-------|-------|
| speakiq DNS | Vercel dashboard → transfer speakiq.app to sivaprakasam team | |
| aitoolkit GoDaddy | Add A record → 76.76.21.21 | |
| clipforge.ai Namecheap | Change A record from 192.64.119.101 → 76.76.21.21 | |
| firstline.so | Check registrar renewal + redeploy | |
| mandirates API key | Register at data.gov.in → get new key for resource `9ef84268-d588-465a-a308-a864a43d0070` → set `DATA_GOV_API_KEY` in Vercel | |

---

*Report generated: 2026-06-17. Screenshots in `/tmp/portfolio-audit/`.*
