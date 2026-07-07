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
