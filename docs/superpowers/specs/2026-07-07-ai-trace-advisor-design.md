# AI Trace Fixer — Design Spec

**Date:** 2026-07-07
**Status:** APPROVED — ready for implementation plan (supersedes earlier "AI Trace Advisor" dashboard draft below the fold)

## Problem

Token waste in Claude Code sessions is now diagnosable — CodeBurn's `optimize` command, installed and run locally 2026-07-07, produced a real report against this machine's history: **F grade (20/100), 199 sessions, $372.53 spent, ~$114.54 (31%) identified as recoverable**, across 12 findings (unused MCP servers loaded into every system prompt, low-delivery expensive sessions, context-heavy sessions with 100:1+ input-to-output ratios, and more).

The gap is not detection — CodeBurn already detects and explains well, for free, locally, with real numbers. The gap is **remediation**: every finding ends in a copy-paste command or a manual instruction. Nothing reads the diagnosis and safely applies the fix for you.

## Market context (researched + hands-on verified 2026-07-07)

- **CodeBurn** (`getagentseal/codeburn`, installed globally via `npm i -g codeburn`) ships: zero-SDK local `.jsonl` tailing across 31 tools, macOS menu-bar app (`codeburn menubar`, installed and running), localhost dashboard, `optimize` (diagnosis + estimated savings), `context` (per-session token breakdown), `yield` (spend vs shipped-code correlation), `compare`, `devices` (cross-machine), and an MCP server exposing usage data to agents. This is mature and does more than the original spec assumed — confirmed by running it directly, not just reading about it.
- **ccusage** (also installed globally): CLI-only cost/token reports (`ccusage daily`, etc.), narrower, no dashboard.
- **Verdict from hands-on use:** building a competing dashboard/menu-bar/SQLite store now would duplicate a tool that already works well on this machine's real data. That plan is abandoned.
- **Confirmed open gap:** nothing takes a diagnosis (CodeBurn's or otherwise) and turns it into an applied, reviewable fix. Every existing tool stops at "here's the command to run" — the user still does the work.

## Decision

Pivot from "build our own monitoring dashboard" to **AI Trace Fixer**: a Claude Code skill (`/fix-tokens`) that consumes CodeBurn's structured findings and produces real diffs/actions the user reviews and approves — the step CodeBurn and every peer tool stops short of.

## Confirmed schema (captured 2026-07-07 from real `codeburn optimize --format json --period all` output, fixture saved at `/tmp/codeburn-optimize-full.json`)

Each finding includes a `fix` object of one of two shapes:
- `{type: "command", label, text}` — a shell command that would remediate the finding (e.g. `claude mcp remove <server>`, moving/archiving unused skill files)
- `{type: "paste", destination, label, text}` — text meant to be pasted into a file (e.g. CLAUDE.md, shell rc file) — `destination` names the target file/section

This means the fixer does not need to guess intent per finding category — it dispatches on `fix.type`:
- `command` → show a before/after diff of the affected config (e.g. `settings.json` with the MCP entry removed) → run the command on approval
- `paste` → show a diff of `destination` with `text` inserted → write the file on approval

## Goals (v1)

1. **Ingest findings** — parse `codeburn optimize --format json` output (primary source; CodeBurn already computes this well, no need to re-derive it). Support a fallback light-parser of raw `.jsonl` history for the subset of checks needed if CodeBurn is ever unavailable, but do not duplicate its full engine.
2. **Apply both fix types, same approval gate** — both `command` and `paste` findings are actioned by the fixer (not just one subset). Every finding CodeBurn can express as a fix gets a corresponding diff in our tool. Findings without a `fix` object (judgment calls, e.g. low-delivery expensive sessions) are surfaced as report-only, never auto-actioned.
3. **Approval gate (hard requirement)** — every fix is shown as a diff first. Nothing is applied without explicit per-fix user confirmation (`y`/`n`/`a`-for-remaining). This follows the same irreversible-action discipline already in place for this environment (destructive/config-changing actions require confirmation).
4. **Re-verify** — after applying approved fixes, re-run `codeburn optimize` and show the before/after health score delta, so the user sees the fix actually worked.
5. **Delivered as a Claude Code skill (`/fix-tokens`)** — not a standalone npm CLI. Fits the existing workflow (same pattern as other skills already invoked in this environment: `/review`, `/investigate`, etc.), no separate tool to remember, no extra install step beyond the skill file itself. Skill body: run `codeburn optimize --format json`, parse findings, walk the user through each fixable finding's diff, apply approved ones, re-verify, report score delta — all inline in the current session.
6. **Lightweight SessionStart nudge (secondary, optional)** — a hook (same mechanism as the existing graphify/memory/caveman hooks already firing in this environment) that runs a **cheap, cached** check (not a full optimize scan every session) and prints one line if unapplied fixes exist: `"3 auto-fixable token-waste issues found — run /fix-tokens to review."` Full scans stay on-demand via the skill, not on every session start, so it never adds latency.

## Non-goals (v1)

- Rebuilding a dashboard, menu-bar app, or SQLite event store — CodeBurn already covers this well; do not duplicate.
- Re-implementing CodeBurn's full diagnostic engine — depend on its JSON output as the primary data source.
- Auto-applying anything without a shown diff and explicit approval — no exceptions, matches this environment's standing rule on risky/irreversible actions.
- Judgment calls on "was this session worth its cost" — surfaced as information only, never auto-actioned.
- Non-macOS platforms, tools beyond what CodeBurn already covers.
- Browser-based AI (ChatGPT web, Claude.ai) capture.

## Architecture

```
┌───────────────────┐
│ codeburn optimize   │  existing tool, already installed,
│ --format json       │  does the diagnosis — we don't rebuild this
└─────────┬───────────┘
          │ findings JSON
          ▼
┌───────────────────┐
│ Finding Parser      │  normalizes CodeBurn's JSON into typed
│                     │  Finding[] (category, evidence, fixability)
└─────────┬───────────┘
          ▼
┌───────────────────┐      ┌──────────────────────┐
│ Fix Generators      │─────▶│ Fixable finding types  │
│ (one per category)  │      │ → diff generators       │
└─────────┬───────────┘      └──────────────────────┘
          ▼
┌───────────────────┐
│ Diff Presenter       │  shows unified diff per fix,
│ + Approval Gate      │  waits for explicit y/n per fix
└─────────┬───────────┘
          ▼ (approved fixes only)
┌───────────────────┐
│ Applier              │  writes approved changes to
│                     │  settings.json / CLAUDE.md / etc.
└─────────┬───────────┘
          ▼
┌───────────────────┐
│ Re-verify            │  re-runs codeburn optimize,
│                     │  reports health-score delta
└───────────────────┘

┌───────────────────┐
│ SessionStart hook    │  cheap cached check, one-line nudge,
│ (separate, cron-like)│  never blocks, never runs full scan
└───────────────────┘
```

## Components

### 1. Finding Parser
- Shells out to `codeburn optimize --format json --period 30days`, parses into a typed `Finding` list: `{id, category, severity, evidence, estimatedSavings, fixable: boolean, suggestedCommand?: string}`.
- Categories seen in real output (2026-07-07 run): unused/low-coverage MCP servers, low-delivery expensive sessions, context-heavy sessions. Fix generators are built per-category, starting with the ones confirmed fixable (MCP server removal, CLAUDE.md trims) and explicitly excluding judgment-based categories (low-delivery sessions).

### 2. Fix Generators
- **MCP server removal**: reads `~/.claude/settings.json`, for each low-coverage server CodeBurn flags, generates a diff removing or commenting out that server's entry. Never removes a server the user has referenced elsewhere without flagging the conflict first.
- **CLAUDE.md trim**: detects duplicated/bloated instruction blocks (heuristic: near-identical paragraphs, or sections CodeBurn's context-heavy finding traces back to specific repeated content), proposes a condensed version as a diff.
- **Context-heavy session guidance**: not a config change — proposes a one-line addition to the project's CLAUDE.md (e.g. a "read via graphify/serena first" reminder, following the exact pattern this repo's own CLAUDE.md already uses for graphify) when the pattern recurs across 3+ sessions for the same project.
- Each generator is a pure function: `Finding → Diff | null` (null = not auto-fixable, surfaced as report-only).

### 3. Diff Presenter + Approval Gate
- CLI prints each proposed diff (unified diff format) one at a time with estimated savings attached.
- Explicit per-fix approval (`y`/`n`/`a` for all remaining) — never a blanket "apply all" default.
- Matches the standing rule in this environment: config/settings changes are the kind of action that needs confirmation, not silent execution.

### 4. Applier
- Only touches files for approved fixes.
- Writes via the same Edit-style targeted change pattern used elsewhere in this codebase — full-file overwrite only when the whole file is being intentionally regenerated (e.g. a full CLAUDE.md rewrite), never a blind overwrite of an unreviewed diff.

### 5. Re-verify
- Re-runs `codeburn optimize --format json` after applying fixes, diffs the health score/potential-savings numbers against the pre-fix run, reports the delta to the user.

### 6. SessionStart Nudge (lightweight, separate concern from the fixer)
- Hook wired into `~/.claude/settings.json`, same mechanism as existing graphify/memory hooks.
- Runs a cached check (last full scan's fixable-count, refreshed at most once/day, not per session) — prints a single line only if unresolved fixable findings exist.
- Must fail silently and add negligible latency (<100ms) — it reads a small cache file, it does not shell out to `codeburn optimize` on every session start.

## Data flow & privacy
Everything local. Fix generation and diff review happen entirely on-machine. No prompt/file content leaves the machine. Depends on CodeBurn's local JSON output as input; no new telemetry.

## Testing
- Unit tests per fix generator against fixture `Finding` objects (known input → expected diff, or `null` for non-fixable categories).
- Integration test: run against this machine's real `codeburn optimize --format json` output, confirm findings parse, confirm at least the MCP-removal fix generates a correct diff against a sample `settings.json`.
- Manual verification: approve one real fix (e.g. remove one confirmed-unused MCP server from this machine's own settings.json, with explicit user sign-off before doing so), re-run optimize, confirm health score improves.

## Open questions for implementation phase
- Whether CLAUDE.md/paste-type trim fixes need a size/diff-risk threshold (e.g. refuse to auto-propose a trim >50% of file) to avoid overly aggressive rewrites — resolve during implementation by capping proposed diffs and always requiring per-fix approval regardless of size.
- Whether to also support ccusage as an alternate data source, or treat CodeBurn as the sole required dependency for v1 (leaning: CodeBurn only for v1, since it's the only one with a structured findings+fix-command output — schema now confirmed above).

## Resolved (no longer open)
- ~~JSON schema of `codeburn optimize --format json`~~ — captured and documented above from a real run against this machine's history.
- ~~Which fix types v1 handles~~ — both `command` and `paste`, same approval-gated flow.
- ~~Primary UX surface~~ — Claude Code skill (`/fix-tokens`), not a standalone CLI.

---

## Superseded draft (kept for reference, not implemented)

The original plan below was to build a competing local dashboard (log watcher, SQLite store, live dashboard, menu-bar app, SessionStart pre-flight advisor). This was abandoned after hands-on testing showed CodeBurn already does this well. Kept here only so the earlier research/reasoning isn't lost.

- Log Watcher (chokidar tail on Claude Code + Cursor logs) → SQLite store → Rule Engine (5 heuristics: repeated reads, no `/clear`, full-file reads, repeated subagent dispatch, low tool-use ratio) → SessionStart hook banner + Localhost Next.js dashboard + SwiftBar-style menu-bar app.
- Abandoned because: CodeBurn already ships all of this, cross-tool, free, mature, verified working against real data on this machine.
