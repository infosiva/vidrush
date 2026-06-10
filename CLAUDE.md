# agents/ — Project Standards

## MANDATORY: Load project-update-wave skill first

**Before ANY work in this directory:**

```
/project-update-wave
```

This skill is the single source of truth for ALL portfolio standards. It covers:
- §0  Research gate (competitor check before impl)
- §1  HANDOFF.md (write before first line of code)
- §2  UI design (Canvas → Open Design → Emil → Animate pipeline)
- §3  Chatbot (mobile bottom-sheet, llama-3.1-8b-instant, createChatRoute, useFingerprint, scope enforcement, attractive-taste gate)
- §4  Build gate (npm run build must pass)
- §5  Playwright screenshots (375px + 1280px before push)
- §6  Commit hygiene (specific files, info.siva@gmail.com)
- §7  Push sequence
- §8  Memory + HANDOFF update
- §9  Project map
- §10 Failure modes
- §11 Vercel env (OLLAMA_HOST never pushed)
- §12 Token minimisation (graphify, claude-mem, Canvas)
- §13 Feature flags (Edge Config, lib/flags.ts)
- §14 Security (.env never in git, rate limiting on every AI endpoint)
- §15 AI model cascade (Ollama → Groq → Gemini → Cerebras → Together → OpenRouter → Mistral → NVidia NIM → Kimi → DeepSeek → OpenAI → Anthropic)
- §16 Auth scope (gate actions not browsing, NextAuth v5, freemium pattern)

**Do NOT skip this skill.** Every rule above is enforced by it.

## Projects in this directory

| Dir | URL | Repo |
|-----|-----|------|
| agenttrace/apps/dashboard | agentlogs.app | infosiva/agenttrace |
| speakiq | speakiq.app | infosiva/speakiq |
| resumevault | resumevault.app | infosiva/resumevault |
| draftcal | draftcal.app | infosiva/draftcal |
| trackwealth | trackwealth.app | infosiva/trackwealth |
| roamplan | roamplan.app | infosiva/roamplan |
| worldtrends | worldtrends.today | infosiva/worldtrends |
| kwizzo | kwizzo.app | infosiva/kwizzo |
| myvitals | myvitals.app | infosiva/myvitals |
| aicoachlab | aicoachlab.app | infosiva/aicoachlab |
| neuralos | neuralagent.app | infosivas-projects/neuralos |
| pixelforge | arcadeforge.app | infosiva/pixelforge |

## MANDATORY: Secret Prevention Rules — NO EXCEPTIONS

**These rules are permanent. Violations = secrets in public git history. That already happened once.**

### Never commit these file types
```
.env / .env.* / *.env
client_secrets.json
credentials.json
service_account*.json
token_*.pickle / *.pickle
*.pem / *.p12 / *.pfx
*_key.json
```

### Never hardcode secrets as fallback defaults
```typescript
// BANNED — token exposed if file is committed
const TOKEN = process.env.API_KEY || 'sk-real-value-here';

// REQUIRED — fail loudly, never silently use hardcoded value
const TOKEN = process.env.API_KEY || '';
```

### Before every `git add` — mental checklist
1. Does any staged file contain an API key, token, password, or OAuth secret?
2. Does any staged file match the blocked patterns above?
3. Does any new `const X = process.env.Y || 'hardcoded'` exist?

If yes to ANY → do not commit. Fix first.

### Pre-commit hook is active at `.git/hooks/pre-commit`
It scans filenames AND diff content for: `gho_`, `ghp_`, `GOCSPX-`, `sk-ant-`, `gsk_`, `vcp_` patterns.
If hook fires → stop, fix, re-stage.

### History purge (when a secret leaks anyway)
```bash
# Remove file from ALL history + force push
git filter-repo --path path/to/secret.json --invert-paths
git push --force-with-lease origin main
# Then rotate the exposed credential immediately
```

### CLAUDE.md and AGENTS.md must never contain real tokens
Document token FORMAT only (e.g. `gho_...36chars`), never actual values.

## Git identity (always)
```bash
git config user.email "info.siva@gmail.com"
git config user.name "Siva"
```
