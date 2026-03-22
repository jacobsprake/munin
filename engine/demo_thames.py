#!/usr/bin/env python3
"""
Thames Catchment Real-Data Demo (SPR-267)

Fetches live river gauge data from the Environment Agency flood monitoring API
for three stations along the River Thames:

  - Sandford-on-Thames (1502TH) — upstream, near Oxford
  - Thames Ditton Island (3104TH) — midstream, near Esher/Kingston
  - Teddington Lock (3401TH) — downstream, tidal limit of the Thames

Runs Munin's shadow link discovery to detect physical dependencies
(water travel time) between these gauges.

Data source: https://environment.data.gov.uk/flood-monitoring
"""
from __future__ import annotations

import sys
import json
import time
from pathlib import Path
from datetime import datetime

import pandas as pd

# Engine lives in same dir as this script
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from ea_flood_client import EAFloodClient


# Thames stations: upstream to downstream
THAMES_STATIONS = [
    {
        "station_id": "1502TH",
        "measure_id": "1502TH-level-stage-i-15_min-mASD",
        "node_id": "thames_sandford",
        "label": "River Thames at Sandford-on-Thames (nr Oxford)",
    },
    {
        "station_id": "3104TH",
        "measure_id": "3104TH-level-stage-i-15_min-mAOD",
        "node_id": "thames_ditton",
        "label": "River Thames at Thames Ditton Island (nr Kingston)",
    },
    {
        "station_id": "3401TH",
        "measure_id": "3401TH-level-stage-i-15_min-mASD",
        "node_id": "thames_teddington",
        "label": "River Thames at Teddington Lock (tidal limit)",
    },
]


def fetch_thames_data(
    cache_dir: Path | None = None,
    limit: int = 500,
) -> dict[str, pd.DataFrame]:
    """
    Fetch recent readings for Thames stations from the EA API.

    Returns dict mapping node_id -> DataFrame(timestamp, value).
    """
    client = EAFloodClient(cache_dir=cache_dir)
    results: dict[str, pd.DataFrame] = {}

    for station in THAMES_STATIONS:
        node_id = station["node_id"]
        measure_id = station["measure_id"]
        label = station["label"]

        print(f"  Fetching {label}...")
        try:
            readings = client.get_readings(measure_id, limit=limit)
            if not readings:
                print(f"    Warning: no readings returned for {node_id}")
                continue

            rows = []
            for r in readings:
                try:
                    ts = pd.to_datetime(r["dateTime"])
                    val = float(r["value"])
                    rows.append({"timestamp": ts, "value": val})
                except (KeyError, ValueError):
                    continue

            df = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
            df = df.set_index("timestamp")
            df = df.rename(columns={"value": node_id})
            results[node_id] = df
            print(
                f"    {len(df)} readings  "
                f"({df.index.min().date()} to {df.index.max().date()})"
            )
        except Exception as exc:
            print(f"    Error: {exc}")
            continue

    return results


def run_thames_demo() -> int:
    """
    End-to-end Thames demo:
      1. Fetch live EA data
      2. Align time series
      3. Run shadow link / dependency discovery
      4. Print results
    """
    from infer_graph import build_graph

    print("")
    print("#" * 64)
    print("#  MUNIN DEMO – Thames Catchment (Real EA Data)")
    print("#  Stations: Sandford-on-Thames, Thames Ditton, Teddington Lock")
    print("#  Source: environment.data.gov.uk/flood-monitoring")
    print("#" * 64)
    print("")

    out_dir = SCRIPT_DIR / "out" / "demo_thames"
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = SCRIPT_DIR / "cache" / "ea_api_thames"
    cache_dir.mkdir(parents=True, exist_ok=True)

    # --- Step 1: fetch data ---
    t0 = time.perf_counter()
    print("Step 1/3  Fetching live Environment Agency data...")
    station_data = fetch_thames_data(cache_dir=cache_dir)

    if len(station_data) < 2:
        print("\nError: need at least 2 stations with data for correlation.")
        print("The EA API may be temporarily unavailable. Try again later.")
        return 1

    # --- Step 2: align and save ---
    print("\nStep 2/3  Aligning time series...")
    combined = pd.concat(station_data.values(), axis=1)
    # Forward-fill small gaps (up to 30 min / 2 intervals)
    combined = combined.ffill(limit=2)
    combined = combined.dropna()
    csv_path = out_dir / "normalized_timeseries.csv"
    combined.to_csv(csv_path)
    print(
        f"  Combined: {len(combined)} aligned readings, "
        f"{len(combined.columns)} stations"
    )

    if len(combined) < 20:
        print("\nError: too few aligned readings for meaningful correlation.")
        return 1

    # Save individual CSVs for provenance
    data_dir = out_dir / "station_csvs"
    data_dir.mkdir(exist_ok=True)
    for node_id, df in station_data.items():
        df.to_csv(data_dir / f"{node_id}.csv")

    # --- Step 3: run graph inference ---
    print("\nStep 3/3  Discovering dependencies (shadow link analysis)...")
    build_graph(csv_path, out_dir / "graph.json")

    with open(out_dir / "graph.json") as f:
        graph = json.load(f)

    edges = graph.get("edges", [])
    elapsed = time.perf_counter() - t0

    # --- Results ---
    print("")
    print("=" * 64)
    print("  RESULTS – Thames Catchment Dependency Discovery")
    print("=" * 64)
    print("")

    if edges:
        for e in edges:
            shadow_tag = " [SHADOW LINK]" if e.get("isShadowLink") else ""
            lag_s = e.get("inferredLagSeconds", 0)
            lag_str = (
                f"{lag_s // 3600}h {(lag_s % 3600) // 60}m"
                if lag_s >= 3600
                else f"{lag_s // 60}m"
            )
            print(f"  {e['source']:25s} -> {e['target']:25s}")
            print(f"    Correlation : {e['confidenceScore']:.3f}")
            print(f"    Lag         : {lag_str} ({lag_s}s)")
            print(f"    Stability   : {e.get('stabilityScore', 0):.3f}{shadow_tag}")
            print()
    else:
        print("  No significant correlations found at current thresholds.")
        print("  This can happen during low-flow periods with little variation.")
        print()

    print("--- Interpretation ---")
    print("  The detected lag represents the physical travel time of water")
    print("  between gauges on the River Thames. Sandford (near Oxford) is")
    print("  roughly 80 km upstream of Teddington Lock (the tidal limit).")
    print("  Rainfall or releases upstream propagate downstream with a")
    print("  measurable delay — exactly the kind of hidden dependency")
    print("  that Munin discovers automatically.")
    print("")
    print("  Data source: https://environment.data.gov.uk/flood-monitoring")
    print("  No synthetic data. No simulation. Real sensor readings.")
    print(f"  Analysis completed in {elapsed:.1f}s")
    print("")
    print("#" * 64)
    print("#  THAMES DEMO COMPLETE")
    print(f"#  Output: {out_dir}")
    print("#" * 64)
    print("")
    return 0


if __name__ == "__main__":
    sys.exit(run_thames_demo())
