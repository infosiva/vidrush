# HANDOFF — 2026-06-02 Session
**Status:** COMPLETE — all tasks done, no active work in progress

## Completed this session

### AICoachLab v2 — FULLY LIVE at aicoachlab.app
- /learn — type any topic, Groq generates full lesson, stored in Neon DB
- /tracks — was 404 (never committed), now live
- /interview — sticky nav, role+mode summary strip before launch
- /learn/[slug]/[lesson] — SlidePlayer (concept/code/quiz/carousel), chatbot overlay
- Free AI chain: Groq → NVIDIA NIM → Gemini (no paid APIs)
- DB: Neon auto-creates `acl_topics` + `acl_topic_progress` on first request
- Voice: ElevenLabs wired (ELEVENLABS_API_KEY in Vercel)
- Nav consistent across all 4 pages (landing/interview/tracks/learn)
- Curriculum role cards clickable → /interview?role=X

### Site-Watchdog (VPS)
- Removed 4 non-owned sites from monitoring (etseyscribe etc.)
- Alert repeat cooldown: 30min → 24h

### Vercel Cleanup
- Deleted: flightbrain-story-mode, ninjapa, ninjapa-landing projects
- Fixed vulnerability warnings: upgraded Next.js 15→16 in clawdbotai/ai-resume-screener/ai-social-content/idea-agent

### Infrastructure
- goose v1.36.0 installed at /opt/homebrew/bin/goose
- Groq key rotated to: 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
- Vercel personal token saved: vcp_4SpI0nb3BzOaNT9E8XCHudrFsMxcE3xUlJwDqr2uwTZU5fDB1F4cuRkK

## Pending / Next session

| Priority | Task |
|----------|------|
| 🔴 | Get Gemini API key per-project (aistudio.google.com) — shared key quota'd |
| 🔴 | Rotate Gemini/Cerebras/Google keys (security incident still open) |
| 🟡 | ClipForge — add FAL_KEY to deploy |
| 🟡 | outreach-crm — RESEND_API_KEY + Google OAuth redirect URI |
| 🟡 | goose — add GROQ_API_KEY to ~/.zshrc so it works without env prefix |
| 🟢 | Vercel infosiva personal account cleanup — token saved, verify no orphan projects |
