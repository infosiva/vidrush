# AI Trace Advisor — Design Spec

**Date:** 2026-07-07
**Status:** APPROVED — ready for implementation plan

## Problem

Developers using Claude Code / Cursor burn tokens without visibility into waste patterns (repeated file reads, unbounded chat history, redundant subagent calls) until the bill or context limit hits. Existing tools (CodeBurn, ccusage, Claude-Code-Usage-Monitor) show *what was spent* after the fact. None of them tell you, automatically, *before you start working*, what to change.

## Market context (researched 2026-07-07)

- **CodeBurn** (`getagentseal/codeburn`) already ships: zero-SDK local `.jsonl` tailing across 31 tools (Claude Code, Cursor, Codex, Gemini, Grok), a macOS menu-bar app (SwiftBar), a localhost live dashboard, and an `optimize` command that retrospectively grades your setup and estimates savings. This is mature, free, open-source.
- **ccusage**, **Claude-Code-Usage-Monitor**: CLI-only cost/token reports, narrower scope, no dashboard/menu-bar.
- **Gap confirmed**: nothing fires automatically at session start, before the first prompt, to recommend specific token-saving tools/plugins based on recent history and project state. CodeBurn's `optimize` is the closest analog but is manual/on-demand, not hook-triggered.

**Decision:** Build a full standalone product (own brand, own dashboard/menu-bar/pre-flight), accepting CodeBurn as an established competitor on 2 of 3 feature pillars. Differentiate by leading with the pre-flight advisor as the hero feature, and executing dashboard/menu-bar/retrospective to parity or better.

## Goals

1. **Pre-flight advisor** — automatic recommendation at the start of every Claude Code session (SessionStart hook), before the user types a prompt, based on recent session history for the project.
2. **Live dashboard** — localhost web app showing real-time token burn across Claude Code + Cursor sessions.
3. **Menu-bar glance** — macOS menu-bar indicator for live burn rate, click-through to dashboard.
4. **Retrospective report** — per-session waste score + specific fix + estimated savings, using the same rule engine as the pre-flight advisor.

## Non-goals (v1)

- Browser-based AI (ChatGPT web, Claude.ai) capture via proxy/MITM
- LLM-based waste explainer (rule engine only, deterministic)
- Multi-machine / team aggregation
- Auto-applying fixes (recommend only, never mutate user's config automatically)
- Non-macOS platforms
- Tools beyond Claude Code + Cursor in v1

## Architecture

```
┌─────────────────┐
│ Log Watchers     │  chokidar tail on:
│ (file tailers)   │  ~/.claude/projects/*/*.jsonl (Claude Code)
└────────┬─────────┘  Cursor local session store
         │ parsed events (tokens in/out, tool calls, file reads, timestamps)
         ▼
┌─────────────────┐
│ SQLite store     │  local-only, append-only event log
│ (better-sqlite3) │  no prompt content leaves the machine
└────────┬─────────┘
         │
    ┌────┴──────────────┐
    ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│ Rule Engine   │──▶│ Plugin Catalog    │  curated table: graphify,
│ (heuristics)  │   │ (JSON/TS table)   │  claude-mem, serena, /clear,
└──────┬────────┘   └──────────────────┘  offset/limit reads, caching
       │
       ├──────────────────────┬─────────────────────┐
       ▼                      ▼                      ▼
┌─────────────┐      ┌────────────────┐      ┌───────────────┐
│ SessionStart │      │ Localhost       │      │ Menu-bar       │
│ hook script  │      │ dashboard        │      │ (SwiftBar-style│
│ (pre-flight) │      │ (live + retro)   │      │ .1m.sh plugin) │
└─────────────┘      └────────────────┘      └───────────────┘
```

## Components

### 1. Log Watcher
- Node/TS service using `chokidar` to tail `~/.claude/projects/*/*.jsonl` (append-only, one JSON object per line — same format the existing graphify/memory hooks already parse).
- Cursor: locate its local session store (path TBD during implementation — investigate actual file location as first implementation step), parse equivalent fields.
- Extracts: timestamp, project path, input/output/cached token counts, tool calls made, file paths read, subagent dispatches.
- Writes normalized events to SQLite.

### 2. SQLite Store
- Single local file, e.g. `~/.aitrace/store.db`.
- Tables: `sessions`, `events` (one row per turn/tool-call), `waste_flags` (rule engine output, cached).
- Append-only for events; waste_flags recomputed per session close.

### 3. Rule Engine (v1 heuristics — deterministic, no LLM)
| Pattern detected | Recommendation | Est. savings basis |
|---|---|---|
| Same file `Read` >2x in a session | Use graphify/serena symbol lookup instead of repeated full reads | % of tokens spent on repeat reads |
| Session >N turns with no `/clear` and growing history | Enable claude-mem or manual `/clear` | % of tokens in resent history |
| Full-file `Read` when a function/symbol was the actual target | Use offset+limit or serena `find_symbol` | tokens saved per avoided full read |
| Repeated near-identical subagent dispatch (same description/prompt shape) | Cache/reuse prior agent result | tokens of duplicated dispatch |
| High ratio of no-tool-use "conversation" turns vs tool-use turns | Tighten prompts / batch requests | est. from CodeBurn's published finding (56% waste case) as a directional benchmark, not copied logic |

Each rule outputs: `{pattern, evidence (event ids), recommended_tool, estimated_savings_pct}`. Plugin catalog is a static TS/JSON table mapping recommended_tool → install/enable instructions.

### 4. Pre-flight Advisor (hero feature)
- Implemented as a `SessionStart` hook, wired into `~/.claude/settings.json` exactly like the existing graphify/memory/caveman hooks already firing in this environment.
- On fire: queries SQLite for this project's last N sessions, runs rule engine if not already cached, prints a banner:
  ```
  === AI TRACE ADVISOR ===
  Project: agents/kwizzo — last 3 sessions avg 40k tokens
  Top waste: repeated reads of ConversationMode.tsx (6x) — 55% of turn cost
  Recommendation: enable graphify query before Read on this file
  === END ===
  ```
- Must be fast (<200ms) and fail silently if store is empty/missing — never block session start.

### 5. Localhost Dashboard
- Next.js app (matches portfolio convention), `npm run dev` on a local port, reads SQLite directly (no auth needed — localhost only).
- Views: live burn (current running sessions), session list with waste score, per-session retrospective detail (same rule engine output as pre-flight, rendered visually), plugin catalog reference page.

### 6. Menu-bar App
- SwiftBar-style approach (same mechanism CodeBurn uses) — a `.1m.sh` script SwiftBar polls every minute, no native Swift app needed for v1.
- Shows current burn rate / today's token total, click opens dashboard in browser.

## Data flow & privacy
Everything local. No prompt content or file contents leave the machine. SQLite lives in `~/.aitrace/`. No network calls except the dashboard serving to `localhost`.

## Testing
- Unit tests for rule engine heuristics against fixture `.jsonl` transcripts (known waste patterns → expected recommendation output).
- Manual verification: point watcher at real `~/.claude/projects/` history, confirm dashboard renders real sessions, confirm SessionStart hook fires correctly on next Claude Code session.

## Open questions for implementation phase
- Exact Cursor session log file location/format (needs investigation as step 1).
- Whether SwiftBar itself needs to be a prerequisite install, or bundle an equivalent lightweight poller.
