"""
Disaster demos: run Munin pipeline on historical cascading-failure event data.

Supports: katrina_2005, fukushima_2011, uk_floods_2007 (excluding 9/11 per product decision).

Each demo uses:
- engine/sample_data/<event_id>/  (CSVs: timestamp, node_id, value)
- engine/out/<event_id>_demo/    (graph, evidence, incidents, packets)
- playbooks/<event_id>_*.yaml    (playbook referenced in packetize)

Usage:
  python disaster_demos.py                    # run all
  python disaster_demos.py katrina_2005      # run one
"""
import sys
from pathlib import Path
from datetime import datetime
import pandas as pd
import json

script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from ingest import ingest_historian_data, normalize_timeseries
from infer_graph import build_graph
from sensor_health import assess_sensor_health, build_evidence_windows
from build_incidents import build_incidents
from packetize import packetize_incidents

EVENT_IDS = ["katrina_2005", "fukushima_2011", "uk_floods_2007"]


def run_pipeline(data_dir: Path, out_dir: Path, playbooks_dir: Path) -> bool:
    """Run full Munin pipeline; return True on success."""
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "packets").mkdir(exist_ok=True)

    try:
        df = ingest_historian_data(data_dir)
    except ValueError as e:
        print(f"  Ingest error: {e}")
        return False

    normalize_timeseries(df, out_dir / "normalized_timeseries.csv")
    build_graph(out_dir / "normalized_timeseries.csv", out_dir / "graph.json")

    with open(out_dir / "graph.json", "r") as f:
        graph = json.load(f)

    df_normalized = pd.read_csv(out_dir / "normalized_timeseries.csv", index_col=0, parse_dates=True)
    health = assess_sensor_health(df_normalized)
    evidence_windows = build_evidence_windows(df_normalized, graph["edges"])
    with open(out_dir / "evidence.json", "w") as f:
        json.dump({"windows": evidence_windows}, f, indent=2)

    build_incidents(out_dir / "graph.json", out_dir / "incidents.json")

    packetize_incidents(
        out_dir / "incidents.json",
        out_dir / "graph.json",
        out_dir / "evidence.json",
        playbooks_dir,
        out_dir / "packets",
    )

    return True


def main():
    project_root = script_dir.parent
    playbooks_dir = project_root / "playbooks"
    sample_base = script_dir / "sample_data"

    events = sys.argv[1:] if len(sys.argv) > 1 else EVENT_IDS
    for eid in events:
        if eid not in EVENT_IDS:
            print(f"Unknown event: {eid}. Use one of: {EVENT_IDS}")
            continue
        data_dir = sample_base / eid
        if not data_dir.is_dir():
            print(f"Skip {eid}: no data dir {data_dir}")
            continue
        out_dir = script_dir / "out" / f"{eid}_demo"
        print(f"\n{'='*60}")
        print(f"Running demo: {eid}")
        print(f"  Data: {data_dir}")
        print(f"  Out:  {out_dir}")
        print("=" * 60)
        if run_pipeline(data_dir, out_dir, playbooks_dir):
            n_packets = len(list((out_dir / "packets").glob("*.json")))
            print(f"  Done. Packets: {n_packets}")
        else:
            print(f"  Failed.")

    print("\nDone. View baseline timelines and Munin counterfactuals at /demos and /demos/<event-id>.")


if __name__ == "__main__":
    main()
