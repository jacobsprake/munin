#!/bin/bash
# Scheduled audit log export - run via cron.
# Example: 0 2 * * * /path/to/scripts/export_audit_scheduled.sh
# Output: data/audit_exports/audit_YYYYMMDD_HHMMSS.json

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${REPO_ROOT}/data/audit_exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUT_FILE="${OUT_DIR}/audit_${TIMESTAMP}.json"

mkdir -p "$OUT_DIR"

# Call API if server is running
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health" 2>/dev/null | grep -q 200; then
  curl -s "http://localhost:3000/api/audit/log?limit=10000" | jq '.entries' > "$OUT_FILE" 2>/dev/null || \
  curl -s "http://localhost:3000/api/audit/log?limit=10000" > "$OUT_FILE"
  echo "Exported audit to $OUT_FILE"
else
  # Fallback: copy from engine/out if exists
  if [ -f "${REPO_ROOT}/engine/out/audit.jsonl" ]; then
    jq -s '.' <(while read -r line; do echo "$line"; done < "${REPO_ROOT}/engine/out/audit.jsonl") > "$OUT_FILE" 2>/dev/null || \
    cp "${REPO_ROOT}/engine/out/audit.jsonl" "${OUT_FILE}.jsonl"
    echo "Exported from engine/out to $OUT_FILE"
  else
    echo "No server or audit file found"
    exit 1
  fi
fi
