#!/usr/bin/env bash
# Run the Python engine pipeline. Uses venv if present.
set -e
cd "$(dirname "$0")/.."
if [ -d "venv" ]; then
  source venv/bin/activate
fi
python engine/run.py
