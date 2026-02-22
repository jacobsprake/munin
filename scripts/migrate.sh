#!/usr/bin/env bash
# Run database migrations. For SQLite (default dev), migrations may be applied at runtime.
# For PostgreSQL (production), run: psql $DATABASE_URL -f migrations/001_audit_log.sql etc.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgres* ]]; then
  for f in migrations/*.sql; do
    [ -f "$f" ] && echo "Running $f..." && psql "$DATABASE_URL" -f "$f" || true
  done
else
  echo "SQLite or no DATABASE_URL: migrations applied on first run (or use node to run them)."
fi
