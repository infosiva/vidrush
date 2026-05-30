#!/usr/bin/env bash
# smoke-check-all.sh — lightweight post-deploy visual sanity check
# Catches: server errors, blank pages, missing dark theme on body
# Usage: bash scripts/smoke-check-all.sh [--url https://single-site.com]
# Skip specific checks with: SKIP_THEME=1 bash scripts/smoke-check-all.sh

set -uo pipefail
PASS=0
FAIL=0
ERRORS=()
TMPDIR_SMOKE=$(mktemp -d)
trap 'rm -rf "$TMPDIR_SMOKE"' EXIT

# ── Sites ─────────────────────────────────────────────────────────────────────
# Format: "id|url|expected_dark_color"
# expected_dark_color: a hex or CSS value that MUST appear in <style> or inline CSS applied to body
# Leave blank to skip theme check for that site
SITES=(
  "nammatamil|https://nammatamil.live|#18181f"
  "kwizzo|https://kwizzo.app|"
  "tutiq|https://tutiq.app|"
  "quizbites|https://quizbites.app|"
  "myvitals|https://myvitals.app|#050510"
  "speakiq|https://speakiq.app|"
  "trackwealth|https://trackwealth.app|"
  "roamplan|https://roamplan.app|"
  "draftcal|https://draftcal.app|"
  "agentlogs|https://agentlogs.app|"
  "resumevault|https://resumevault.app|"
  # "quicktech|https://quicktechai.app|"  # domain unreachable 2026-05-30
  "quizbytes|https://quizbytes.dev|"
  "flightbrain|https://flightbrain.app|"
  "aijobsportal|https://www.aijobsportal.app|"
  "worldtrends|https://worldtrends.today|"
  "clawdbotai|https://clawdbotai.tech|"
  "pixelforge|https://arcadeforge.app|"
  "neuralos|https://neuralagent.app|"
)

# ── Single-URL override ───────────────────────────────────────────────────────
if [[ "${1:-}" == "--url" && -n "${2:-}" ]]; then
  SITES=("single|${2}|")
fi

# ── Worker function (runs in subshell for parallelism) ────────────────────────
check_one() {
  local name="$1" url="$2" expected_dark="$3"
  local issues=()

  # Fetch HTML to a temp file (avoids echo pipe limits on large bodies)
  local tmpfile="$TMPDIR_SMOKE/${name}.html"
  local size
  curl -sL --max-time 20 --compressed \
    -H "User-Agent: Mozilla/5.0 (Macintosh) SmokeBot/2.0" \
    -o "$tmpfile" "$url" 2>/dev/null || { echo "FAIL|$name|fetch failed ($url)"; return; }
  size=$(wc -c < "$tmpfile" 2>/dev/null || echo 0)

  # 1. Blank page
  if [[ $size -lt 2000 ]]; then
    issues+=("page too small: ${size} bytes")
  fi

  # 2. Server error keywords (only in first 4KB, avoid JS bundle false positives)
  if head -c 4096 "$tmpfile" | grep -qi "application error\|500 internal server\|unhandledrejection"; then
    issues+=("server error in page head")
  fi

  # 3. Next.js runtime error page
  if head -c 4096 "$tmpfile" | grep -qi "Build Error\|Module not found\|Failed to compile"; then
    issues+=("Next.js build error visible")
  fi

  # 4. Dark theme check — verify the expected dark color appears anywhere in the page
  if [[ -n "$expected_dark" && "${SKIP_THEME:-}" != "1" ]]; then
    if ! grep -qF "$expected_dark" "$tmpfile"; then
      issues+=("DARK THEME MISSING: expected '$expected_dark' not found in page")
    fi
  fi

  # 5. Missing <title> (Next.js should always have one via metadata)
  if ! grep -qi "<title[^>]*>[^<]" "$tmpfile"; then
    issues+=("no <title> content")
  fi

  if [[ ${#issues[@]} -eq 0 ]]; then
    echo "OK|$name|${size} bytes"
  else
    local issue_str
    printf -v issue_str '%s;' "${issues[@]}"
    echo "FAIL|$name|${issue_str%;}"
  fi
}

# ── Launch all checks in parallel ────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Smoke Check — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Checking ${#SITES[@]} sites in parallel..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for entry in "${SITES[@]}"; do
  IFS='|' read -r name url expected_dark <<< "$entry"
  check_one "$name" "$url" "$expected_dark" > "$TMPDIR_SMOKE/${name}.out" &
done

# Wait for all background jobs
wait

# ── Collect & display results ─────────────────────────────────────────────────
for entry in "${SITES[@]}"; do
  IFS='|' read -r name url expected_dark <<< "$entry"
  result=$(cat "$TMPDIR_SMOKE/${name}.out" 2>/dev/null || echo "FAIL|$name|no output")
  status="${result%%|*}"
  detail="${result#*|*|}"

  if [[ "$status" == "OK" ]]; then
    printf "  ✓ %-20s %s\n" "[$name]" "$detail"
    PASS=$((PASS+1))
  else
    printf "  ✗ %-20s %s\n" "[$name]" "($url)"
    IFS=';' read -ra ISSUE_LIST <<< "$detail"
    for issue in "${ISSUE_LIST[@]}"; do
      [[ -n "$issue" ]] && echo "         → $issue"
    done
    FAIL=$((FAIL+1))
    ERRORS+=("$name: $detail")
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "  Results: ✓ %d passed  ✗ %d failed\n" "$PASS" "$FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo "  FAILURES:"
  for err in "${ERRORS[@]}"; do
    echo "  • $err"
  done
  echo ""
  echo "  ⚠  Fix before shipping. Use SKIP_THEME=1 to bypass theme checks only."
  exit 1
else
  echo ""
  echo "  ✓ All sites healthy. Safe to push."
  exit 0
fi
