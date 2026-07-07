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
