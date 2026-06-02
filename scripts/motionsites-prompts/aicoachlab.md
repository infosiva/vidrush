# Motionsites Template: AI Workflow Hero → AICoachLab Adaptation
# Source: https://motionsites.ai (AI Workflow Hero, free Copy)
# Design: Boomerang video bg, pill nav, nature/forest palette

## Key design elements to adapt:
- Brand: "AICoachLab"
- Headline: "Close the gap" / "between you and mastery."
- Sub: "AI-powered courses that adapt to you — your pace, your role, your goals."
- CTA: "Start learning free" (left), "Watch how it works" (right, video play icon)
- Nav: LEARN, TRACKS, INTERVIEW, PRICING
- Colors: swap forest green (#1f2a1d) → orange (#1a0a00 bg, #f97316 accent)
- Remove BoomerangVideoBg (too heavy for Next.js SSR) → use CSS gradient + particle canvas
- Bottom-left block: "FluxEngine™" → "AICoachLab™" + feature blurb
- Keep: sticky nav, glass pill desktop nav, mobile hamburger drawer

## Dependency note: No Framer Motion in template — use CSS transitions only for this component
