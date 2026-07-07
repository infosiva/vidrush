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

Pivot from "build our own monitoring dashboard" to **AI Trace Fixer**: a CLI/agent tool that consumes optimize-style findings and produces real diffs/actions the user reviews and approves — the step CodeBurn and every peer tool stops short of.

## Goals (v1)

1. **Ingest findings** — parse `codeburn optimize --format json` output (primary source; CodeBurn already computes this well, no need to re-derive it). Support a fallback light-parser of raw `.jsonl` history for the subset of checks needed if CodeBurn is ever unavailable, but do not duplicate its full engine.
2. **Map findings to fixes** — for each fixable finding type, generate a concrete, inspectable change:
   - Unused/low-coverage MCP servers → diff against `~/.claude/settings.json` removing or scoping the server entry (mirrors the `claude mcp remove` commands CodeBurn already prints, but applied as a reviewable diff rather than a command the user must run themselves)
   - Bloated CLAUDE.md / repeated-instruction sections → proposed trimmed version with a diff, never silent rewrite
   - Context-heavy session pattern (same file re-read, no `/clear` used, stale carryover) → proposed addition to project CLAUDE.md or a session-scoped reminder, e.g. "graphify-first" note already present in this repo's CLAUDE.md as a working example of the fix this tool would propose elsewhere
   - Low-delivery expensive sessions → not auto-fixable (needs human judgment), so this finding type is surfaced as a flagged report only, never auto-actioned
3. **Approval gate (hard requirement)** — every fix is shown as a diff first. Nothing is applied without explicit user confirmation. This follows the same irreversible-action discipline already in place for this environment (destructive/config-changing actions require confirmation).
4. **Re-verify** — after applying approved fixes, re-run `codeburn optimize` and show the before/after health score delta, so the user sees the fix actually worked.
5. **Lightweight SessionStart nudge** — a hook (same mechanism as the existing graphify/memory/caveman hooks already firing in this environment) that runs a **cheap, cached** check (not a full optimize scan every session) and prints one line if unapplied fixes exist: `"3 auto-fixable token-waste issues found — run 'aitrace fix' to review."` Full scans stay on-demand (`aitrace fix`), not on every session start, so it never adds latency.

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
- Exact JSON schema of `codeburn optimize --format json` output needs to be captured from a real run and documented (do this as implementation step 1, using the output already captured on 2026-07-07 as the reference fixture).
- Whether CLAUDE.md trim fixes need a size/diff-risk threshold (e.g. refuse to auto-propose a trim >50% of file) to avoid overly aggressive rewrites.
- Whether to also support ccusage as an alternate data source, or treat CodeBurn as the sole required dependency for v1 (leaning: CodeBurn only for v1, since it's the only one with a structured findings+fix-command output).

---

## Superseded draft (kept for reference, not implemented)

The original plan below was to build a competing local dashboard (log watcher, SQLite store, live dashboard, menu-bar app, SessionStart pre-flight advisor). This was abandoned after hands-on testing showed CodeBurn already does this well. Kept here only so the earlier research/reasoning isn't lost.

- Log Watcher (chokidar tail on Claude Code + Cursor logs) → SQLite store → Rule Engine (5 heuristics: repeated reads, no `/clear`, full-file reads, repeated subagent dispatch, low tool-use ratio) → SessionStart hook banner + Localhost Next.js dashboard + SwiftBar-style menu-bar app.
- Abandoned because: CodeBurn already ships all of this, cross-tool, free, mature, verified working against real data on this machine.
