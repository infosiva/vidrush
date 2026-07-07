# AI Trace Fixer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/fix-tokens`, a Claude Code skill that parses `codeburn optimize --format json`, shows a diff per fixable finding, applies only approved fixes (both `command` and `paste` types), then re-verifies the health-score delta — plus a lightweight, hard-rule-enforced SessionStart nudge so this actually gets run often, not just once.

**Architecture:** Pure-function pipeline: Finding Parser (raw CodeBurn JSON → typed `Finding[]`) → Fix Generators (per-category `Finding → Diff | null`, dispatching on `fix.type`) → Diff Presenter + Approval Gate (CLI walk, y/n/a) → Applier (writes only approved) → Re-verify (re-run optimize, report delta). All logic lives in plain Node scripts under `agents/scripts/fix-tokens/`, invoked from the skill body — no new service, no daemon, no database.

**Tech Stack:** Node.js (already the toolchain used by `agents/scripts/visual-qa.mjs` and `agents/scripts/e2e-verify.mjs`), zero new npm dependencies (uses built-in `child_process`, `fs`, `readline`), CodeBurn CLI (`codeburn`, already installed globally) as the sole external dependency.

## Global Constraints

- Every fix is shown as a diff before being applied — no exceptions, no blanket "apply all" default (spec §Approval gate, hard requirement).
- Both `fix.type: "command"` and `fix.type: "paste"` findings are actioned under the same approval gate (spec Goal 2).
- Findings without a `fix` object are report-only, never auto-actioned (spec Goal 2).
- Delivered as a Claude Code skill (`/fix-tokens`), not a standalone npm CLI (spec Goal 5).
- SessionStart nudge must be cached, <100ms, must never shell out to `codeburn optimize` on every session start (spec Goal 6) — but per the user's latest instruction, this nudge is now a **hard, enforced rule** wired into `~/.claude/settings.json` hooks and documented as a permanent CLAUDE.md rule, not an optional/secondary feature.
- No re-implementation of CodeBurn's diagnostic engine (spec Non-goals).
- No new telemetry; everything stays local (spec Data flow & privacy).
- Confirmed schema (from real fixture `/tmp/codeburn-optimize-full.json`, captured 2026-07-07): each finding has `{title, explanation, severity, trend, tokensSaved, estimatedSavingsUSD, fix?}`. `fix` is either `{type:"command", label, text}` or `{type:"paste", destination, label, text}` where `destination` is `"session-opener"` or `"claude-md"` (seen values) — `"session-opener"` is not a file, it's a one-time paste instruction the user pastes at the top of their next thread; `"claude-md"` targets the project's `CLAUDE.md`.

---

## File Structure

```
agents/scripts/fix-tokens/
  parse-findings.mjs       # Task 1 — Finding Parser
  fix-generators.mjs       # Task 2 — one function per category, dispatches on fix.type
  diff-presenter.mjs       # Task 3 — unified diff rendering + approval gate (readline y/n/a)
  applier.mjs               # Task 4 — writes approved fixes to disk / runs approved commands
  reverify.mjs              # Task 5 — re-run codeburn optimize, compute score delta
  run.mjs                   # Task 6 — orchestrates 1-5, this is what the skill shells out to
  fix-tokens.test.mjs       # Tests for tasks 1-5 (fixture-based, node:test + node:assert)
  fixtures/
    sample-optimize-output.json   # Trimmed real fixture (6 findings covering both fix types + one no-fix finding)
    sample-settings.json          # Trimmed ~/.claude/settings.json shape for MCP-removal diff test

~/.claude/skills/fix-tokens/SKILL.md   # Task 7 — the skill wrapper (frontmatter + body)

~/.claude/hooks/token-fix-nudge.sh     # Task 8 — SessionStart nudge hook
~/.claude/hooks/token-fix-cache-refresh.sh  # Task 8 — cache refresher (called by run.mjs after each /fix-tokens run)

agents/CLAUDE.md          # Task 9 — new §0-TOKEN-FIX hard rule section
```

---

### Task 1: Finding Parser

**Files:**
- Create: `agents/scripts/fix-tokens/parse-findings.mjs`
- Create: `agents/scripts/fix-tokens/fixtures/sample-optimize-output.json`
- Test: `agents/scripts/fix-tokens/fix-tokens.test.mjs` (this task's tests go at the top of this shared file)

**Interfaces:**
- Produces: `parseFindings(rawJson: object) => Finding[]` where
  ```ts
  type Finding = {
    title: string
    explanation: string
    severity: "high" | "medium" | "low"
    tokensSaved: number
    estimatedSavingsUSD: number
    fix: { type: "command", label: string, text: string }
          | { type: "paste", destination: string, label: string, text: string }
          | null
  }
  ```
- Produces: `parseSummary(rawJson: object) => { healthScore: number, healthGrade: string, findingCount: number, potentialSavingsCostUSD: number, potentialSavingsPercent: number }`
- Consumes: nothing (first stage of pipeline)

- [ ] **Step 1: Create the fixture file**

Create `agents/scripts/fix-tokens/fixtures/sample-optimize-output.json` with this exact content (a trimmed real shape covering: one `command`-type finding, two `paste`-type findings with different `destination` values, and one finding with no `fix` at all):

```json
{
  "period": { "label": "Last 30 days", "start": "2026-06-07T00:00:00.000Z", "end": "2026-07-07T23:59:59.999Z" },
  "summary": {
    "healthScore": 20,
    "healthGrade": "F",
    "findingCount": 4,
    "periodCostUSD": 392.17673484,
    "sessions": 216,
    "calls": 8475,
    "potentialSavingsTokens": 347160983,
    "potentialSavingsCostUSD": 125.78509756697528,
    "potentialSavingsPercent": 32.1
  },
  "findings": [
    {
      "title": "6 MCP servers configured but never used",
      "explanation": "Never called in this period: playwright, hermes, nvidia-mcp, higgsfield, firecrawl, 21st-dev-magic.",
      "severity": "high",
      "trend": null,
      "tokensSaved": 2592000,
      "estimatedSavingsUSD": 0.9391463582000513,
      "fix": {
        "type": "command",
        "label": "Remove unused servers:",
        "text": "claude mcp remove playwright\nclaude mcp remove hermes\nclaude mcp remove nvidia-mcp\nclaude mcp remove higgsfield\nclaude mcp remove firecrawl\nclaude mcp remove 21st-dev-magic"
      }
    },
    {
      "title": "8 possibly low-worth expensive sessions",
      "explanation": "Sessions with meaningful spend but weak delivery signals.",
      "severity": "high",
      "trend": null,
      "tokensSaved": 179954593,
      "estimatedSavingsUSD": 65.20204500668304,
      "fix": {
        "type": "paste",
        "destination": "session-opener",
        "label": "Paste at the start of your NEXT expensive thread (one-time, do not add to CLAUDE.md):",
        "text": "Before continuing, name the deliverable in one sentence. Stop and check with me if (a) you spend more than 10 minutes without an edit, or (b) the same approach fails twice."
      }
    },
    {
      "title": "Claude edits more than it reads",
      "explanation": "Claude made 607 reads and 381 edits (ratio 1.6:1). A healthy ratio is 4+ reads per edit.",
      "severity": "high",
      "trend": "active",
      "tokensSaved": 550200,
      "estimatedSavingsUSD": 0.19935120612718682,
      "fix": {
        "type": "paste",
        "destination": "claude-md",
        "label": "Add to your CLAUDE.md:",
        "text": "Before editing any file, read it first. Before modifying a function, grep for all callers."
      }
    },
    {
      "title": "4 high-cost session outliers",
      "explanation": "Sessions costing more than 2x their peer-session average in the same project.",
      "severity": "high",
      "trend": null,
      "tokensSaved": 21689518,
      "estimatedSavingsUSD": 7.85865425957348,
      "fix": null
    }
  ]
}
```

- [ ] **Step 2: Write the failing tests**

Create `agents/scripts/fix-tokens/fix-tokens.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseFindings, parseSummary } from "./parse-findings.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures", "sample-optimize-output.json"), "utf8")
);

test("parseFindings returns 4 findings with correct fix types", () => {
  const findings = parseFindings(fixture);
  assert.equal(findings.length, 4);
  assert.equal(findings[0].fix.type, "command");
  assert.equal(findings[1].fix.type, "paste");
  assert.equal(findings[1].fix.destination, "session-opener");
  assert.equal(findings[2].fix.type, "paste");
  assert.equal(findings[2].fix.destination, "claude-md");
  assert.equal(findings[3].fix, null);
});

test("parseFindings preserves title, severity, and savings fields", () => {
  const findings = parseFindings(fixture);
  assert.equal(findings[0].title, "6 MCP servers configured but never used");
  assert.equal(findings[0].severity, "high");
  assert.equal(findings[0].tokensSaved, 2592000);
  assert.equal(findings[0].estimatedSavingsUSD, 0.9391463582000513);
});

test("parseSummary extracts health score and savings summary", () => {
  const summary = parseSummary(fixture);
  assert.equal(summary.healthScore, 20);
  assert.equal(summary.healthGrade, "F");
  assert.equal(summary.findingCount, 4);
  assert.equal(summary.potentialSavingsPercent, 32.1);
});

test("parseFindings throws on malformed input missing findings array", () => {
  assert.throws(() => parseFindings({ summary: {} }), /findings/);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: FAIL with `Cannot find module './parse-findings.mjs'` (file doesn't exist yet)

- [ ] **Step 4: Write the implementation**

Create `agents/scripts/fix-tokens/parse-findings.mjs`:

```js
export function parseFindings(rawJson) {
  if (!rawJson || !Array.isArray(rawJson.findings)) {
    throw new Error("parseFindings: input missing a 'findings' array");
  }
  return rawJson.findings.map((f) => ({
    title: f.title,
    explanation: f.explanation,
    severity: f.severity,
    tokensSaved: f.tokensSaved,
    estimatedSavingsUSD: f.estimatedSavingsUSD,
    fix: f.fix ?? null,
  }));
}

export function parseSummary(rawJson) {
  const s = rawJson?.summary;
  if (!s) throw new Error("parseSummary: input missing a 'summary' object");
  return {
    healthScore: s.healthScore,
    healthGrade: s.healthGrade,
    findingCount: s.findingCount,
    potentialSavingsCostUSD: s.potentialSavingsCostUSD,
    potentialSavingsPercent: s.potentialSavingsPercent,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: PASS — 4 tests pass

- [ ] **Step 6: Commit**

```bash
git add agents/scripts/fix-tokens/parse-findings.mjs agents/scripts/fix-tokens/fixtures/sample-optimize-output.json agents/scripts/fix-tokens/fix-tokens.test.mjs
git commit -m "feat(fix-tokens): add Finding Parser for codeburn optimize JSON"
```

---

### Task 2: Fix Generators

**Files:**
- Create: `agents/scripts/fix-tokens/fix-generators.mjs`
- Create: `agents/scripts/fix-tokens/fixtures/sample-settings.json`
- Test: `agents/scripts/fix-tokens/fix-tokens.test.mjs` (append)

**Interfaces:**
- Consumes: `Finding` type from Task 1 (`parse-findings.mjs`)
- Produces:
  ```ts
  type Diff = {
    kind: "command" | "paste"
    label: string
    // command diffs:
    commandText?: string          // the shell command(s) to run on approval
    settingsBefore?: object       // only for MCP-removal: the settings.json object before
    settingsAfter?: object        // only for MCP-removal: the settings.json object after
    // paste diffs:
    destination?: string          // "session-opener" | "claude-md" | other
    pasteText?: string
    targetFile?: string | null    // resolved file path for "claude-md", null for "session-opener"
  }
  ```
  `generateFix(finding: Finding, context: { settingsPath?: string, claudeMdPath?: string }) => Diff | null`
  — returns `null` when `finding.fix` is `null` (report-only, never auto-actioned).

- [ ] **Step 1: Create the settings fixture**

Create `agents/scripts/fix-tokens/fixtures/sample-settings.json`:

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp"] },
    "hermes": { "command": "ssh", "args": ["root@31.97.56.148"] },
    "firecrawl": { "command": "npx", "args": ["-y", "firecrawl-mcp"] }
  },
  "hooks": {}
}
```

- [ ] **Step 2: Write the failing tests (append to fix-tokens.test.mjs)**

```js
import { generateFix } from "./fix-generators.mjs";

const settingsFixturePath = path.join(__dirname, "fixtures", "sample-settings.json");

test("generateFix returns null for a finding with no fix object", () => {
  const findings = parseFindings(fixture);
  const noFixFinding = findings[3];
  const diff = generateFix(noFixFinding, { settingsPath: settingsFixturePath });
  assert.equal(diff, null);
});

test("generateFix for command-type MCP removal produces before/after settings diff", () => {
  const findings = parseFindings(fixture);
  const mcpFinding = findings[0];
  const diff = generateFix(mcpFinding, { settingsPath: settingsFixturePath });
  assert.equal(diff.kind, "command");
  assert.ok(diff.settingsBefore.mcpServers.playwright);
  assert.ok(diff.settingsBefore.mcpServers.firecrawl);
  assert.equal(diff.settingsAfter.mcpServers.playwright, undefined);
  assert.equal(diff.settingsAfter.mcpServers.firecrawl, undefined);
  assert.match(diff.commandText, /claude mcp remove playwright/);
});

test("generateFix for paste-type session-opener has no targetFile", () => {
  const findings = parseFindings(fixture);
  const sessionOpenerFinding = findings[1];
  const diff = generateFix(sessionOpenerFinding, {});
  assert.equal(diff.kind, "paste");
  assert.equal(diff.destination, "session-opener");
  assert.equal(diff.targetFile, null);
  assert.match(diff.pasteText, /name the deliverable/);
});

test("generateFix for paste-type claude-md resolves targetFile from context", () => {
  const findings = parseFindings(fixture);
  const claudeMdFinding = findings[2];
  const diff = generateFix(claudeMdFinding, { claudeMdPath: "/tmp/fake/CLAUDE.md" });
  assert.equal(diff.kind, "paste");
  assert.equal(diff.destination, "claude-md");
  assert.equal(diff.targetFile, "/tmp/fake/CLAUDE.md");
  assert.match(diff.pasteText, /read it first/);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: FAIL with `Cannot find module './fix-generators.mjs'`

- [ ] **Step 4: Write the implementation**

Create `agents/scripts/fix-tokens/fix-generators.mjs`:

```js
import { readFileSync } from "node:fs";

function generateCommandFix(finding, context) {
  const diff = {
    kind: "command",
    label: finding.fix.label,
    commandText: finding.fix.text,
  };

  // MCP-removal is the one command-fix category that also shows a settings.json diff.
  const isMcpRemoval = /^claude mcp remove/m.test(finding.fix.text);
  if (isMcpRemoval && context.settingsPath) {
    const before = JSON.parse(readFileSync(context.settingsPath, "utf8"));
    const serverNames = [...finding.fix.text.matchAll(/claude mcp remove ['"]?([\w.-]+)['"]?/g)].map(
      (m) => m[1]
    );
    const after = JSON.parse(JSON.stringify(before));
    for (const name of serverNames) {
      delete after.mcpServers?.[name];
    }
    diff.settingsBefore = before;
    diff.settingsAfter = after;
    diff.settingsPath = context.settingsPath;
  }
  return diff;
}

function generatePasteFix(finding, context) {
  const destination = finding.fix.destination;
  const targetFile = destination === "claude-md" ? context.claudeMdPath ?? null : null;
  return {
    kind: "paste",
    label: finding.fix.label,
    destination,
    pasteText: finding.fix.text,
    targetFile,
  };
}

export function generateFix(finding, context = {}) {
  if (!finding.fix) return null;
  if (finding.fix.type === "command") return generateCommandFix(finding, context);
  if (finding.fix.type === "paste") return generatePasteFix(finding, context);
  return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: PASS — 8 tests pass total (4 from Task 1 + 4 new)

- [ ] **Step 6: Commit**

```bash
git add agents/scripts/fix-tokens/fix-generators.mjs agents/scripts/fix-tokens/fixtures/sample-settings.json agents/scripts/fix-tokens/fix-tokens.test.mjs
git commit -m "feat(fix-tokens): add Fix Generators for command and paste finding types"
```

---

### Task 3: Diff Presenter + Approval Gate

**Files:**
- Create: `agents/scripts/fix-tokens/diff-presenter.mjs`
- Test: `agents/scripts/fix-tokens/fix-tokens.test.mjs` (append)

**Interfaces:**
- Consumes: `Diff` type from Task 2 (`fix-generators.mjs`)
- Produces:
  - `renderDiff(diff: Diff) => string` — pure function, returns human-readable unified-diff-style text (no I/O, fully testable)
  - `promptApproval(diff: Diff, opts: { readInput: () => Promise<string> }) => Promise<"y" | "n" | "a">` — takes an injected input reader so it's testable without real stdin; real CLI usage passes a readline-based reader

- [ ] **Step 1: Write the failing tests (append to fix-tokens.test.mjs)**

```js
import { renderDiff, promptApproval } from "./diff-presenter.mjs";

test("renderDiff for command-type shows label and command text", () => {
  const diff = { kind: "command", label: "Remove unused servers:", commandText: "claude mcp remove playwright" };
  const rendered = renderDiff(diff);
  assert.match(rendered, /Remove unused servers:/);
  assert.match(rendered, /claude mcp remove playwright/);
});

test("renderDiff for command-type with settings before/after shows +/- lines", () => {
  const diff = {
    kind: "command",
    label: "Remove unused servers:",
    commandText: "claude mcp remove playwright",
    settingsBefore: { mcpServers: { playwright: {}, hermes: {} } },
    settingsAfter: { mcpServers: { hermes: {} } },
  };
  const rendered = renderDiff(diff);
  assert.match(rendered, /-\s*"playwright"/);
});

test("renderDiff for paste-type shows destination and paste text", () => {
  const diff = { kind: "paste", label: "Add to your CLAUDE.md:", destination: "claude-md", pasteText: "Read before edit.", targetFile: "/tmp/CLAUDE.md" };
  const rendered = renderDiff(diff);
  assert.match(rendered, /\/tmp\/CLAUDE\.md/);
  assert.match(rendered, /Read before edit\./);
});

test("promptApproval returns 'y' when reader yields 'y'", async () => {
  const diff = { kind: "paste", label: "x", destination: "session-opener", pasteText: "x", targetFile: null };
  const result = await promptApproval(diff, { readInput: async () => "y" });
  assert.equal(result, "y");
});

test("promptApproval returns 'n' when reader yields 'n'", async () => {
  const diff = { kind: "paste", label: "x", destination: "session-opener", pasteText: "x", targetFile: null };
  const result = await promptApproval(diff, { readInput: async () => "n" });
  assert.equal(result, "n");
});

test("promptApproval returns 'a' when reader yields 'a' (apply all remaining)", async () => {
  const diff = { kind: "paste", label: "x", destination: "session-opener", pasteText: "x", targetFile: null };
  const result = await promptApproval(diff, { readInput: async () => "a" });
  assert.equal(result, "a");
});

test("promptApproval defaults to 'n' on unrecognized input (never silently applies)", async () => {
  const diff = { kind: "paste", label: "x", destination: "session-opener", pasteText: "x", targetFile: null };
  const result = await promptApproval(diff, { readInput: async () => "banana" });
  assert.equal(result, "n");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: FAIL with `Cannot find module './diff-presenter.mjs'`

- [ ] **Step 3: Write the implementation**

Create `agents/scripts/fix-tokens/diff-presenter.mjs`:

```js
function renderSettingsDiff(before, after) {
  const beforeStr = JSON.stringify(before, null, 2);
  const afterStr = JSON.stringify(after, null, 2);
  const beforeLines = new Set(beforeStr.split("\n"));
  const afterLines = new Set(afterStr.split("\n"));
  const removed = [...beforeLines].filter((l) => !afterLines.has(l));
  const added = [...afterLines].filter((l) => !beforeLines.has(l));
  const lines = [];
  for (const l of removed) lines.push(`-${l}`);
  for (const l of added) lines.push(`+${l}`);
  return lines.join("\n");
}

export function renderDiff(diff) {
  const out = [];
  out.push(`--- ${diff.label} ---`);
  if (diff.kind === "command") {
    out.push(diff.commandText);
    if (diff.settingsBefore && diff.settingsAfter) {
      out.push("");
      out.push(`Config change (${diff.settingsPath ?? "settings.json"}):`);
      out.push(renderSettingsDiff(diff.settingsBefore, diff.settingsAfter));
    }
  } else if (diff.kind === "paste") {
    out.push(`Destination: ${diff.targetFile ?? diff.destination}`);
    out.push("");
    out.push(diff.pasteText);
  }
  return out.join("\n");
}

export async function promptApproval(diff, { readInput }) {
  console.log(renderDiff(diff));
  console.log("\nApply this fix? [y]es / [n]o / [a]ll remaining:");
  const raw = (await readInput()).trim().toLowerCase();
  if (raw === "y" || raw === "n" || raw === "a") return raw;
  return "n"; // never silently apply on unrecognized input
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: PASS — 15 tests pass total

- [ ] **Step 5: Commit**

```bash
git add agents/scripts/fix-tokens/diff-presenter.mjs agents/scripts/fix-tokens/fix-tokens.test.mjs
git commit -m "feat(fix-tokens): add Diff Presenter and per-fix approval gate"
```

---

### Task 4: Applier

**Files:**
- Create: `agents/scripts/fix-tokens/applier.mjs`
- Test: `agents/scripts/fix-tokens/fix-tokens.test.mjs` (append)

**Interfaces:**
- Consumes: `Diff` type from Task 2
- Produces:
  - `applyFix(diff: Diff, opts: { execCommand?: (cmd: string) => void, writeFile?: (path: string, content: string) => void }) => { applied: true, kind: string } | { applied: false, reason: string }`
  - Both `execCommand` and `writeFile` are injectable (default to real `child_process.execSync` / `fs.writeFileSync`) so tests never touch the real filesystem or shell.
  - `applyFix` NEVER writes/executes for `destination === "session-opener"` — that type has no file target, it's surfaced back to the caller as text to paste manually (per spec: "text meant to be pasted... into the user's next thread", not a file write).

- [ ] **Step 1: Write the failing tests (append to fix-tokens.test.mjs)**

```js
import { applyFix } from "./applier.mjs";

test("applyFix for command-type calls execCommand with commandText", () => {
  const calls = [];
  const diff = { kind: "command", label: "x", commandText: "claude mcp remove playwright" };
  const result = applyFix(diff, { execCommand: (cmd) => calls.push(cmd) });
  assert.equal(result.applied, true);
  assert.equal(calls[0], "claude mcp remove playwright");
});

test("applyFix for command-type also writes settingsAfter when present", () => {
  const writes = [];
  const diff = {
    kind: "command",
    label: "x",
    commandText: "echo noop",
    settingsAfter: { mcpServers: {} },
    settingsPath: "/tmp/fake-settings.json",
  };
  const result = applyFix(diff, { execCommand: () => {}, writeFile: (p, c) => writes.push([p, c]) });
  assert.equal(result.applied, true);
  assert.equal(writes[0][0], "/tmp/fake-settings.json");
  assert.match(writes[0][1], /"mcpServers"/);
});

test("applyFix for paste-type with claude-md destination writes to targetFile", () => {
  const writes = [];
  const diff = { kind: "paste", label: "x", destination: "claude-md", pasteText: "New rule.", targetFile: "/tmp/fake/CLAUDE.md" };
  const result = applyFix(diff, { writeFile: (p, c) => writes.push([p, c]) });
  assert.equal(result.applied, true);
  assert.equal(writes[0][0], "/tmp/fake/CLAUDE.md");
  assert.match(writes[0][1], /New rule\./);
});

test("applyFix for paste-type with session-opener destination never writes a file", () => {
  const writes = [];
  const diff = { kind: "paste", label: "x", destination: "session-opener", pasteText: "Paste me manually.", targetFile: null };
  const result = applyFix(diff, { writeFile: (p, c) => writes.push([p, c]) });
  assert.equal(result.applied, false);
  assert.equal(result.reason, "session-opener has no file target — surfaced as text for manual paste");
  assert.equal(writes.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: FAIL with `Cannot find module './applier.mjs'`

- [ ] **Step 3: Write the implementation**

Create `agents/scripts/fix-tokens/applier.mjs`:

```js
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

export function applyFix(diff, opts = {}) {
  const execCommand = opts.execCommand ?? ((cmd) => execSync(cmd, { stdio: "inherit" }));
  const writeFile = opts.writeFile ?? ((p, c) => writeFileSync(p, c, "utf8"));

  if (diff.kind === "command") {
    execCommand(diff.commandText);
    if (diff.settingsAfter && diff.settingsPath) {
      writeFile(diff.settingsPath, JSON.stringify(diff.settingsAfter, null, 2) + "\n");
    }
    return { applied: true, kind: "command" };
  }

  if (diff.kind === "paste") {
    if (diff.destination === "session-opener") {
      return { applied: false, reason: "session-opener has no file target — surfaced as text for manual paste" };
    }
    writeFile(diff.targetFile, (diff.pasteText.endsWith("\n") ? diff.pasteText : diff.pasteText + "\n"));
    return { applied: true, kind: "paste" };
  }

  return { applied: false, reason: `unknown diff kind: ${diff.kind}` };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: PASS — 19 tests pass total

- [ ] **Step 5: Commit**

```bash
git add agents/scripts/fix-tokens/applier.mjs agents/scripts/fix-tokens/fix-tokens.test.mjs
git commit -m "feat(fix-tokens): add Applier — writes only approved fixes"
```

---

### Task 5: Re-verify

**Files:**
- Create: `agents/scripts/fix-tokens/reverify.mjs`
- Test: `agents/scripts/fix-tokens/fix-tokens.test.mjs` (append)

**Interfaces:**
- Consumes: `parseSummary` from Task 1
- Produces:
  - `computeDelta(before: Summary, after: Summary) => { healthScoreDelta: number, savingsCostDelta: number, findingCountDelta: number }` — pure function, testable without shelling out
  - `runReverify(opts: { execOptimize: () => string }) => { summary: Summary, delta?: never }` — `execOptimize` is injectable (default: `execSync('codeburn optimize --format json --period 30days')`); this function alone shells out, `computeDelta` never does

- [ ] **Step 1: Write the failing tests (append to fix-tokens.test.mjs)**

```js
import { computeDelta, runReverify } from "./reverify.mjs";

test("computeDelta returns positive healthScoreDelta when score improves", () => {
  const before = { healthScore: 20, healthGrade: "F", findingCount: 4, potentialSavingsCostUSD: 125.78, potentialSavingsPercent: 32.1 };
  const after = { healthScore: 35, healthGrade: "F", findingCount: 3, potentialSavingsCostUSD: 90.0, potentialSavingsPercent: 22.4 };
  const delta = computeDelta(before, after);
  assert.equal(delta.healthScoreDelta, 15);
  assert.equal(delta.findingCountDelta, -1);
  assert.ok(delta.savingsCostDelta < 0); // savings opportunity shrank because we fixed things
});

test("runReverify parses the output of the injected execOptimize function", () => {
  const fakeOutput = JSON.stringify(fixture);
  const result = runReverify({ execOptimize: () => fakeOutput });
  assert.equal(result.summary.healthScore, 20);
  assert.equal(result.summary.findingCount, 4);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: FAIL with `Cannot find module './reverify.mjs'`

- [ ] **Step 3: Write the implementation**

Create `agents/scripts/fix-tokens/reverify.mjs`:

```js
import { execSync } from "node:child_process";
import { parseSummary } from "./parse-findings.mjs";

export function computeDelta(before, after) {
  return {
    healthScoreDelta: after.healthScore - before.healthScore,
    savingsCostDelta: after.potentialSavingsCostUSD - before.potentialSavingsCostUSD,
    findingCountDelta: after.findingCount - before.findingCount,
  };
}

export function runReverify(opts = {}) {
  const execOptimize =
    opts.execOptimize ??
    (() => execSync("codeburn optimize --format json --period 30days", { encoding: "utf8" }));
  const raw = JSON.parse(execOptimize());
  return { summary: parseSummary(raw) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: PASS — 21 tests pass total

- [ ] **Step 5: Commit**

```bash
git add agents/scripts/fix-tokens/reverify.mjs agents/scripts/fix-tokens/fix-tokens.test.mjs
git commit -m "feat(fix-tokens): add Re-verify — before/after health score delta"
```

---

### Task 6: Orchestrator (run.mjs)

**Files:**
- Create: `agents/scripts/fix-tokens/run.mjs`
- Create: `agents/hooks/token-fix-cache-refresh.sh`

**Interfaces:**
- Consumes: all of Tasks 1-5 (`parseFindings`, `parseSummary`, `generateFix`, `renderDiff`, `promptApproval`, `applyFix`, `computeDelta`, `runReverify`)
- Produces: a CLI entry point run as `node agents/scripts/fix-tokens/run.mjs` with no args (real stdin/stdout/exec — this is the only file in the package that is NOT unit-tested with fixtures; it's covered by the manual verification step in Task 10). On successful completion (even zero fixes applied) it writes a cache file `~/.claude/.fix-tokens-cache.json` with `{ lastRunAt: ISO string, fixableCount: number }` so the SessionStart nudge (Task 8) has something cheap to read.

- [ ] **Step 1: Write the orchestrator**

Create `agents/scripts/fix-tokens/run.mjs`:

```js
#!/usr/bin/env node
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import readline from "node:readline";

import { parseFindings, parseSummary } from "./parse-findings.mjs";
import { generateFix } from "./fix-generators.mjs";
import { renderDiff, promptApproval } from "./diff-presenter.mjs";
import { applyFix } from "./applier.mjs";
import { computeDelta, runReverify } from "./reverify.mjs";

const CACHE_PATH = path.join(homedir(), ".claude", ".fix-tokens-cache.json");
const SETTINGS_PATH = path.join(homedir(), ".claude", "settings.json");
const CLAUDE_MD_PATH = path.join(process.cwd(), "CLAUDE.md");

function readInputFromStdin() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question("", (answer) => { rl.close(); resolve(answer); }));
}

function writeCache(fixableCount) {
  writeFileSync(CACHE_PATH, JSON.stringify({ lastRunAt: new Date().toISOString(), fixableCount }, null, 2));
}

async function main() {
  console.log("Running codeburn optimize...\n");
  const raw = JSON.parse(execSync("codeburn optimize --format json --period 30days", { encoding: "utf8" }));
  const before = parseSummary(raw);
  const findings = parseFindings(raw);

  const fixable = findings.filter((f) => f.fix !== null);
  const reportOnly = findings.filter((f) => f.fix === null);

  console.log(`Health: ${before.healthGrade} (${before.healthScore}/100) — ${fixable.length} auto-fixable, ${reportOnly.length} report-only.\n`);

  let applyAll = false;
  let appliedCount = 0;
  const manualPastes = [];

  for (const finding of fixable) {
    const diff = generateFix(finding, { settingsPath: SETTINGS_PATH, claudeMdPath: CLAUDE_MD_PATH });
    let decision = "y";
    if (!applyAll) {
      decision = await promptApproval(diff, { readInput: readInputFromStdin });
      if (decision === "a") { applyAll = true; decision = "y"; }
    }
    if (decision === "y") {
      const result = applyFix(diff);
      if (result.applied) {
        appliedCount++;
      } else if (result.reason?.startsWith("session-opener")) {
        manualPastes.push(diff.pasteText);
      }
    }
  }

  if (manualPastes.length > 0) {
    console.log("\n--- Paste these into your NEXT expensive session (not applied automatically) ---");
    manualPastes.forEach((text, i) => console.log(`\n[${i + 1}] ${text}`));
  }

  if (reportOnly.length > 0) {
    console.log("\n--- Report-only findings (no safe auto-fix, review manually) ---");
    reportOnly.forEach((f) => console.log(`- ${f.title} (est. $${f.estimatedSavingsUSD.toFixed(2)} savings)`));
  }

  if (appliedCount > 0) {
    console.log(`\nApplied ${appliedCount} fix(es). Re-verifying...\n`);
    const { summary: after } = runReverify();
    const delta = computeDelta(before, after);
    console.log(`Health score: ${before.healthScore} -> ${after.healthScore} (${delta.healthScoreDelta >= 0 ? "+" : ""}${delta.healthScoreDelta})`);
    console.log(`Findings: ${before.findingCount} -> ${after.findingCount}`);
    writeCache(after.findingCount);
  } else {
    console.log("\nNo fixes applied.");
    writeCache(fixable.length);
  }
}

main().catch((err) => {
  console.error("fix-tokens failed:", err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Manual smoke test against real CodeBurn output**

Run: `node agents/scripts/fix-tokens/run.mjs`
Expected: prints health grade, walks through each fixable finding with a diff and a y/n/a prompt. Answer `n` to every prompt on this first run (no changes should be made yet — this is just confirming the pipeline runs end-to-end against real data before Task 10's actual approved fix). Confirm no crash, confirm `~/.claude/.fix-tokens-cache.json` is created.

- [ ] **Step 3: Create the cache-refresh helper used by the SessionStart hook's cache**

Create `agents/hooks/token-fix-cache-refresh.sh` (kept in the repo so it's version-controlled; Task 8 copies/symlinks it into `~/.claude/hooks/`):

```bash
#!/bin/bash
# Re-runs codeburn optimize in the background and updates the fix-tokens cache.
# Called on a throttled cadence (see token-fix-nudge.sh) — never on every session start.
CACHE_PATH="$HOME/.claude/.fix-tokens-cache.json"
RAW=$(codeburn optimize --format json --period 30days 2>/dev/null)
if [ -z "$RAW" ]; then
  exit 0
fi
FIXABLE_COUNT=$(echo "$RAW" | node -e '
  let data = "";
  process.stdin.on("data", (c) => data += c);
  process.stdin.on("end", () => {
    try {
      const j = JSON.parse(data);
      const count = (j.findings || []).filter((f) => f.fix).length;
      process.stdout.write(String(count));
    } catch { process.stdout.write("0"); }
  });
')
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
echo "{\"lastRunAt\": \"$NOW\", \"fixableCount\": $FIXABLE_COUNT}" > "$CACHE_PATH"
```

- [ ] **Step 4: Make it executable and commit**

```bash
chmod +x agents/hooks/token-fix-cache-refresh.sh
git add agents/scripts/fix-tokens/run.mjs agents/hooks/token-fix-cache-refresh.sh
git commit -m "feat(fix-tokens): add orchestrator CLI and cache-refresh helper"
```

---

### Task 7: `/fix-tokens` Skill Wrapper

**Files:**
- Create: `~/.claude/skills/fix-tokens/SKILL.md`

**Interfaces:**
- Consumes: `agents/scripts/fix-tokens/run.mjs` (Task 6), invoked via Bash from within the skill body.
- Produces: the `/fix-tokens` slash command, invokable from any Claude Code session in this environment.

- [ ] **Step 1: Write the skill file**

Create `~/.claude/skills/fix-tokens/SKILL.md`:

```markdown
---
name: fix-tokens
description: |
  Diagnoses and fixes token-waste issues in Claude Code usage. Runs `codeburn optimize`,
  walks through each auto-fixable finding (unused MCP servers, bloated CLAUDE.md instructions,
  session-opener guidance for low-delivery/context-heavy sessions) as a reviewable diff, applies
  only what you approve, then re-verifies the health-score improvement. Use when asked to
  "fix token usage", "reduce AI spend", "clean up MCP servers", "run fix-tokens", or when the
  SessionStart nudge reports unresolved fixable findings.
allowed-tools:
  - Bash
triggers:
  - fix tokens
  - fix-tokens
  - reduce token usage
  - clean up mcp servers
  - optimize claude spend
---

## What this does

1. Runs `codeburn optimize --format json --period 30days` (CodeBurn does the diagnosis — this skill does not re-derive it).
2. For each finding with a `fix` object (`command` or `paste` type), shows a diff and asks for approval (`y`/`n`/`a` for all remaining). Nothing is ever applied without approval.
3. Findings with no `fix` object are printed as report-only — never auto-actioned.
4. After applying approved fixes, re-runs `codeburn optimize` and reports the health-score delta.

## Run it

```bash
node /Users/sivaprakasam/projects/agents/scripts/fix-tokens/run.mjs
```

Walk the user through the interactive prompts exactly as the script presents them — do not skip or auto-answer any approval prompt yourself. Read the script's own stdout back to the user in your response; do not paraphrase the diffs, show them verbatim so the user is reviewing the real proposed change.

If CodeBurn is not installed (`command -v codeburn` fails), tell the user to run `npm i -g codeburn` first — do not attempt to reimplement its diagnosis.
```

- [ ] **Step 2: Manual verification**

In a fresh Claude Code turn, type `/fix-tokens` and confirm the skill is discovered and its body (the run command) executes, printing the same output confirmed in Task 6 Step 2.

- [ ] **Step 3: Commit**

Skills directory (`~/.claude/skills/`) is outside the `agents/` git repo (it's in the user's home config), so no `git commit` here — this step is just the manual verification above. Note this in the plan's final report rather than committing.

---

### Task 8: SessionStart Nudge Hook (hard-rule enforced)

**Files:**
- Create: `agents/hooks/token-fix-nudge.sh`
- Modify: `~/.claude/settings.json` (add one entry to `hooks.SessionStart[0].hooks[]`)

**Interfaces:**
- Consumes: `~/.claude/.fix-tokens-cache.json` written by Task 6's `run.mjs`, and `agents/hooks/token-fix-cache-refresh.sh` from Task 6 Step 3.
- Produces: one line of stdout on SessionStart when unresolved fixable findings exist, e.g. `"3 auto-fixable token-waste issues found — run /fix-tokens to review."` — silent otherwise. This is the "hard rule" enforcement mechanism per the user's explicit instruction to hook this into the workflow rather than leave it as a manual-only skill.

- [ ] **Step 1: Write the nudge hook script**

Create `agents/hooks/token-fix-nudge.sh`:

```bash
#!/bin/bash
# SessionStart hook: cheap, cached nudge toward /fix-tokens. Never runs a full
# codeburn scan on every session — reads a cache file, refreshes it at most
# once per 24h in the background, and prints one line only if fixable findings exist.
CACHE_PATH="$HOME/.claude/.fix-tokens-cache.json"
REFRESH_SCRIPT="/Users/sivaprakasam/projects/agents/hooks/token-fix-cache-refresh.sh"

if [ ! -f "$CACHE_PATH" ]; then
  # No cache yet — kick off a background refresh for next time, say nothing now.
  (bash "$REFRESH_SCRIPT" &) 2>/dev/null
  exit 0
fi

LAST_RUN=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CACHE_PATH','utf8')).lastRunAt)}catch{console.log('')}" 2>/dev/null)
FIXABLE=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CACHE_PATH','utf8')).fixableCount)}catch{console.log(0)}" 2>/dev/null)

if [ -n "$LAST_RUN" ]; then
  AGE_SECONDS=$(( $(date +%s) - $(date -j -f "%Y-%m-%dT%H:%M:%S" "${LAST_RUN%%.*}" +%s 2>/dev/null || echo 0) ))
  if [ "$AGE_SECONDS" -gt 86400 ] || [ "$AGE_SECONDS" -lt 0 ]; then
    (bash "$REFRESH_SCRIPT" &) 2>/dev/null
  fi
fi

if [ -n "$FIXABLE" ] && [ "$FIXABLE" -gt 0 ] 2>/dev/null; then
  echo "$FIXABLE auto-fixable token-waste issue(s) found — run /fix-tokens to review."
fi
exit 0
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x agents/hooks/token-fix-nudge.sh
```

- [ ] **Step 3: Wire it into `~/.claude/settings.json`**

Read the current `hooks.SessionStart[0].hooks` array first:

```bash
python3 -c "import json; d=json.load(open('/Users/sivaprakasam/.claude/settings.json')); print(len(d['hooks']['SessionStart'][0]['hooks']))"
```

Then add a new entry to that array (matching the exact shape of existing entries like the graphify/memory hooks) via a targeted Edit — append this object to `hooks.SessionStart[0].hooks`:

```json
{
  "type": "command",
  "command": "bash \"/Users/sivaprakasam/projects/agents/hooks/token-fix-nudge.sh\"",
  "timeout": 5,
  "statusMessage": "Checking token-fix status..."
}
```

- [ ] **Step 4: Verify the hook fires**

Start a fresh Claude Code session (or run `bash agents/hooks/token-fix-nudge.sh` directly) and confirm it exits 0 within 100ms when no cache exists yet, and confirm that after Task 6's manual run populates the cache, a subsequent invocation prints the fixable count line if `fixableCount > 0`.

Run: `time bash agents/hooks/token-fix-nudge.sh`
Expected: real time under 0.1s, exit code 0, output either empty or the one-line nudge.

- [ ] **Step 5: Commit**

```bash
git add agents/hooks/token-fix-nudge.sh
git commit -m "feat(fix-tokens): add cached SessionStart nudge hook (hard-rule enforced)"
```

(The `~/.claude/settings.json` edit from Step 3 is outside the repo and not committed here — note it in the final report.)

---

### Task 9: §0-TOKEN-FIX Hard Rule in CLAUDE.md

**Files:**
- Modify: `agents/CLAUDE.md` (insert new section immediately after the existing `§0-TOOL-HYGIENE` section, matching that section's heading style)

**Interfaces:**
- Consumes: nothing (documentation only)
- Produces: a permanent, discoverable hard rule so future sessions (not just this one) know `/fix-tokens` is mandatory-cadence, not optional — directly answering the user's explicit instruction: *"use codeburn suggestions to improvise the token etc now and then as a hard rule and hook into our workflow and use other ponytail and other token optimization tool very frequently to improvise overall as a hard rule."*

- [ ] **Step 1: Read the exact insertion point**

Run: `grep -n "^## §0-TOOL-HYGIENE" -A 30 /Users/sivaprakasam/projects/agents/CLAUDE.md | tail -15`

This shows where `§0-TOOL-HYGIENE` ends, so the new section can be inserted directly after it without disturbing existing content.

- [ ] **Step 2: Insert the new section**

Insert this text immediately after the end of the `§0-TOOL-HYGIENE` section (before whatever section currently follows it):

```markdown
## §0-TOKEN-FIX — RUN /fix-tokens ON A HARD CADENCE, NOT JUST ON DEMAND (HARD RULE — added 2026-07-07)

**Token-waste remediation is now a standing rule, not a one-off tool.** CodeBurn diagnoses; `/fix-tokens` (this repo: `agents/scripts/fix-tokens/`) applies the fix under a diff+approval gate; both must be used routinely, not only when explicitly asked.

### Mandatory cadence
- **SessionStart hook** (`agents/hooks/token-fix-nudge.sh`, wired into `~/.claude/settings.json`) prints a one-line nudge whenever cached fixable-finding count > 0. This is a cheap, cached check (<100ms) — it does not run a full scan every session.
- **Run `/fix-tokens` whenever the nudge fires.** Do not dismiss it repeatedly across sessions — treat 3+ consecutive nudges without running the skill as a violation of this rule.
- **Run `/fix-tokens` proactively at the end of any multi-hour or multi-project session wave** (e.g. after a portfolio wave, after any session that touched 5+ projects), even without a nudge — these are exactly the sessions CodeBurn flags as context-heavy or low-delivery.
- **Never auto-apply a fix without the diff+approval gate** — this tool follows the same irreversible-action discipline as the rest of this environment (see root-level Claude behavior: risky/config-changing actions require confirmation, never silent execution).

### Complementary token tools — use frequently, not just this one
- **ponytail mode** (already active this session) — apply its ladder (reuse > stdlib > native > existing dep > one-liner) on every task, not just when reminded. This is a standing behavioral rule already in effect, not new — restated here so it's linked to the token-cost discipline this section establishes.
- **RTK (Rust Token Killer)** — `rtk gain` / `rtk discover` — check periodically for missed token-saving opportunities in CLI usage (see `~/.claude/RTK.md`).
- **graphify** — query the pre-built knowledge graph instead of grep/Read exploration (see root CLAUDE.md § graphify) — this is itself one of the largest token-saving levers already in place; keep using it first.
- **CodeBurn `optimize`** — the sole diagnosis source for `/fix-tokens`; also usable standalone (`codeburn optimize --format json`) for a quick read without going through the full fix flow.

### What NOT to do
- Do not build a second/competing diagnosis engine — CodeBurn remains the sole data source (see `docs/superpowers/specs/2026-07-07-ai-trace-advisor-design.md`).
- Do not skip the approval gate "because it's just a paste" or "just removing an unused MCP server" — every fix, regardless of perceived triviality, gets a diff and an explicit y/n.

**Full spec:** `docs/superpowers/specs/2026-07-07-ai-trace-advisor-design.md`
**Full plan:** `docs/superpowers/plans/2026-07-07-ai-trace-fixer.md`
```

- [ ] **Step 3: Verify the section renders correctly**

Run: `grep -n "^## §0-TOKEN-FIX" -A 5 /Users/sivaprakasam/projects/agents/CLAUDE.md`
Expected: shows the new heading and first few lines, confirming correct placement.

- [ ] **Step 4: Commit**

```bash
git add agents/CLAUDE.md
git commit -m "docs: add §0-TOKEN-FIX hard rule — mandatory /fix-tokens cadence"
```

---

### Task 10: Integration Test + Manual Real-Fix Verification

**Files:**
- No new files — this task exercises Tasks 1-9 together against this machine's real data.

**Interfaces:**
- Consumes: everything from Tasks 1-9.
- Produces: confirmation that the full pipeline works end-to-end on real (not fixture) data, and that one real fix was actually applied with explicit sign-off, per spec's Testing section requirement: *"Manual verification: approve one real fix... with explicit user sign-off before doing so, re-run optimize, confirm health score improves."*

- [ ] **Step 1: Run the full test suite one more time to confirm nothing regressed**

Run: `node --test agents/scripts/fix-tokens/fix-tokens.test.mjs`
Expected: PASS — all 21 tests pass

- [ ] **Step 2: Run `/fix-tokens` for real, against this machine's live CodeBurn data**

Invoke `/fix-tokens` in a live session (or `node agents/scripts/fix-tokens/run.mjs` directly). Read every diff shown. **Stop before answering `y` to anything and show the user the exact diff text — get explicit sign-off in this session before approving any real fix**, per the standing environment rule on config-changing actions.

- [ ] **Step 3: With explicit user sign-off, approve exactly one real fix**

Pick the lowest-risk fixable finding shown (e.g., a single confirmed-unused MCP server removal) and answer `y` only for that one, `n` for the rest.

- [ ] **Step 4: Confirm the re-verify step ran and reported a delta**

Expected console output ends with a line like:
```
Health score: 20 -> <new score> (+<delta>)
Findings: <before> -> <after>
```

- [ ] **Step 5: Confirm `~/.claude/settings.json` (or whichever file was touched) reflects the applied change**

```bash
cat ~/.claude/settings.json | python3 -c "import json,sys; print('mcpServers' in json.load(sys.stdin))"
```
Manually diff against a `git diff` or prior backup if available, confirming only the approved server was removed and nothing else changed.

- [ ] **Step 6: No commit for this task** — it's a live verification of already-committed code, not a code change.

---

## Self-Review

**1. Spec coverage:**
- Goal 1 (ingest findings) → Task 1. ✓
- Goal 2 (apply both fix types, same approval gate) → Tasks 2, 3, 4. ✓
- Goal 3 (approval gate hard requirement) → Task 3 (`promptApproval` defaults to `"n"` on anything unrecognized). ✓
- Goal 4 (re-verify) → Task 5. ✓
- Goal 5 (delivered as Claude Code skill) → Task 7. ✓
- Goal 6 (lightweight SessionStart nudge) → Task 8 — upgraded from "secondary/optional" to hard-rule-enforced per the user's mid-session instruction; Task 9 codifies this as a permanent CLAUDE.md rule. ✓
- Non-goal "no auto-apply without diff+approval" → enforced structurally: `applyFix` (Task 4) is only ever called after `promptApproval` returns `"y"` in `run.mjs` (Task 6) — there is no code path that calls `applyFix` without going through the gate first. ✓
- Non-goal "no re-implementing CodeBurn's engine" → Task 1's parser only reshapes CodeBurn's own JSON; no independent scoring/diagnosis logic anywhere in the plan. ✓
- Testing section (unit tests per generator, integration test against real output, manual sign-off) → Tasks 1-5 unit tests, Task 10 integration + manual. ✓
- Open question "diff-size safety threshold" → resolved as stated in spec: per-fix approval regardless of size is the safety net; no size-based logic was added, matching the spec's own resolution. ✓
- New scope from mid-session user message (hard rule + hook + frequent use of ponytail/RTK/other token tools) → Task 8 (hook) + Task 9 (CLAUDE.md hard rule, explicitly naming ponytail and RTK). ✓

**2. Placeholder scan:** No TBD/TODO markers. Every step has complete, runnable code or exact commands with expected output. The one deliberately-deferred item (§Open questions: ccusage as alt data source) is explicitly out of scope for v1 per the spec's own resolution, not a placeholder.

**3. Type consistency:** `Finding` (Task 1) → consumed identically in Task 2 (`generateFix(finding, context)`). `Diff` (Task 2) → consumed identically in Task 3 (`renderDiff`, `promptApproval`) and Task 4 (`applyFix`). `Summary` (Task 1's `parseSummary`) → consumed identically in Task 5 (`computeDelta`, `runReverify`). Field names (`fix.type`, `fix.destination`, `tokensSaved`, `estimatedSavingsUSD`, `healthScore`, `healthGrade`, `findingCount`, `potentialSavingsCostUSD`, `potentialSavingsPercent`) are used identically across every task that touches them — verified by re-reading Tasks 1 through 6 against each other during this review.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-07-ai-trace-fixer.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
