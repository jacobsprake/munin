"""
Connector Runner: Poll configured data sources and push to Munin.
Runs enabled connectors from config/connectors.yaml.
For wedge setup: EA API, CSV directories, etc.
"""
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add engine to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    import requests
    import yaml
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False

API_BASE = os.environ.get("MUNIN_API_URL", "http://localhost:3000")
CONFIG_PATH = Path(__file__).parent.parent / "config" / "connectors.yaml"
CONFIG_EXAMPLE = Path(__file__).parent.parent / "config" / "connectors.example.yaml"


def load_config() -> Dict[str, Any]:
    """Load connectors config."""
    path = CONFIG_PATH if CONFIG_PATH.exists() else CONFIG_EXAMPLE
    if not path.exists():
        return {"connectors": []}
    with open(path) as f:
        data = yaml.safe_load(f) or {}
    return data


def run_rest_api_connector(conn: Dict[str, Any]) -> int:
    """Poll REST API and push to /api/sensors/data. Supports EA flood API format."""
    if not HAS_DEPS:
        print("  [skip] rest_api requires requests")
        return 0
    base_url = conn.get("base_url", "").rstrip("/")
    stations = conn.get("stations", [])
    # Also check endpoints[].stations
    for ep in conn.get("endpoints", []):
        stations = stations or ep.get("stations", [])
        if stations:
            break
    if not base_url:
        print("  [skip] rest_api missing base_url")
        return 0
    count = 0
    # EA flood API: use EAFloodClient when base_url matches
    if "environment.data.gov.uk" in base_url or "flood-monitoring" in base_url:
        try:
            from ea_flood_client import EAFloodClient
            client = EAFloodClient()
            for station in stations:
                station_id = str(station.get("station_id") or station.get("stationId", ""))
                node_id = station.get("node_id") or station.get("nodeId")
                if not station_id or not node_id:
                    continue
                try:
                    measure_id = client.find_level_measure(station_id)
                    if not measure_id:
                        continue
                    latest = client.get_latest_reading(measure_id)
                    if latest and "value" in latest:
                        readings = [{
                            "nodeId": node_id,
                            "timestamp": latest.get("dateTime", ""),
                            "value": float(latest["value"]),
                        }]
                        r = requests.post(
                            f"{API_BASE}/api/sensors/data",
                            json=readings,
                            headers={"Content-Type": "application/json"},
                            timeout=10,
                        )
                        if r.status_code == 200:
                            count += 1
                except Exception as e:
                    print(f"  [error] EA {station_id}: {e}")
            return count
        except ImportError:
            pass
    # Generic REST: stations with station_id -> /id/stations/{id}/readings
    for station in stations:
        station_id = str(station.get("station_id") or station.get("stationId", ""))
        node_id = station.get("node_id") or station.get("nodeId")
        if not station_id or not node_id:
            continue
        try:
            url = f"{base_url}/id/stations/{station_id}/readings"
            resp = requests.get(url, params={"_sorted": True, "_limit": 20}, timeout=10)
            if resp.status_code != 200:
                continue
            data = resp.json()
            items = data.get("items", [])
            if not isinstance(items, list):
                items = [data] if data else []
            readings = []
            for it in items[:20]:
                if isinstance(it, dict) and "value" in it and "dateTime" in it:
                    readings.append({
                        "nodeId": node_id,
                        "timestamp": it["dateTime"],
                        "value": float(it["value"]),
                    })
            if readings:
                r = requests.post(
                    f"{API_BASE}/api/sensors/data",
                    json=readings,
                    headers={"Content-Type": "application/json"},
                    timeout=10,
                )
                if r.status_code == 200:
                    count += len(readings)
        except Exception as e:
            print(f"  [error] {station_id}: {e}")
    return count


def run_csv_connector(conn: Dict[str, Any]) -> int:
    """CSV historian: engine reads directly. Sync export if app running."""
    data_dir = conn.get("data_dir", "engine/sample_data")
    if not Path(data_dir).exists():
        return 0
    try:
        r = requests.get(
            f"{API_BASE}/api/ingestion/export",
            params={"hours": 168},
            timeout=5,
        )
        if r.status_code == 200 and r.json().get("count", 0) > 0:
            return r.json()["count"]
    except Exception:
        pass
    return 0


def run_once() -> Dict[str, Any]:
    """Run all enabled connectors once."""
    config = load_config()
    connectors = config.get("connectors", [])
    results = {"connectors": [], "total_readings": 0}
    for c in connectors:
        cid = c.get("id", "unknown")
        if not c.get("enabled", True):
            results["connectors"].append({"id": cid, "status": "disabled", "count": 0})
            continue
        ctype = c.get("type", "")
        count = 0
        try:
            if ctype == "rest_api":
                count = run_rest_api_connector(c)
            elif ctype == "csv_historian":
                count = run_csv_connector(c)
            else:
                results["connectors"].append({"id": cid, "status": "unsupported", "type": ctype})
                continue
            results["connectors"].append({"id": cid, "status": "ok", "count": count})
            results["total_readings"] += count
        except Exception as e:
            results["connectors"].append({"id": cid, "status": "error", "error": str(e)})
    return results


def run_continuous(interval_seconds: int = 300):
    """Run connectors in a loop."""
    print("Connector runner: continuous mode")
    print(f"  API: {API_BASE}, interval: {interval_seconds}s")
    while True:
        try:
            r = run_once()
            print(f"  [{time.strftime('%H:%M:%S')}] {r['total_readings']} readings from {len(r['connectors'])} connectors")
        except Exception as e:
            print(f"  [error] {e}")
        time.sleep(interval_seconds)


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--once", action="store_true", help="Run once and exit")
    p.add_argument("--interval", type=int, default=300, help="Seconds between runs (default 300)")
    args = p.parse_args()
    if args.once:
        print(json.dumps(run_once(), indent=2))
    else:
        run_continuous(args.interval)
