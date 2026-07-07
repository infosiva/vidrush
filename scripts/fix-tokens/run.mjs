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
