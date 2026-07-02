#!/usr/bin/env bash
# install-visual-qa-hook.sh
# Installs a pre-push git hook that runs visual-qa.mjs before every push.
# Run from any project dir:   bash /path/to/agents/scripts/install-visual-qa-hook.sh
# Or install for all projects: bash agents/scripts/install-visual-qa-hook.sh --all

AGENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VQA_SCRIPT="$AGENTS_DIR/scripts/visual-qa.mjs"

install_hook() {
  local dir="$1"
  local git_dir="$dir/.git"

  if [ ! -d "$git_dir" ]; then
    # Monorepo: try parent
    git_dir="$(git -C "$dir" rev-parse --git-dir 2>/dev/null)"
    if [ -z "$git_dir" ]; then
      echo "⚠  $dir — not a git repo, skipping"
      return
    fi
  fi

  local hook="$git_dir/hooks/pre-push"
  local project_name="$(basename "$dir")"

  cat > "$hook" << HOOKEOF
#!/usr/bin/env bash
# visual-qa pre-push hook — installed by install-visual-qa-hook.sh
# Runs Playwright visual QA: contrast, H1, overflow, screenshots

set -e
PROJECT_DIR="\$(git rev-parse --show-toplevel)"
PROJECT_NAME="\$(basename "\$PROJECT_DIR")"
VQA_SCRIPT="$VQA_SCRIPT"

# Check if dev server seems to already be running
PORT=\${PORT:-3000}
if lsof -i :\$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "🔍 [vqa] Using existing server on port \$PORT for \$PROJECT_NAME"
  node "\$VQA_SCRIPT" --url "http://localhost:\$PORT" --project "\$PROJECT_NAME" --no-server
else
  echo "🔍 [vqa] Starting dev server for \$PROJECT_NAME..."
  node "\$VQA_SCRIPT" --project "\$PROJECT_NAME"
fi

STATUS=\$?
if [ \$STATUS -eq 2 ]; then
  echo ""
  echo "❌ PUSH BLOCKED — visual QA failed. Fix contrast/layout issues first."
  echo "   Screenshots at: /tmp/vqa-\$PROJECT_NAME-*.png"
  echo "   Skip check (NOT recommended): git push --no-verify"
  exit 1
fi
exit 0
HOOKEOF

  chmod +x "$hook"
  echo "✅ Installed pre-push visual-qa hook → $project_name ($hook)"
}

if [ "$1" = "--all" ]; then
  echo "Installing visual-qa hooks for all Next.js projects under $AGENTS_DIR..."
  for dir in "$AGENTS_DIR"/*/; do
    if [ -f "$dir/package.json" ]; then
      # Check it's a Next.js project
      if grep -q '"next"' "$dir/package.json" 2>/dev/null; then
        install_hook "$dir"
      fi
    fi
  done
else
  # Single project — use cwd
  install_hook "${1:-$(pwd)}"
fi
