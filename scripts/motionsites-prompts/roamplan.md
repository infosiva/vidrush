# Motionsites Template: Wanderful Hero → RoamPlan Adaptation
# Source: https://motionsites.ai (Wanderful Hero, free Copy prompt)
# Design spec: Full-viewport cinematic hero, GSAP parallax, liquid-glass nav

## Key design elements to adapt:
- Brand: "RoamPlan" (not "Wanderful")
- Tagline line 1: "Plan journeys without limits."
- Tagline line 2 (muted): "Built around your pace, your vibe, your adventure."
- CTA: "Plan my escape →"
- Nav links: DESTINATIONS, HOW IT WORKS, PRICING, SIGN IN
- Colors: white text on dark/video bg, same liquid-glass effect
- Video: Keep the CloudFront travel video URL from template
- Font: Barlow (body) + Inter (headings) — same as template
- Bottom row icon: lock icon + "AI-SECURED. ZERO DATA LEAKS."

## Files to create/update:
- `src/components/HeroClient.tsx` — full viewport hero with video bg + GSAP
- `src/app/globals.css` — add liquid-glass utility class

## Implementation notes:
- Remove TripDashboard from below hero (move to /app route)
- Hero should be full screen on landing
- Keep FloatingChatWrapper
- Add npm deps: gsap (already in most projects)
