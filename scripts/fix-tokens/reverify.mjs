import { execSync } from "node:child_process";
import { parseSummary } from "./parse-findings.mjs";

// Re-runs `codeburn optimize` after fixes are applied and reports the health
// score delta so the user can see the before/after impact in one glance.

export function computeDelta(before, after) {
  return {
    healthScoreDelta: after.healthScore - before.healthScore,
    findingCountDelta: after.findingCount - before.findingCount,
    savingsCostDelta: after.potentialSavingsCostUSD - before.potentialSavingsCostUSD,
  };
}

export function runReverify(opts = {}) {
  const execOptimize =
    opts.execOptimize ??
    (() => execSync("codeburn optimize --period 30days --format json", { encoding: "utf8" }));
  const raw = JSON.parse(execOptimize());
  const summary = parseSummary(raw);
  return { summary };
}
