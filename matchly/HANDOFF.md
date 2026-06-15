# HANDOFF — Matchly: new project (tournament organizer for local leagues)
**Date:** 2026-06-15  **Status:** SCOPED — awaiting go-ahead before scaffold

## Goal
Modern, free, instant-setup tournament microsite for local amateur leagues (gully cricket,
corporate sports days, school tournaments). Generic match/points-table engine, cricket as
flagship vertical (overs/wickets/NRR). Public shareable URL, no app install, WhatsApp-native
score updates.

## Research done (§0 — complete)
- Competitors checked: CricClubs, CricHQ, CricHeroes, CrickHeroes/LeagueLink/Crickslab/GullyBall,
  TeamSnap/LeagueApps/Playpass, Cricbuzz/ESPNcricinfo (UI reference only)
- Key insight: every cricket tool is mobile-app-first, single-sport, dated UI (2012-era).
  No instant shareable public tournament microsite, multi-sport, zero-signup for spectators.
- Differentiators:
  1. Instant shareable tournament URL (`matchly.app/diwali-premier-league`) — paste in WhatsApp,
     spectators follow live without app install
  2. No-app score updates — organizer/scorer updates via mobile web form, public page auto-refreshes
  3. Multi-sport templates, sport-specific scoring logic (cricket/football/badminton/kabaddi),
     unified points table across sports for corporate sports-day events

## Naming
- **Matchly** — checked against full portfolio list, no collision. Domain to verify: matchly.app

## Design identity (research-driven, no portfolio collision)
| Bg | Accent | Layout | Demo panel |
|---|---|---|---|
| `#0c1410` deep forest green-black | `#22c55e` grass green | Split `lg:grid-cols-2` — left: hero + sport-switcher tabs (Cricket/Football/Badminton/Kabaddi) + CTA; right: live demo | Live scorecard ticker — overs incrementing (12.3→12.4→12.5), runs +4 flash animation, points table rows reordering on match complete, live commentary feed scrolling. Mobile: snap-scroll strip (scorecard → points table → fixtures) |

Hero headline: "Your league. Live. In 2 minutes."
Tagline: "Free tournament sites for gully cricket, corporate leagues, and school sports days —
fixtures, live scores, and points tables your WhatsApp group will actually click on."

## Architecture decision
- Generic core: match/team/fixture/points-table data model, sport-agnostic
- Cricket vertical module: overs, wickets, run-rate, NRR, scorecards (deepest at launch)
- Other sports (football/badminton/kabaddi): generic score + points table via same engine,
  shallower at launch, same UI shell

## Steps (not started — pending go-ahead)
- [x] §0 Research
- [x] §1 HANDOFF written (this file)
- [ ] §2 Design pass — `/design-shotgun` → `/canvas-design` → `/emil-design-eng` → `/animate`
- [ ] Scaffold project from `ai-platform-template`
- [ ] Data model: Tournament, Team, Match, PointsTableRow (Postgres/Neon, per §15/§20 — no hardcoded data)
- [ ] Core flows: create tournament (no auth, freemium), public tournament page, score-update form
- [ ] Cricket scoring module: overs/wickets/run-rate/NRR/scorecard
- [ ] Generic scoring module: football/badminton/kabaddi (points table only)
- [ ] Chatbot — Groq llama-3.1-8b-instant, scoped to "tournament setup & scoring help"
- [ ] Rate limiting (§14) on all AI/score-update endpoints
- [ ] §4 Build passes
- [ ] §5 Playwright screenshots 375px + 1280px
- [ ] §6 Commit + push, link Vercel (sivaprakasam scope per Vercel Account Policy)
- [ ] §8 Memory + hub update

## Resume from here if interrupted
Scope agreed with user (sport-agnostic core, cricket flagship). Waiting for go-ahead to scaffold.
Next: confirm with user, then `npx create-next-app` from ai-platform-template pattern, run
`/design-shotgun` for hero direction.
