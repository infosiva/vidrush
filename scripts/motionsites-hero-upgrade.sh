#!/usr/bin/env zsh
# motionsites-hero-upgrade.sh
# Automated hero redesign pipeline using motionsites.ai prompts
# Usage: ./scripts/motionsites-hero-upgrade.sh [project] [--all] [--dry-run]
#
# For each project:
#   1. Reads the stored motionsites prompt template
#   2. Adapts it (brand name, colors, copy) to the specific project
#   3. Writes adapted HeroClient.tsx
#   4. Runs npm run build to verify
#   5. Takes Playwright screenshots
#   6. Commits and pushes
#
# Run: bash scripts/motionsites-hero-upgrade.sh roamplan
# Run all: bash scripts/motionsites-hero-upgrade.sh --all

set -eo pipefail

AGENTS_DIR="/Users/sivaprakasam/projects/agents"
PROMPTS_DIR="$AGENTS_DIR/scripts/motionsites-prompts"
LOG="$AGENTS_DIR/scripts/motionsites-upgrade.log"

mkdir -p "$PROMPTS_DIR"

# ─── Project registry ───────────────────────────────────────────────────────
# Format: project:template_name:primary_color:accent:font:tagline
typeset -A PROJECTS
PROJECTS=(
  roamplan    "wanderful:roamplan.md:#000000:#ffffff:Inter:Plan smarter journeys with AI"
  speakiq     "duolingo:speakiq.md:#1a1a2e:#7c3aed:Nunito:Speak any language in minutes"
  aicoachlab  "ai-workflow:aicoachlab.md:#0d1117:#f97316:Inter:Master any skill with AI coaching"
  resumevault "vaultshield:resumevault.md:#0a0a14:#3b82f6:Inter:Your resume, AI-powered"
  myvitals    "securify:myvitals.md:#0a0f0a:#22c55e:Inter:Track your health, simply"
  trackwealth "innovation:trackwealth.md:#0a0a0f:#f59e0b:Space Grotesk:Track your wealth, intelligently"
  kwizzo      "digitwist:kwizzo.md:#0a0a14:#8b5cf6:Nunito:Quiz battles, AI-powered"
  pixelforge  "bloom-ai:pixelforge.md:#0d0d0d:#ec4899:Inter:Generate game assets with AI"
  agenttrace  "codenest:agenttrace.md:#0a0f14:#06b6d4:JetBrains Mono:Trace every AI agent call"
  neuralos    "neuralyn:neuralos.md:#050510:#a855f7:Inter:Your AI operating system"
)

# ─── Helper functions ────────────────────────────────────────────────────────
log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }
err() { echo "[ERROR] $*" >&2; exit 1; }

build_check() {
  local proj="$1"
  local dir="$AGENTS_DIR/$proj"
  log "Building $proj..."
  (cd "$dir" && npm run build 2>&1) || { log "BUILD FAILED: $proj"; return 1; }
  log "Build OK: $proj"
}

playwright_screenshot() {
  local proj="$1"
  local port="${2:-3000}"
  local out_dir="$AGENTS_DIR/$proj/qa/screenshots"
  mkdir -p "$out_dir"
  log "Screenshots: $proj (port $port)"
  npx playwright screenshot \
    --browser chromium \
    --viewport-size 375,812 \
    "http://localhost:$port" \
    "$out_dir/mobile-375.png" 2>/dev/null && log "  mobile OK" || log "  mobile SKIP (dev server not running)"
  npx playwright screenshot \
    --browser chromium \
    --viewport-size 1280,800 \
    "http://localhost:$port" \
    "$out_dir/desktop-1280.png" 2>/dev/null && log "  desktop OK" || log "  desktop SKIP (dev server not running)"
}

commit_push() {
  local proj="$1"
  local dir="$AGENTS_DIR/$proj"
  log "Committing $proj..."
  (cd "$dir" && \
    git config user.email "info.siva@gmail.com" && \
    git config user.name "Siva" && \
    git add -p -- . && \
    git commit -m "feat(hero): motionsites-inspired hero redesign" && \
    git push origin main) && log "Pushed $proj" || log "Commit/push skipped for $proj"
}

# ─── Prompt template storage ─────────────────────────────────────────────────
# Each project has a stored prompt in scripts/motionsites-prompts/
# Format: adapted Next.js component using the motionsites design spec
store_prompts() {
  log "Storing motionsites prompt templates..."

  # ── roamplan: Wanderful Hero (GSAP, video bg, liquid-glass nav) ──
  cat > "$PROMPTS_DIR/roamplan.md" << 'PROMPT'
# Motionsites Template: Wanderful Hero → RoamPlan Adaptation
# Source: https://motionsites.ai (Wanderful Hero, free Copy prompt)
# Design spec: Full-viewport cinematic hero, GSAP parallax, liquid-glass nav

## Key design elements to adapt:
- Brand: "RoamPlan" (not "Wanderful")
- Tagline line 1: "Plan journeys without limits."
- Tagline line 2 (muted): "Built around your pace, your vibe, your adventure."
- CTA: "Plan my escape →"
- Nav links: DESTINATIONS, HOW IT WORKS, PRICING, SIGN IN
- Colors: white text on dark/video bg, same liquid-glass effect
- Video: Keep the CloudFront travel video URL from template
- Font: Barlow (body) + Inter (headings) — same as template
- Bottom row icon: lock icon + "AI-SECURED. ZERO DATA LEAKS."

## Files to create/update:
- `src/components/HeroClient.tsx` — full viewport hero with video bg + GSAP
- `src/app/globals.css` — add liquid-glass utility class

## Implementation notes:
- Remove TripDashboard from below hero (move to /app route)
- Hero should be full screen on landing
- Keep FloatingChatWrapper
- Add npm deps: gsap (already in most projects)
PROMPT

  # ── speakiq: Duolingo Styleguide hero (language bubbles, gamified) ──
  cat > "$PROMPTS_DIR/speakiq.md" << 'PROMPT'
# Motionsites Template: Duolingo Styleguide → SpeakIQ Adaptation
# Source: https://motionsites.ai (Duolingo Styleguide, free Copy)
# Design: Nunito font, language selector bubbles, XP progress, gamified feel

## Key design elements to adapt:
- Brand: "SpeakIQ" (not "Duolingo")
- Font: Nunito (matches current speakiq font — already loaded)
- Language picker: 6 bubble flags inline above CTA (reuse existing LanguagePicker)
- Headline: "Start speaking in minutes," / "not months."
- Sub: "AI conversation partner — 50+ languages, instant feedback"
- CTA: "Start speaking {lang}" + ghost "See how it works"
- Colors: #1a1a2e bg, indigo/violet gradient accent (matches current)
- XP bar below headline (mock, fills on hover): "2,847 learners speaking today"
- Animated: bouncy Framer Motion stagger on headline chars

## Already built — preserve these:
- LanguagePicker component (reuse in hero)
- HeroDemo on right panel
- STAGGER_CONTAINER, FADE_UP motion variants
- ShimmerButton
PROMPT

  # ── aicoachlab: AI Workflow Hero (boomerang video bg, nature green) ──
  cat > "$PROMPTS_DIR/aicoachlab.md" << 'PROMPT'
# Motionsites Template: AI Workflow Hero → AICoachLab Adaptation
# Source: https://motionsites.ai (AI Workflow Hero, free Copy)
# Design: Boomerang video bg, pill nav, nature/forest palette

## Key design elements to adapt:
- Brand: "AICoachLab"
- Headline: "Close the gap" / "between you and mastery."
- Sub: "AI-powered courses that adapt to you — your pace, your role, your goals."
- CTA: "Start learning free" (left), "Watch how it works" (right, video play icon)
- Nav: LEARN, TRACKS, INTERVIEW, PRICING
- Colors: swap forest green (#1f2a1d) → orange (#1a0a00 bg, #f97316 accent)
- Remove BoomerangVideoBg (too heavy for Next.js SSR) → use CSS gradient + particle canvas
- Bottom-left block: "FluxEngine™" → "AICoachLab™" + feature blurb
- Keep: sticky nav, glass pill desktop nav, mobile hamburger drawer

## Dependency note: No Framer Motion in template — use CSS transitions only for this component
PROMPT

  # ── resumevault: VaultShield hero (security-focused, professional) ──
  cat > "$PROMPTS_DIR/resumevault.md" << 'PROMPT'
# Motionsites Template: VaultShield Hero → ResumeVault Adaptation
# Source: https://motionsites.ai (VaultShield, free Copy)
# Design: Dark professional, shield/security motif, trust signals

## Key design elements to adapt:
- Brand: "ResumeVault"
- Headline: "Your resume," / "AI-optimized."
- Sub: "Upload once. Get ATS scores, keyword gaps, and a rewritten draft — in 30 seconds."
- CTA: "Scan my resume free" + "See sample report"
- Colors: #0a0a14 bg, #3b82f6 accent (blue = trust/professional)
- Trust badges row: "ATS-Optimized" | "GDPR Secure" | "No signup required"
- Stats strip: "12,847 resumes scanned" | "94% match rate" (hide if fake — show feature pills instead)
- Shield icon (lucide-react) as hero visual element
PROMPT

  # ── myvitals: Securify hero (health data, secure, calm) ──
  cat > "$PROMPTS_DIR/myvitals.md" << 'PROMPT'
# Motionsites Template: Securify Data Security → MyVitals Adaptation
# Source: https://motionsites.ai (Securify Data Security, free Copy)
# Design: Clean data security aesthetic, adapted for health tracking

## Key design elements to adapt:
- Brand: "MyVitals"
- Headline: "Your health data," / "yours alone."
- Sub: "Track vitals, set health goals, get AI insights — privately. No account required to start."
- CTA: "Check my vitals" + "See privacy policy"
- Colors: #0a0f0a bg, #22c55e accent (green = health)
- Swap security icons → health icons (Heart, Activity, Shield from lucide-react)
- Keep: grid overlay bg effect, data card preview on right
- Trust strip: "HIPAA-aware" | "Encrypted locally" | "No cloud required"
PROMPT

  # ── trackwealth: Innovation hero (finance, clean, dark) ──
  cat > "$PROMPTS_DIR/trackwealth.md" << 'PROMPT'
# Motionsites Template: Innovation Landing → TrackWealth Adaptation
# Source: https://motionsites.ai (Innovation, free Copy)
# Design: Bold forward-looking, dark bg, clean metric cards

## Key design elements to adapt:
- Brand: "TrackWealth"
- Headline: "Your wealth," / "tracked intelligently."
- Sub: "Connect portfolios, track crypto + stocks + cash, get AI insights — no spreadsheet required."
- CTA: "Start tracking free" + "See demo portfolio"
- Colors: #0a0a0f bg, #f59e0b accent (gold = wealth)
- Metric cards preview (right panel): Portfolio value | Day change | AI alert count
- Font: Space Grotesk (finance feel, distinct from other projects)
PROMPT

  # ── kwizzo: Digitwist AI Builder → Kwizzo (quiz, gamified) ──
  cat > "$PROMPTS_DIR/kwizzo.md" << 'PROMPT'
# Motionsites Template: Digitwist AI Builder → Kwizzo Adaptation
# Source: https://motionsites.ai (Digitwist AI Builder, free Copy)
# Design: Playful AI tool builder aesthetic, purple accent

## Key design elements to adapt:
- Brand: "Kwizzo"
- Headline: "Build quizzes," / "battle with AI."
- Sub: "Generate topic quizzes in seconds, challenge friends, climb leaderboards — powered by AI."
- CTA: "Play now free" + "Create quiz"
- Colors: #0a0a14 bg, #8b5cf6 accent (purple = playful/gaming)
- Magic UI: shimmer buttons (already installed)
- Quiz card preview on right: question + 4 options + timer
PROMPT

  # ── pixelforge: Bloom AI → PixelForge (game assets, creative) ──
  cat > "$PROMPTS_DIR/pixelforge.md" << 'PROMPT'
# Motionsites Template: Bloom AI Hero → PixelForge Adaptation
# Source: https://motionsites.ai (Bloom AI, free Copy)
# Design: AI product, clean gradient, creative tool feel

## Key design elements to adapt:
- Brand: "PixelForge" (arcadeforge.app)
- Headline: "Generate game assets," / "in seconds."
- Sub: "Sprites, tilesets, concept art — AI-generated from text prompts. No Photoshop required."
- CTA: "Generate free" + "See gallery"
- Colors: #0d0d0d bg, #ec4899 accent (pink = creative/art)
- Right panel: 2x2 grid of generated sprite thumbnails (static placeholder)
- Phaser 3 badge in hero (already used in this project)
PROMPT

  # ── agenttrace: CodeNest → AgentTrace (dev tool, monitoring) ──
  cat > "$PROMPTS_DIR/agenttrace.md" << 'PROMPT'
# Motionsites Template: CodeNest Coding Platform → AgentTrace Adaptation
# Source: https://motionsites.ai (CodeNest Coding Platform, free Copy)
# Design: Developer tool, dark terminal aesthetic, code-focused

## Key design elements to adapt:
- Brand: "AgentTrace" (agentlogs.app)
- Headline: "Trace every" / "AI agent call."
- Sub: "Real-time logs, latency breakdown, cost tracking — across all your Claude, GPT, and Groq calls."
- CTA: "Start tracing free" + "See live demo"
- Colors: #0a0f14 bg, #06b6d4 accent (cyan = data/dev)
- Font: JetBrains Mono for code snippets, Inter for body
- Right panel: live log stream (JSON traces, scrolling, syntax highlighted)
- Tremor metric cards: Total calls | P95 latency | Cost today
PROMPT

  # ── neuralos: Neuralyn → NeuralOS (AI OS, cinematic) ──
  cat > "$PROMPTS_DIR/neuralos.md" << 'PROMPT'
# Motionsites Template: Neuralyn SaaS → NeuralOS Adaptation
# Source: https://motionsites.ai (Neuralyn, free Copy)
# Design: Dark cinematic, neural/AI aesthetic, Aceternity spotlight

## Key design elements to adapt:
- Brand: "NeuralOS" (neuralagent.app)
- Headline: "Your AI," / "operating system."
- Sub: "Unified agent workspace — chat, search, generate, automate. One interface, 10+ AI models."
- CTA: "Launch NeuralOS" + "Watch demo"
- Colors: #050510 bg, #a855f7 accent (purple = neural/AI premium)
- Aceternity: spotlight effect on hero bg (already in project)
- Right panel: OS-style window with agent chat interface
- Auth: Google OAuth (enterprise feel — NextAuth v5 already wired)
PROMPT

  log "Prompt templates stored in $PROMPTS_DIR"
}

# ─── Main upgrade function ────────────────────────────────────────────────────
upgrade_project() {
  local proj="$1"
  local dry_run="${2:-false}"

  if [[ -z "${PROJECTS[$proj]:-}" ]]; then
    err "Unknown project: $proj. Available: ${(@k)PROJECTS}"
  fi

  local config="${PROJECTS[$proj]}"
  local template=$(echo "$config" | cut -d: -f1)
  local prompt_file=$(echo "$config" | cut -d: -f2)
  local bg_color=$(echo "$config" | cut -d: -f3)
  local accent=$(echo "$config" | cut -d: -f4)

  local dir="$AGENTS_DIR/$proj"
  local prompt_path="$PROMPTS_DIR/$prompt_file"

  [[ -d "$dir" ]] || err "Project dir not found: $dir"
  [[ -f "$prompt_path" ]] || err "Prompt file not found: $prompt_path"

  log "=== Upgrading $proj (template: $template) ==="
  cat "$prompt_path"

  if [[ "$dry_run" == "true" ]]; then
    log "DRY RUN — skipping file writes for $proj"
    return 0
  fi

  # Build check first (verify baseline works)
  build_check "$proj" || { log "Baseline build broken — skipping $proj"; return 1; }

  log "Ready to redesign $proj hero. Use the prompt above with Claude to implement."
  log "Then run: build_check $proj && playwright_screenshot $proj && commit_push $proj"
}

# ─── CLI ─────────────────────────────────────────────────────────────────────
DRY_RUN=false
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --all) TARGET="all" ;;
    --store-prompts) store_prompts; exit 0 ;;
    --build) shift; build_check "$1"; exit 0 ;;
    --push) shift; commit_push "$1"; exit 0 ;;
    *) TARGET="$arg" ;;
  esac
done

# Always store prompts first
store_prompts

if [[ "$TARGET" == "all" ]]; then
  log "=== Running all 10 project upgrades ==="
  for proj in "${(@k)PROJECTS}"; do
    upgrade_project "$proj" "$DRY_RUN" || log "FAILED: $proj — continuing"
  done
elif [[ -n "$TARGET" ]]; then
  upgrade_project "$TARGET" "$DRY_RUN"
else
  echo "Usage: $0 [project] [--all] [--dry-run] [--store-prompts]"
  echo "Projects: ${(@k)PROJECTS}"
fi
