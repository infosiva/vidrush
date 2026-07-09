# speakiq landing page redesign — design spec

**Date:** 2026-07-09
**Status:** approved by user, pre-implementation

## Problem

1. User reported invisible text (light bg, white text, no contrast) — root-caused and fixed in commit `0d8c115` (8 files, §0-BG-CONTRAST pattern: dark-styled components with no own background).
2. User then asked for a bigger, more modern speakiq landing page and explicitly rejected the current purple/violet/indigo theme.
3. Separately discovered: `DESIGN-STANDARD.md` groups speakiq into "Education/quiz" bucket sharing `#f0f9ff` bg + `#0284c7` accent with tutiq, kwizzo, quizbites, quizbytesdaily — a 5-way bg+accent collision, violating the portfolio's own §Z6 "no two projects share bg+accent" rule. speakiq is a conversation-practice product, not a quiz app; it doesn't belong in that bucket.

## Decision

### Palette (locked)
- Background: `#ffffff` white
- Accent: `#0891b2` cyan
- Accent-2: `#0e7490` darker cyan (hover/active states)
- Text: `#0f172a` dark slate (was `#f8fafc` white-on-dark)
- Card surface: `#f8fafc` / border `#e2e8f0`

Cyan is unclaimed anywhere in the portfolio (checked full hex list across `DESIGN-STANDARD.md`). No purple/violet/indigo anywhere in the new palette.

### Layout (locked)
Full-width hero, no `lg:grid-cols-2` split. Structure:
1. Big headline + subhead, centered, max-width constrained
2. Language selector row (kept from current, restyled light)
3. Live conversation demo (`LiveConversationPanel`) full-width below, as the centerpiece — not a side panel
4. CTA below the demo

This satisfies §T (product IS the demo, not a decorative side panel) more directly than the current split layout.

### Scope of change
- `src/lib/theme.ts` — full rewrite, light+cyan tokens (single source consumed by ~15 components)
- `src/components/HeroClient.tsx` — restyle to light, full-width layout, keep language-switcher logic and copy overrides untouched
- `src/components/LiveConversationPanel.tsx` — restyle container/bubbles to light card surfaces, keep all conversation script data and animation logic untouched (real product content, not fake data)
- `src/app/globals.css` — dark-card utility tokens swapped to light equivalents
- The 8 files fixed in commit `0d8c115` (MarqueeBar, HowItWorksSection, FeaturesGrid, FAQSection, PricingSection, SharedFooter, /terms, /about) — remove the dark-gradient wrapper patch, since on a light page dark-styled text is no longer the failure mode; restyle their text/surface colors to light instead
- `app/icon.tsx` — recolor to cyan accent
- Navbar wordmark — recolor key letter to cyan

### Out of scope
- Conversation script content/data — unchanged, already real product content
- Promo code, chatbot, feedback widget logic — unaffected, just inherit new CSS variables
- Routing/page structure — unchanged
- `/lesson`, `/converse` app pages — separate dark-themed in-product screens, not part of the marketing-page redesign (confirm no bg-contrast regression there once theme.ts changes, since some components are shared)

### DESIGN-STANDARD.md fix
Split speakiq out of the "Education/quiz" row into its own entry:
`speakiq → #ffffff white bg, #0891b2 cyan accent, #0e7490 accent-2` — resolves the 5-way collision as a side effect of this work.

## Success criteria
- No purple/violet/indigo anywhere in rendered output (grep `indigo|violet|purple|#6366f1|#7c3aed|#8b5cf6` in speakiq `src/` returns nothing after)
- Build passes, zero TS errors
- `visual-qa.mjs` 20/20 pass at 375px + 1280px
- Live conversation demo visible above the fold at 1280px without scroll
- No bg+accent collision with any other portfolio project (re-check `DESIGN-STANDARD.md` full hex list)
- `/about`, `/terms`, `/lesson`, `/converse` all re-verified for contrast after `theme.ts` change (shared component blast radius)
