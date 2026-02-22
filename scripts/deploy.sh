#!/usr/bin/env bash
# Deploy: run migrations, then start app (or build and run container).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Running migrations..."
if [ -f "$ROOT/scripts/migrate.sh" ]; then
  "$ROOT/scripts/migrate.sh"
fi

if [ "$1" = "docker" ]; then
  echo "Building and starting container..."
  docker compose build
  docker compose up -d
else
  echo "Starting Next.js (npm run start)..."
  npm run start
fi
