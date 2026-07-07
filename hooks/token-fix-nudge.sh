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
