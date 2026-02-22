#!/usr/bin/env bash
# One-command demo: runs full Munin Carlisle demo start-to-finish.
# Usage: ./demo.sh
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
echo ""
echo "=============================================="
echo "  Munin – One-Command Demo"
echo "=============================================="
echo ""

# Run demo (uses venv if present)
if [ -x "$ROOT/scripts/munin" ]; then
  "$ROOT/scripts/munin" demo carlisle-2011
else
  export PYTHONPATH="${ROOT}/engine:${PYTHONPATH:-}"
  python3 "$ROOT/engine/cli.py" demo carlisle-2011
fi

echo ""
echo "Optional: open cascade animation (if generated):"
echo "  open engine/out/demo_carlisle/cascade_animation.html"
echo "  or: ./scripts/munin viz cascade && open engine/out/demo_carlisle/cascade_animation.html"
echo ""
