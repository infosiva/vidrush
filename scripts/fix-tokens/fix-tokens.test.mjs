import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseFindings, parseSummary } from "./parse-findings.mjs";
import { generateFix } from "./fix-generators.mjs";

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
