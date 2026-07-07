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
