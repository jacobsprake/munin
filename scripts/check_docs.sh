#!/usr/bin/env bash
# Validates that documented paths in README, FOR_REVIEWERS, PERFECT_DEMO_GUIDE exist.
# Usage: ./scripts/check_docs.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

check_path() {
  local path=$1
  local desc=$2
  if [ -e "$ROOT/$path" ]; then
    echo "  OK $path"
  else
    echo "  MISSING $path ($desc)"
    FAIL=1
  fi
}

echo "Checking documented paths..."
echo ""

# From FOR_REVIEWERS Key Files
check_path "demo.sh" "end-to-end demo"
check_path "engine/run.py" "engine pipeline"
check_path "engine/detect_shadow_link.py" "shadow link detection"
check_path "engine/infer_graph.py" "graph inference"
check_path "lib/packet/types.ts" "packet types"
check_path "lib/packet/validate.ts" "packet validation"
check_path "lib/packet/diff.ts" "packet diff"
check_path "lib/packet/handshake_state_machine.ts" "handshake state machine"
check_path "samples/packets/flood_city_x" "sample packet lifecycle"
check_path "data/topology/city-x.json" "city topology"
check_path "engine/byzantine_resilience.py" "byzantine multi-sig"
check_path "engine/sovereign_handshake.py" "sovereign handshake"
check_path "playbooks" "playbooks dir"
check_path "lib/merkle.ts" "merkle chain"
check_path "lib/pqc.ts" "PQC"
check_path "lib/tee.ts" "TEE"
check_path "lib/zeroTrust.ts" "zero-trust"
check_path "app/api/ministries/route.ts" "ministry API"
check_path "lib/auth/sessions.ts" "session auth"

# Scripts
check_path "scripts/setup_demo.sh" "setup demo"
check_path "scripts/verify_demo.sh" "verify demo"
check_path "scripts/seed_demo_user.js" "seed demo user"

echo ""
if [ $FAIL -eq 0 ]; then
  echo "All documented paths exist."
  exit 0
else
  echo "Some documented paths are missing. Update docs or add files."
  exit 1
fi
