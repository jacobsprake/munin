"""
Diode Receive Watcher: Simulates the Munin side of a data diode.
Watches a directory for new CSV/JSON files (as would arrive through a hardware diode)
and pushes readings to POST /api/sensors/data.

Usage (air-gapped deployment):
  Send side: Connector or external system writes files to /path/to/diode/send/
  Diode: Hardware transfers send/ -> receive/ (one-way)
  This script: Watches receive/, parses files, POSTs to localhost:3000/api/sensors/data

For development: Point watch_dir at a local folder; drop CSV files to simulate diode output.
"""
import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

from engine.logger import get_logger
log = get_logger(__name__)

API_BASE = os.environ.get("MUNIN_API_URL", "http://localhost:3000")
WATCH_DIR = Path(os.environ.get("MUNIN_DIODE_RECEIVE_DIR", "/var/munin/diode/receive"))
POLL_INTERVAL = int(os.environ.get("MUNIN_DIODE_POLL_SEC", "5"))


def parse_csv_file(path: Path) -> list:
    """Parse CSV with timestamp,node_id,value format."""
    rows = []
    with open(path) as f:
        lines = f.read().strip().split("\n")
    if len(lines) < 2:
        return rows
    headers = [h.strip() for h in lines[0].split(",")]
    node_col = "node_id" if "node_id" in headers else ("nodeId" if "nodeId" in headers else None)
    ts_col = "timestamp"
    val_col = "value"
    if not node_col or ts_col not in headers or val_col not in headers:
        return rows
    node_idx = headers.index(node_col)
    ts_idx = headers.index(ts_col)
    val_idx = headers.index(val_col)
    for line in lines[1:]:
        parts = line.split(",")
        if len(parts) <= max(node_idx, ts_idx, val_idx):
            continue
        try:
            rows.append({
                "nodeId": parts[node_idx].strip(),
                "timestamp": parts[ts_idx].strip().replace(" ", "T")[:19] + "Z",
                "value": float(parts[val_idx].strip()),
            })
        except (ValueError, IndexError):
            continue
    return rows


def parse_json_file(path: Path) -> list:
    """Parse JSON array of {nodeId, timestamp, value}."""
    with open(path) as f:
        data = json.load(f)
    if isinstance(data, list):
        return [r for r in data if "nodeId" in r and "value" in r and "timestamp" in r]
    if isinstance(data, dict) and "readings" in data:
        return data["readings"]
    return []


def process_file(path: Path) -> int:
    """Process one file and push to API. Returns count pushed."""
    if not HAS_REQUESTS:
        return 0
    ext = path.suffix.lower()
    rows = []
    if ext == ".csv":
        rows = parse_csv_file(path)
    elif ext in (".json", ".jsonl"):
        rows = parse_json_file(path)
    if not rows:
        return 0
    try:
        r = requests.post(
            f"{API_BASE}/api/sensors/data",
            json=rows,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        if r.status_code == 200:
            return len(rows)
    except Exception as e:
        log.error(f"POST failed: {e}")
    return 0


def run_watcher():
    """Watch directory and process new files."""
    WATCH_DIR.mkdir(parents=True, exist_ok=True)
    processed = set()
    log.info(f"Diode receive watcher: {WATCH_DIR} -> {API_BASE}/api/sensors/data")
    while True:
        for f in WATCH_DIR.glob("*"):
            if f.is_file() and f.suffix.lower() in (".csv", ".json", ".jsonl"):
                key = (f.name, f.stat().st_mtime)
                if key not in processed:
                    count = process_file(f)
                    if count > 0:
                        log.info(f"[{time.strftime('%H:%M:%S')}] {f.name}: {count} readings")
                    processed.add(key)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    if not HAS_REQUESTS:
        log.error("Install requests: pip install requests")
        sys.exit(1)
    run_watcher()
