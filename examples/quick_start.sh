#!/usr/bin/env bash
# Quick start: run all three Munin demos back-to-back
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MUNIN="$ROOT/scripts/munin"

echo ""
echo "================================================================"
echo "  Munin Quick Start — Three Demos"
echo "================================================================"
echo ""

# 1. Carlisle flood demo (synthetic Storm Desmond data)
echo "--- Demo 1: Carlisle Flood (Synthetic) ---"
"$MUNIN" demo carlisle
echo ""

# 2. Real EA data demo (live Environment Agency readings)
echo "--- Demo 2: Real Environment Agency Data ---"
"$MUNIN" demo real-data
echo ""

# 3. Digital twin simulation
echo "--- Demo 3: Digital Twin (48h, substation trip at T+12h) ---"
"$MUNIN" twin 24
echo ""

# 4. Inspect results
echo "--- Inspecting Results ---"
echo ""
echo "Graph from Carlisle demo:"
"$MUNIN" graph show engine/out/demo_carlisle/graph.json
echo ""

# Show a packet
PACKET=$(ls engine/out/demo_carlisle/packets/*.json 2>/dev/null | head -1)
if [ -n "$PACKET" ]; then
  echo "Verifying first packet:"
  "$MUNIN" packet verify "$PACKET"
fi

echo ""
echo "================================================================"
echo "  All demos complete. Outputs in engine/out/"
echo "================================================================"
echo ""
