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
