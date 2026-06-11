# HANDOFF — vidrush initial scaffold
**Date:** 2026-06-04  **Status:** IN PROGRESS
**Goal:** Scaffold Vidrush AI text-to-video app and get it building locally

## Files to touch
- `package.json` — deps: next 15, fal-ai, groq-sdk
- `app/layout.tsx` — metadata, dark theme
- `app/globals.css` — magenta/purple dark theme
- `app/page.tsx` — split layout hero, state machine
- `app/api/enhance/route.ts` — Groq prompt enhancer
- `app/api/generate/route.ts` — fal.ai Kling video gen
- `next.config.ts` — eslint ignore
- `tailwind.config.ts` + `postcss.config.mjs` — standard
- `tsconfig.json` — standard Next.js 15
- `.env.local` — placeholder keys
- `.gitignore` — env/node_modules/.next
- `public/robots.txt` — allow all
- `app/sitemap.ts` — single route

## Steps
- [ ] Create all files
- [ ] npm install
- [ ] npm run build
- [ ] git init + commit

## Success criteria
- `npm run build` exits 0
- No TypeScript errors

## Resume from here if interrupted
Not started yet
