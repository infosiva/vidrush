import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseFindings, parseSummary } from "./parse-findings.mjs";
import { generateFix } from "./fix-generators.mjs";
import { renderDiff, promptApproval } from "./diff-presenter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(path.join(__dirname, "fixtures", "sample-optimize-output.json"), "utf8")
);
const settingsFixturePath = path.join(__dirname, "fixtures", "sample-settings.json");

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
