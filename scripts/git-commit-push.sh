#!/usr/bin/env bash
# One-shot: fix index (if needed), stage all, commit, push to origin main
set -e
cd "$(dirname "$0")/.."

echo "Removing stale lock if present..."
rm -f .git/index.lock

if [[ ! -f .git/index ]]; then
  echo "Rebuilding index from HEAD..."
  git reset
fi

echo "Staging all changes..."
git add -A

echo "Status:"
git status --short | head -30

echo ""
read -p "Commit message [Munin: docs, engine, API tests, playbooks, demos, UI]: " MSG
MSG="${MSG:-Munin: docs, engine, API tests, playbooks, demos, UI}"

git commit -m "$MSG"
echo "Pushing to origin main..."
git push origin main
echo "Done."
