# HANDOFF — Full Portfolio Redesign Wave
**Date:** 2026-06-17  **Status:** IN PROGRESS
**Goal:** Every project gets unique bg+accent+layout, branded logo, animated demo, full design system pipeline

## Theme Registry (no collisions allowed)
| Project | BG | Accent | Status |
|---------|-----|--------|--------|
| photorestore | `#faf7f4` cream | `#c8894a` amber | UNIQUE ✓ |
| zerostaff | `#0b1120` navy | `#10b981` emerald | keep, fix content |
| invoicemint | `#f0fdf4` green-tint | `#059669` emerald | REDESIGN |
| aicoachlab | `#fff7ed` orange-tint | `#ea580c` orange | REDESIGN |
| replydesk | `#f8f9ff` blue-tint | `#4f46e5` indigo | REDESIGN |
| quizbites | `#fefce8` yellow-tint | `#ca8a04` yellow | REDESIGN (collision w/ tutiq) |
| tutiq | `#f0f9ff` sky-tint | `#0284c7` sky-blue | keep |
| myvitals | `#f0fdfa` teal-tint | `#0d9488` teal | FIX accent var |
| pdfideas | `#fafafe` blue-white | `#6366f1` indigo | FIX bg |
| voicejournal | `#f5f0ff` lavender | `#8b5cf6` purple | FIX |
| resumevault | `#0c0f1a` dark | `#7c3aed` violet | assign |
| draftcal | `#fffbf5` warm-white | `#d97706` amber | assign |
| trackwealth | `#0b1420` dark navy | `#f59e0b` gold | assign |
| speakiq | `#fdf4ff` violet-tint | `#9333ea` violet | assign |
| neuralos | `#080d1a` near-black | `#6366f1` indigo | FIX bg (collision w/ zerostaff) |
| kwizzo | `#0f0f23` deep navy | `#f59e0b` amber | keep |
| worldtrends | `#f9fafb` white | `#dc2626` red | keep |
| pixelforge | `#0e0e16` near-black | `#7c3aed` violet | keep |
| agenttrace | `#0c111a` dark | `#22d3ee` cyan | add vars |
| anylocal | `#fffbf5` warm-white | `#ea580c` orange | FIX accent |
| rideflow | `#080f1a` dark | `#3b82f6` blue | keep |
| homecanvas | `#fffdf7` ivory | `#78716c` stone | FIX |

## P0 Projects (fix today — collision or missing accent)
- [ ] quizbites — yellow-tint theme + unique layout vs tutiq
- [ ] invoicemint — green-tint finance theme + full landing redesign
- [ ] aicoachlab — orange-tint career theme + content hierarchy fix
- [ ] replydesk — indigo theme + landing page
- [ ] myvitals — add teal accent var
- [ ] pdfideas — bg fix + indigo accent
- [ ] voicejournal — lavender bg + purple accent

## P1 Projects (this wave)
- [ ] resumevault — dark violet professional
- [ ] draftcal — amber calendar theme
- [ ] trackwealth — dark gold fintech
- [ ] speakiq — violet language theme
- [ ] neuralos — fix bg collision
- [ ] agenttrace — add globals.css vars
- [ ] Logo/favicon wave — all 40 projects app/icon.tsx

## Design tools mandatory per project
1. Theme collision check (grep 3 existing projects)
2. Category theme assignment (from DESIGN-STANDARD.md table)
3. /design-shotgun → 3 directions
4. /design-html → canvas HTML+Tailwind
5. /ui-ux-pro-max → quality pass
6. /21st-registry → components
7. /emil-design-eng → polish
8. /animate → motion
9. Animated right panel (live product demo)
10. Branded logo in navbar (accent-colored key word)
11. app/icon.tsx favicon
12. npm run build → Playwright 375+1280px → push

## Resume from here if interrupted
P0 Batch started: quizbites → redesign with yellow-tint `#fefce8` + `#ca8a04` accent

---
## Previous HANDOFF (QA Audit — COMPLETE)
Status: COMPLETE — 200 rows logged, 33/33 projects audited

## TaskFlow Board
- Board: "Portfolio QA Audit" (boardId: `eb9b84b8-a900-4279-b126-bc8878a68402`)
- Workspace: "Portfolio Audit" (workspaceId: `e93358d1-aa9e-4d8d-b819-99f349ed8f1c`)
- Script: `/Users/sivaprakasam/projects/agents/taskflow/scripts/qa-insert-task.mjs`
- DB: taskflow Neon (`ep-little-voice-ap3y0jn6-pooler.c-7.us-east-1.aws.neon.tech`)

## Checks per project (6 total)
1. **Logo/Branding** — navbar has branded mark (icon + product name, accent-color key word), visible 375+1280px
2. **Hero/Demo** — H1 ≤8 words says what/who/next; live demo/CTA above fold; no forced login for core action
3. **Chatbot** — floating chatbot FAB visible bottom-right, opens, responds (Groq llama)
4. **Feedback** — feedback widget/link present (usually footer or floating button)
5. **Dead Links** — nav + footer links all resolve (no 404 clicks)
6. **Mobile** — 375px no horizontal overflow, hero visible above fold

## Insert command pattern
```
export DATABASE_URL="postgresql://neondb_owner:npg_AQ0TIKwsUl5v@ep-little-voice-ap3y0jn6-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require" && node /Users/sivaprakasam/projects/agents/taskflow/scripts/qa-insert-task.mjs --severity <critical|high|medium|low|pass> --project <name> --url <url> --issue-type "<Logo/Branding|Hero/Demo|Chatbot|Feedback|Dead Link|Mobile Overflow|Other>" --notes "<description>"
```

## Project Batches

### Batch 1 (Education/Quiz)
- tutiq → https://tutiq.app
- kwizzo → https://kwizzo.app
- quizbites → https://quizbites.app
- quizbytes → https://quizbytes.dev
- speakiq → https://speakiq.app

### Batch 2 (Finance/Travel)
- trackwealth → https://trackwealth.app
- invoicemint → https://invoicemint.cloud
- roamplan → https://roamplan.app
- flightbrain → https://flightbrain.app
- billslash → https://billslash.app

### Batch 3 (AI Tools / Resume / Jobs)
- resumevault → https://resumevault.app
- aijobsportal → https://www.aijobsportal.app
- draftcal → https://draftcal.app
- aicoachlab → https://aicoachlab.app
- ai-social-content → https://ai-social-content.vercel.app

### Batch 4 (Dev Tools / Agent Products)
- agenttrace → https://agentlogs.app
- neuralos → https://neuralagent.app
- protofast → https://protofast.app
- idea-agent → https://idea-agent.vercel.app
- aitoolkit → https://aitoolkit.app

### Batch 5 (Media / Creative)
- pixelforge → https://arcadeforge.app
- clipforge → https://clipforge.ai
- yt-portal → https://yt-portal.vercel.app
- ai-resume-screener → https://ai-resume-screener.vercel.app
- clawdbotai → https://clawdbotai.tech

### Batch 6 (Local / Utility / Misc)
- myvitals → https://myvitals.app
- worldtrends → https://worldtrends.today
- mandirates → https://mandirates.app
- bookingcall → https://bookingcall.app
- firstline → https://firstline.so
- pdfideas → https://pdfideas.vercel.app
- voicejournal → https://voicejournal.vercel.app
- nammatamil → https://nammatamil.live

## Steps
- [x] TaskFlow board created (boardId: eb9b84b8)
- [x] Groups created: Critical / Needs Fix / Passed
- [x] Columns created: Project / URL / Issue Type / Severity / Notes
- [x] Insert script created + tested
- [x] HANDOFF.md written
- [x] Batch 1 agents complete
- [x] Batch 2 agents complete
- [x] Batch 3 agents complete
- [x] Batch 4 agents complete
- [x] Batch 5 agents complete
- [x] Batch 6 agents complete
- [x] Summary report to user

**Status: COMPLETE — 200 rows logged, 33/33 projects audited**

## QA Results Summary

| Severity | Count |
|---|---|
| ✅ Pass | 64 |
| 🟡 Low/Medium | 41 |
| 🟠 High | 31 |
| 🔴 Critical | 64 |

### Sites completely down (must fix first)
- **speakiq.app** — 404 (deployment broken)
- **mandirates.app** — DEPLOYMENT_NOT_FOUND (domain unlinked)
- **firstline.so** — ECONNREFUSED (not deployed)
- **aitoolkit.app** — GoDaddy parked domain (never deployed)
- **ai-social-content.vercel.app** — wrong project deployed (Bolt.new shell)
- **clipforge.ai** — critical across all 6 checks
- **yt-portal** — critical across all 6 checks
- **flightbrain.app** — critical across all 6 checks

### Most common high issues (all projects)
- **Chatbot missing** — 10+ projects have no FAB
- **Feedback widget missing** — ~20 projects missing §22
- **Dead footer links** (/terms, /privacy, /contact = 404) — widespread template bug

## Monitoring Tools (now available)
- `npm run qa` — HTTP-based 6-check QA for all 33 projects → Neon DB
- `npm run monitor` — Playwright click/nav test + screenshots → /tmp/portfolio-monitor/
- `npm run monitor -- --project kwizzo` — single project
- `npm run qa -- --dry-run` — print only, no DB write

## Outstanding manual steps
1. **speakiq.app DNS**: Domain zone is on infosiva Vercel account. Go to Vercel dashboard → infosiva → Domains → speakiq.app → Transfer to sivaprakasam team. Then speakiq.app will serve new deployment.
2. **aitoolkit.app**: GoDaddy parked — add A record → 76.76.21.21 in GoDaddy DNS.
3. **firstline.so**: ECONNREFUSED — check registrar renewal, then deploy/link.
4. **clipforge.ai**: Namecheap DNS A record = 192.64.119.101 (wrong) → change to 76.76.21.21.
5. **mandirates data.gov.in API key expired**: `DATA_GOV_API_KEY=579b464db66ec23bdd000001cdd3946e44ce4aad38d82beea2de9d6` → `{"error": "Key not authorised"}`. Register at https://data.gov.in → request access to resource `9ef84268-d588-465a-a308-a864a43d0070` → get new key → update VERCEL env var `DATA_GOV_API_KEY` for mandirates (infosiva account, `prj_gIAewIPEIUZXtAxNIyBQ2eLK238E`). Site currently shows 11 hardcoded fallback records only.

## Known site issues (monitor flagged)
- kwizzo mobile: blank white area above fold — hero content below viewport

## Resume from here if interrupted
Phase 2: fix remaining down sites + apply DESIGN-STANDARD wave to first batch of projects.
