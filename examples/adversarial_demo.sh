#!/usr/bin/env bash
# Run adversarial attacks against the Munin pipeline
# Tests whether sensor health filtering catches injected attacks
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MUNIN="$ROOT/scripts/munin"

echo ""
echo "================================================================"
echo "  Munin Adversarial Testing Demo"
echo "================================================================"
echo ""
echo "  Running spoofed sensor, stuck-at, timestamp manipulation,"
echo "  replay attack, and correlation injection against the pipeline."
echo "  Each attack modifies the input data and checks whether"
echo "  sensor health filtering detects the manipulation."
echo ""

"$MUNIN" redteam engine/sample_data/carlisle_storm_desmond --attack all

echo ""
echo "================================================================"
echo "  Adversarial testing complete."
echo "================================================================"
