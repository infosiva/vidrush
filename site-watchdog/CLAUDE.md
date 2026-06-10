# Site Watchdog — Agent Context

## What This Project Is
An autonomous agent that cycles through all monitored websites (one per day),
analyses each site, applies improvements, reviews them, deploys via git push,
and sends Telegram notifications with before/after screenshots.

## Dashboard URL
**http://31.97.56.148:3099**

## VPS Details
- Host: `31.97.56.148`
- User: `root`
- Password: `Sivaprakasam@1981`
- Connect: `sshpass -p 'Sivaprakasam@1981' ssh -o StrictHostKeyChecking=no root@31.97.56.148`
- Watchdog location: `/root/site-watchdog/`

## Schedule
- Runs daily at **8 AM UTC** via cron
- Rotates sequentially through all 5 sites (one per day)
- Manual trigger: click "▶ Run Now" on dashboard OR `cd /root/site-watchdog && npm start`

## Tech Stack
- **Runtime**: Node.js + TypeScript (tsx)
- **Process Manager**: PM2 (dashboard process)
- **AI Providers**: Groq (primary, free) → Gemini (fallback) → Anthropic (paid last resort)
- **Screenshots**: Playwright + bundled Chromium
- **Notifications**: Telegram Bot API
- **Deployment**: git push → GitHub → Vercel auto-deploy

## Key Files
| File | Purpose |
|------|---------|
| `src/index.ts` | Main orchestrator pipeline |
| `src/analyzer.ts` | AI site analysis |
| `src/improver.ts` | AI code improvement generation |
| `src/reviewer.ts` | AI review/approval agent |
| `src/deployer.ts` | git push → GitHub → Vercel deploy |
| `src/tester.ts` | Post-deploy health checks |
| `src/notifier.ts` | Telegram notifications |
| `src/screenshotter.ts` | Playwright screenshots |
| `src/dashboard.ts` | Dashboard HTTP server (port 3099) |
| `src/ai.ts` | Unified AI client with fallback chain |
| `src/tokenManager.ts` | Auto-rotate API keys on exhaustion |
| `websites.config.json` | Site registry with paths and focus areas |
| `state.json` | Run history + current run state |
| `.env` | API keys (Groq, Gemini, Anthropic, Telegram) |

## Pipeline Stages
1. **Screenshot BEFORE** — Playwright captures current site
2. **Analyze** — AI scores site and finds issues
3. **Improve** — AI generates code changes
4. **Review** — Second AI validates changes (must score ≥70)
5. **Deploy** — git add → commit → push origin main → Vercel
6. **Screenshot AFTER** — Captures deployed site
7. **Test** — HTTP checks, meta tags, OG tags, content size
8. **Notify** — Telegram message with before/after screenshots

## Monitored Sites
| ID | Name | URL | Focus |
|----|------|-----|-------|
| clawdbotai | ClawdBot AI Showcase | https://clawdbotai.tech | seo, monetization, adsense, user-engagement |
| quicktech | QuickTech AI | https://quicktechai.app | youtube-cta, seo, monetization, subscriber-growth |
| quizbytesdaily | QuizBytes Daily | https://quizbytes.dev | seo, viral-sharing, user-retention, monetization |
| worldtrends | World Trends | https://worldtrends.today | seo, trending-content, adsense, social-sharing |
| ai-jobs-portal | AI Jobs Portal | https://www.aijobsportal.app | seo, job-listings, email-capture, monetization |

## Telegram
- Bot Token: in `.env` as `TELEGRAM_BOT_TOKEN`
- Chat ID: in `.env` as `TELEGRAM_CHAT_ID`
- Bot: sends success/failure/review-failed/no-changes notifications

## GitHub Credentials
- Token: set as `GITHUB_TOKEN` env var in VPS `.env` — never hardcode
- User: `infosiva`
- All repos cloned to `/root/agents/` on VPS

## Environment Variables (.env)
```
GROQ_API_KEY=gsk_...        # Primary AI (free, 100K tokens/day)
GEMINI_API_KEY=AIza...      # Fallback AI (free)
ANTHROPIC_API_KEY=sk-ant... # Last resort (paid)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=8452559091
VERCEL_TOKEN=...            # Optional - for deploy status polling
DRY_RUN=false               # Set to true to skip actual deploy
```

## What NOT to Change
- Do not change the pipeline stage order in `src/index.ts`
- Do not remove `state.currentRun` updates — dashboard reads this for live view
- Keep `DRY_RUN` support in `deployer.ts`
- The Chromium path for Playwright is bundled at `~/.cache/ms-playwright/`
