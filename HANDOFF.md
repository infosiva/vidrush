# HANDOFF — §0 competitor research + copy refresh (4 projects: worldtrends/agenttrace/neuralos/pixelforge)
**Date:** 2026-05-29  **Status:** COMPLETE
**Goal:** Research-backed hero copy + Emil animation polish for worldtrends, agenttrace, neuralos, pixelforge

## Files to touch
- `worldtrends/components/ChatBot.tsx` — WELCOME greeting
- `agenttrace/apps/dashboard/src/components/ChatBot.tsx` — WELCOME + SYSTEM_PROMPT
- `neuralos/components/FloatingChat.tsx` — empty-state greeting + placeholder
- `pixelforge/lib/chatbot-configs.ts` — PIXELFORGE_CHAT_CONFIG welcome + system prompt
- `worldtrends/app/TrendsClient.tsx` — hero h1 tagline
- `neuralos/app/page.tsx` — hero h1 + subheadline
- `pixelforge/components/HeroSection.tsx` — default headline fallback copy
- `agenttrace/apps/dashboard/src/components/HeroContent.tsx` — hero copy

## Steps
- [x] Read memory + competitor WebSearch (4 sets)
- [x] Find chatbot + hero components across all 4 projects
- [x] Output research table
- [ ] Apply copy changes (chatbot greetings, hero copy, CTAs)
- [ ] Run builds: worldtrends, agenttrace, neuralos, pixelforge
- [ ] git add specific files + commit + push

## Success criteria
- All 4 projects have differentiated headlines <= 8 words
- All chatbot greetings are product-scoped
- npm run build passes for all 4
- Committed and pushed

## Resume from here if interrupted
Research complete — ready to apply copy changes to files listed above
