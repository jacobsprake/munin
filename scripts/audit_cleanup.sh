#!/bin/bash
# Munin Audit Cleanup Script
# Run from repository root. Review AUDIT_CLEANUP_REPORT.md before executing.
# Usage: ./scripts/audit_cleanup.sh [--dry-run]

set -e
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "DRY RUN - no changes will be made"
fi

run_cmd() {
  if $DRY_RUN; then
    echo "[DRY RUN] Would execute: $*"
  else
    "$@"
  fi
}

cd "$(dirname "$0")/.."

echo "=== Munin Audit Cleanup ==="

# 1. Remove babel.config.js.bak from git (file is duplicate, in .gitignore)
if [[ -f babel.config.js.bak ]]; then
  if git ls-files --error-unmatch babel.config.js.bak &>/dev/null; then
    run_cmd git rm --cached babel.config.js.bak
    run_cmd rm -f babel.config.js.bak
    echo "Removed babel.config.js.bak from tracking"
  else
    run_cmd rm -f babel.config.js.bak
    echo "Deleted babel.config.js.bak (was not tracked)"
  fi
else
  echo "babel.config.js.bak not found (already removed?)"
fi

# 2. Remove .hypothesis from git tracking (test cache, should not be committed)
if [[ -d .hypothesis ]] && git ls-files .hypothesis &>/dev/null | grep -q .; then
  run_cmd git rm -r --cached .hypothesis/ 2>/dev/null || true
  echo "Removed .hypothesis from git tracking"
else
  echo ".hypothesis not tracked or not present"
fi

# 3. Add .gitignore entries if missing
add_gitignore() {
  local pattern="$1"
  if ! grep -qF "$pattern" .gitignore 2>/dev/null; then
    if $DRY_RUN; then
      echo "[DRY RUN] Would add to .gitignore: $pattern"
    else
      echo "" >> .gitignore
      echo "# IDE / OS (audit cleanup)" >> .gitignore
      echo "$pattern" >> .gitignore
      echo "Added $pattern to .gitignore"
    fi
  fi
}
add_gitignore ".vscode/"
add_gitignore ".idea/"
add_gitignore "Thumbs.db"

echo ""
echo "=== Cleanup complete ==="
echo "Next steps:"
echo "  1. Review changes: git status"
echo "  2. Commit: git add -A && git commit -m 'chore: audit cleanup - remove tracked temp files, update gitignore'"
echo "  3. Consider adding .gitattributes for line endings (see AUDIT_CLEANUP_REPORT.md)"
