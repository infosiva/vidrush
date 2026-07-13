# Design Standard — Portfolio Visual Identity
**Date:** 2026-06-15  **Status:** ACTIVE — enforced on all projects from this date

## The Problem We're Fixing

Every project has been converging on the same look:
- `#0a0a0b` / `#0a0a0f` / `#080712` near-black background
- Teal (`#14b8a6`) or emerald accent
- Radial gradient mesh blobs (top-left + bottom-right)
- Dot-grid overlay
- Split `lg:grid-cols-2` hero with animated panel right

**This is permanently banned.** No exceptions. No "it's slightly different teal."

---

## New Standard: Mixed Theme by Product Category

### Consumer / Lifestyle Products → LIGHT theme

| Category | Products | Background | Accent | Accent 2 | Surface |
|---|---|---|---|---|---|
| **Health / wellness** | myvitals, voicejournal | `#f8fafc` white | `#0d9488` teal | `#0f766e` | `#f1f5f9` |
| **Travel / local** | roamplan, bookingcall, mandirates, nammatamil | `#f0fdf4` green-tint | `#059669` emerald | `#047857` | `#dcfce7` |
| **Food / community** | mandirates, nammatamil | `#fffbf5` warm-white | `#ea580c` orange | `#c2410c` | `#fff7ed` |
| **Education / quiz** | tutiq, kwizzo, quizbites, quizbytesdaily, speakiq | `#f0f9ff` sky-tint | `#0284c7` sky-blue | `#0369a1` | `#e0f2fe` |
| **Productivity / SaaS** | taskflow, draftcal, aicoachlab | `#ffffff` white | `#2563eb` blue | `#1d4ed8` | `#f8fafc` |
| **Finance / billing** | trackwealth, invoicemint, billslash | `#f8fafc` white | `#059669` emerald | `#10b981` | `#ecfdf5` |

### Dev Tools / AI Infrastructure → DARK theme (flat, NO blobs)

| Category | Products | Background | Accent | Accent 2 | Surface |
|---|---|---|---|---|---|
| **Dev tools / agents** | agenttrace, neuralos, idea-agent, protoforge, aitoolkit | `#0b1120` dark navy | `#6366f1` indigo | `#818cf8` | `rgba(255,255,255,0.04)` |
| **Gaming / creative** | pixelforge, clipforge | `#0f0f23` deep navy | `#f59e0b` amber | `#fbbf24` | `rgba(255,255,255,0.04)` |
| **AI infrastructure** | resumevault, aijobsportal, ai-social-content, ai-resume-screener | `#0c0f1a` dark | `#7c3aed` violet | `#8b5cf6` | `rgba(255,255,255,0.04)` |
| **Media / video** | yt-portal, clawdbotai | `#0a0a0f` near-black | `#e879f9` fuchsia | `#d946ef` | `rgba(255,255,255,0.04)` |

### Utility / Misc — case by case
- worldtrends → `#f9fafb` white, `#dc2626` red accent (news/trends feel)
- firstline → `#f8fafc` white, `#2563eb` blue (professional services)
- pdfideas → `#fdf4ff` purple-tint, `#9333ea` purple accent

---

## Hard Rules for ALL themes

### PERMANENTLY BANNED
- `radial-gradient(ellipse...rgba(20,184,166` — teal blob mesh. Never again.
- `#0a0a0f`, `#0a0a0b`, `#080712` as landing background for consumer apps
- Dot-grid `radial-gradient(rgba(255,255,255,0.038) 1px, transparent 1px)` overlay on dark bg
- Any two projects sharing the same bg hex AND accent hex
- Orange/amber + near-black combo (banned since May 2026)

### Dark theme (dev tools) — correct pattern
```css
/* CORRECT — flat dark, no blobs */
background: #0b1120;
/* surface */
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
/* NO radial blobs, NO dot grid */
```

### Light theme (consumer) — correct pattern
```css
/* CORRECT — clean white/tint */
background: #f0f9ff;  /* sky-tint for education */
color: #0f172a;       /* near-black text */
/* surface */
background: #ffffff;
border: 1px solid #e2e8f0;
/* accent via CSS var */
--accent: #0284c7;
```

---

## CSS Variable Template

Every project's `globals.css` must define these vars:

### Light theme template
```css
:root {
  --bg: #f0f9ff;            /* category bg */
  --surface: #ffffff;
  --border: #e2e8f0;
  --accent: #0284c7;        /* category accent */
  --accent-2: #0369a1;      /* darker accent for hover/active */
  --text: #0f172a;
  --muted: #64748b;
  --radius: 8px;
}
```

### Dark theme template (dev tools)
```css
:root {
  --bg: #0b1120;
  --surface: rgba(255,255,255,0.04);
  --border: rgba(255,255,255,0.08);
  --accent: #6366f1;
  --accent-2: #818cf8;
  --text: #f1f5f9;
  --muted: #64748b;
  --radius: 8px;
}
```

---

## Hero Section Rules

### Light theme hero
- Headline: `color: #0f172a` (dark slate), NOT white
- Accent text: `color: var(--accent)` on the key product word
- Subtext: `color: #64748b`
- CTA primary: `background: var(--accent)`, `color: #fff`
- CTA ghost: `border: 1.5px solid #e2e8f0`, `color: #374151`
- No mesh blobs. May use: subtle `#f1f5f9` section dividers, clean card borders

### Dark theme hero (flat)
- Headline: `color: #f1f5f9`
- Accent text: `color: var(--accent)`
- Subtext: `color: rgba(255,255,255,0.45)`
- Surface cards: `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.08)`
- NO gradient blobs. NO dot grid. Flat dark only.

---

## Demo Panel Rules (right side of split hero)

Demo panel must show REAL product UI. No illustrations. No abstract shapes.

| Product type | What to show |
|---|---|
| Kanban/task tools | Live draggable cards (already done in TaskFlow) |
| Quiz tools | Animated question card cycling |
| Resume tools | Animated resume bullet generation typing |
| Calendar/scheduling | Mini calendar with event populating |
| Finance/invoice | Invoice line items populating with totals |
| Travel planner | Itinerary cards building up |
| Health/vitals | Animated metric chart filling in |
| AI chat tools | Typewriter response building |
| Video tools | Thumbnail preview rendering |

---

## How to Apply (Wave Process)

For each project redesign:

1. **Check category** — consumer (light) or dev tool (dark)?
2. **Pick bg + accent** from the table above — verify no collision with another live project
3. **Update `globals.css`** — replace old vars, remove any radial blob CSS
4. **Update `page.tsx`** — replace hardcoded dark hex + teal with CSS vars
5. **Remove mesh blobs** — delete `radial-gradient(ellipse` lines from page
6. **Light theme**: update text colors to dark slate, card borders to `#e2e8f0`
7. **Run build** — `npm run build` must pass
8. **Screenshot** — 375px + 1280px, verify no overflow, verify above-fold hero visible
9. **Push**

---

## Project → Theme Assignment (quick reference)

| Project | URL | Theme | Bg | Accent |
|---|---|---|---|---|
| tutiq | tutiq.app | LIGHT education | `#f0f9ff` | `#0284c7` |
| kwizzo | kwizzo.app | DARK gaming | `#101026` | `#3b82f6` |
| quizbites | quizbites.app | DARK gaming | `#12122b` | `#fbbf24` |
| quizbytesdaily | quizbytes.dev | LIGHT education | `#faf5ff` | `#7c3aed` |
| speakiq | speakiq.app | LIGHT education | `#f0fdfa` | `#0f766e` |
| trackwealth | trackwealth.app | LIGHT finance | `#f8fafc` | `#059669` |
| invoicemint | invoicemint.cloud | LIGHT finance | `#f0fdf4` | `#16a34a` |
| roamplan | roamplan.app | LIGHT travel | `#f0fdf4` | `#059669` |
| flightbrain | flightbrain.app | LIGHT travel | `#f0f9ff` | `#0284c7` |
| billslash | billslash.app | LIGHT finance | `#fffbf5` | `#ea580c` |
| resumevault | resumevault.app | DARK ai-infra | `#0c0f1a` | `#7c3aed` |
| aijobsportal | aijobsportal.app | DARK ai-infra | `#0c0f1a` | `#6366f1` |
| draftcal | draftcal.app | LIGHT productivity | `#ffffff` | `#2563eb` |
| aicoachlab | aicoachlab.app | LIGHT productivity | `#f8fafc` | `#2563eb` |
| ai-social-content | ai-social-content.vercel.app | DARK ai-infra | `#0c0f1a` | `#e879f9` |
| agenttrace | agentlogs.app | DARK dev-tools | `#0b1120` | `#6366f1` |
| neuralos | neuralagent.app | DARK dev-tools | `#0b1120` | `#6366f1` |
| protoforge | protofast.app | DARK dev-tools | `#0b1120` | `#f59e0b` |
| idea-agent | idea-agent.vercel.app | DARK dev-tools | `#0f0f23` | `#818cf8` |
| aitoolkit | aitoolkit.app | DARK dev-tools | `#0b1120` | `#10b981` |
| pixelforge | arcadeforge.app | DARK gaming | `#0f0f23` | `#f59e0b` |
| clipforge | clipforge.ai | DARK media | `#0a0a0f` | `#e879f9` |
| yt-portal | yt-portal.vercel.app | DARK media | `#0a0a0f` | `#f87171` |
| ai-resume-screener | ai-resume-screener.vercel.app | DARK ai-infra | `#0c0f1a` | `#818cf8` |
| clawdbotai | clawdbotai.tech | DARK media | `#0a0a0f` | `#34d399` |
| myvitals | myvitals.app | LIGHT health | `#f8fafc` | `#0d9488` |
| worldtrends | worldtrends.today | LIGHT news | `#f9fafb` | `#dc2626` |
| mandirates | mandirates.app | LIGHT food-local | `#fffbf5` | `#ea580c` |
| bookingcall | bookingcall.app | LIGHT local-services | `#f8fafc` | `#2563eb` |
| firstline | firstline.so | LIGHT professional | `#f9fafb` | `#0ea5e9` |
| pdfideas | pdfideas.vercel.app | LIGHT creative | `#fdf4ff` | `#9333ea` |
| voicejournal | voicejournal.vercel.app | LIGHT health | `#fdf2f8` | `#db2777` |
| nammatamil | nammatamil.live | LIGHT cultural | `#fdf2f8` | `#db2777` |
| complybuddy | complybuddy.app | LIGHT productivity | `#ffffff` | `#2563eb` |
| parceliq | parceliq.app | LIGHT logistics | `#fefce8` | `#ca8a04` |
| roamplan | roamplan.app | LIGHT travel | `#f0fdf4` | `#059669` |
| quicktech | quicktech.app | LIGHT productivity | `#ffffff` | `#3b82f6` |
| renewalpilot | renewalpilot.app | LIGHT productivity | `#ffffff` | `#2563eb` |
| outreach-crm | outreach-crm.vercel.app | DARK dev-tools | `#0b0f1a` | `#818cf8` |
| playsmart | playsmart.app | DARK gaming | `#0f0f23` | `#fb923c` |
