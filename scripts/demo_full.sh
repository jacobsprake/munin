#!/usr/bin/env bash
# Full demo: engine + dev server + seed. Opens browser when ready.
# Usage: ./scripts/demo_full.sh or npm run demo:full
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=============================================="
echo "  Munin – Full Demo (Engine + UI)"
echo "=============================================="
echo ""

# 1. Run engine
echo "[1/3] Running engine..."
if [ -x "$ROOT/scripts/munin" ]; then
  "$ROOT/scripts/munin" demo carlisle-2011
else
  export PYTHONPATH="${ROOT}/engine:${PYTHONPATH:-}"
  python3 "$ROOT/engine/cli.py" demo carlisle-2011
fi

# 2. Start dev server in background
echo ""
echo "[2/3] Starting dev server..."
npm run dev &
DEV_PID=$!
trap "kill $DEV_PID 2>/dev/null || true" EXIT

# 3. Wait for port 3000, then seed
echo "[3/3] Waiting for server..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null | grep -q "200"; then
    break
  fi
  sleep 1
  if [ $i -eq 30 ]; then
    echo "Timeout waiting for server. Try: npm run dev && npm run seed:demo"
    exit 1
  fi
done

node scripts/seed_demo_user.js 2>/dev/null || true

echo ""
echo "=============================================="
echo "  Ready! Open http://localhost:3000"
echo "  Login: flood_officer_01 / demo"
echo "=============================================="
echo ""
echo "Press Ctrl+C to stop the server."
wait $DEV_PID
