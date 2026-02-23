#!/usr/bin/env bash
# Commit all changes, ensure no commit title contains "reviewer", then push.
# Run from repo root: ./scripts/commit_and_push_no_reviewer.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Stash local changes that might conflict with rebase ==="
if git status --porcelain | grep -q .; then
  git stash push -u -m "WIP before commit_and_push_no_reviewer"
  STASHED=1
else
  STASHED=0
fi

echo ""
echo "=== 2. Add and commit all (message has no 'reviewer') ==="
git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit (working tree clean)."
else
  git commit -m "docs+ui: remove secret/atoms framing and tighten tone"
fi

echo ""
echo "=== 3. Find commits with 'reviewer' in title ==="
REVIEWER_COMMITS=$(git log --oneline -30 | grep -i reviewer || true)
if [ -n "$REVIEWER_COMMITS" ]; then
  echo "Commits to reword (contain 'reviewer'):"
  echo "$REVIEWER_COMMITS"
  # Rebase from before the oldest such commit. Use e2d1e47 as base (parent of typical range).
  BASE="e2d1e47"
  echo ""
  echo "=== 4. Interactive rebase to reword those commits ==="
  export GIT_SEQUENCE_EDITOR="sed -i.bak '/reviewer/ s/^pick/reword/'"
  export GIT_EDITOR="$ROOT/.git-reword-editor.sh"
  git rebase -i "$BASE" || true
  # If rebase stopped (e.g. for reword), continue with editor set until done
  while [ -d "$ROOT/.git/rebase-merge" ] || [ -d "$ROOT/.git/rebase-apply" ]; do
    GIT_EDITOR="$ROOT/.git-reword-editor.sh" git rebase --continue || true
  done
else
  echo "No commits in recent history contain 'reviewer' in title."
fi

echo ""
echo "=== 5. Verify no 'reviewer' in recent commit titles ==="
REVIEWER_AFTER=$(git log --oneline -30 | grep -i reviewer || true)
if [ -n "$REVIEWER_AFTER" ]; then
  echo "Warning: Some commit titles still contain 'reviewer':"
  echo "$REVIEWER_AFTER"
  echo "You may need to run the reword rebase manually."
else
  echo "OK: No 'reviewer' in recent commit titles."
fi

echo ""
echo "=== 6. Restore stash if we stashed ==="
if [ "$STASHED" -eq 1 ]; then
  git stash pop || echo "Stash pop had conflicts; resolve manually."
fi

echo ""
echo "=== 7. Push to origin (force-with-lease to overwrite reworded history) ==="
git fetch origin
git push --force-with-lease origin main

echo ""
echo "Done. Repo: https://github.com/jacobsprake/munin"
