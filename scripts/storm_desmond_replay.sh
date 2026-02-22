#!/usr/bin/env bash
# Storm Desmond historical replay (roadmap item 13)
# Runs Carlisle demo with 2015 Storm Desmond date window.
# Note: EA API may not expose 2015 historical data; use sample_data or EA archive dumps if needed.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENGINE_DIR="$REPO_ROOT/engine"
DATA_DIR="$ENGINE_DIR/sample_data/carlisle"
OUT_DIR="$ENGINE_DIR/out/carlisle_demo"

# Storm Desmond: 5–7 Dec 2015
export STORM_DESMOND_START="2015-12-05"
export STORM_DESMOND_END="2015-12-07"

echo "=== Storm Desmond replay (2015) ==="
echo "Date window: $STORM_DESMOND_START to $STORM_DESMOND_END"
echo ""

# If sample data for 2015 exists, run pipeline on it
if [ -d "$DATA_DIR" ] && [ -n "$(ls -A "$DATA_DIR" 2>/dev/null)" ]; then
  echo "Using sample data in $DATA_DIR"
  cd "$REPO_ROOT" && python3 -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('engine').resolve()))
from carlisle_demo import run_munin_pipeline, analyze_playbook_performance
data_dir = Path('engine/sample_data/carlisle')
out_dir = Path('engine/out/carlisle_demo')
playbooks_dir = Path('playbooks')
run_munin_pipeline(data_dir, out_dir, playbooks_dir)
analyze_playbook_performance(out_dir)
print('Time savings vs traditional: document in CARLISLE_DEMO_SUMMARY.md')
"
  echo ""
  echo "Replay complete. Output: $OUT_DIR"
else
  echo "No sample data in $DATA_DIR."
  echo "For full Storm Desmond (2015) replay:"
  echo "  1. Add 2015 EA archive CSVs to engine/sample_data/carlisle/ (columns: timestamp,node_id,value)"
  echo "  2. Re-run: $0"
  echo ""
  echo "Running standard Carlisle demo (recent 7 days) instead..."
  cd "$REPO_ROOT" && python3 engine/carlisle_demo.py
fi
