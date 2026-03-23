#!/usr/bin/env python3
"""
Cross-Sector Dependency Discovery Demo (SPR-266)

Fetches REAL public data from two independent infrastructure sectors:

  1. WEATHER (atmospheric):  Open-Meteo hourly precipitation + temperature
     for the Washington DC / Potomac River basin area.

  2. WATER (hydrological):   USGS river gauge readings (gage height + discharge)
     from two stations on the Potomac River:
       - 01638500  Point of Rocks, MD   (upstream, ~60 mi from DC)
       - 01646500  Little Falls Pump Sta (downstream, near DC)

The demo aligns both datasets on a common hourly time axis, then runs
Munin's infer_graph engine to discover whether a shadow link exists
between the weather sector and the water sector — i.e., a dependency
that is physically real but not declared in any asset registry.

Data sources:
  - https://open-meteo.com  (no API key required)
  - https://waterservices.usgs.gov  (no API key required)
"""
from __future__ import annotations

import sys
import json
import time
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd
import numpy as np
import requests

# Engine lives in same dir as this script
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Potomac River basin — latitude/longitude for Open-Meteo weather grid
WEATHER_LAT = 38.95
WEATHER_LON = -77.13

# USGS gauge stations on the Potomac
USGS_STATIONS = [
    {
        "site_no": "01638500",
        "node_id": "usgs_potomac_upstream",
        "label": "Potomac River at Point of Rocks, MD (upstream)",
    },
    {
        "site_no": "01646500",
        "node_id": "usgs_potomac_downstream",
        "label": "Potomac River nr Washington DC, Little Falls (downstream)",
    },
]

# How many days of history to request
LOOKBACK_DAYS = 7


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def fetch_weather(cache_dir: Path | None = None) -> pd.DataFrame:
    """Fetch hourly weather from Open-Meteo (no key required).

    Returns a DataFrame indexed by UTC datetime with columns:
        weather_precip_mm, weather_temp_c, weather_wind_kmh
    """
    cache_file = cache_dir / "weather.csv" if cache_dir else None
    if cache_file and cache_file.exists():
        df = pd.read_csv(cache_file, index_col=0, parse_dates=True)
        print(f"  [cache hit] weather: {len(df)} rows")
        return df

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={WEATHER_LAT}&longitude={WEATHER_LON}"
        "&hourly=temperature_2m,precipitation,wind_speed_10m"
        f"&past_days={LOOKBACK_DAYS}&forecast_days=0"
        "&timezone=UTC"
    )
    print(f"  Fetching weather from Open-Meteo …")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()["hourly"]

    df = pd.DataFrame({
        "weather_precip_mm": data["precipitation"],
        "weather_temp_c": data["temperature_2m"],
        "weather_wind_kmh": data["wind_speed_10m"],
    }, index=pd.to_datetime(data["time"], utc=True))
    df.index.name = "timestamp"

    if cache_file:
        cache_dir.mkdir(parents=True, exist_ok=True)
        df.to_csv(cache_file)
    print(f"  Weather: {len(df)} hourly readings, "
          f"{df.index.min().date()} to {df.index.max().date()}")
    return df


def fetch_usgs_gauge(
    site_no: str,
    param_cd: str = "00065",
    cache_dir: Path | None = None,
) -> pd.Series:
    """Fetch instantaneous values from USGS waterservices.

    Default param 00065 = gage height (ft).
    Returns a Series indexed by UTC datetime.
    """
    cache_file = (
        cache_dir / f"usgs_{site_no}_{param_cd}.csv" if cache_dir else None
    )
    if cache_file and cache_file.exists():
        s = pd.read_csv(cache_file, index_col=0, parse_dates=True).iloc[:, 0]
        print(f"  [cache hit] USGS {site_no}: {len(s)} rows")
        return s

    url = (
        "https://waterservices.usgs.gov/nwis/iv/"
        f"?format=json&sites={site_no}"
        f"&parameterCd={param_cd}"
        f"&period=P{LOOKBACK_DAYS}D"
    )
    print(f"  Fetching USGS site {site_no} (param {param_cd}) …")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()

    ts_list = resp.json()["value"]["timeSeries"]
    if not ts_list:
        raise RuntimeError(f"No time series returned for USGS {site_no}")

    values = ts_list[0]["values"][0]["value"]
    timestamps = [v["dateTime"] for v in values]
    readings = [float(v["value"]) for v in values]

    s = pd.Series(readings, index=pd.to_datetime(timestamps, utc=True))
    s.index.name = "timestamp"
    s.name = f"usgs_{site_no}"

    if cache_file:
        cache_dir.mkdir(parents=True, exist_ok=True)
        s.to_frame().to_csv(cache_file)

    print(f"  USGS {site_no}: {len(s)} readings, "
          f"{s.index.min().date()} to {s.index.max().date()}")
    return s


# ---------------------------------------------------------------------------
# Alignment
# ---------------------------------------------------------------------------

def align_to_hourly(
    weather_df: pd.DataFrame,
    gauge_series: dict[str, pd.Series],
) -> pd.DataFrame:
    """Resample everything to hourly and join on common timestamps.

    Weather is already hourly.  USGS gauges (5- or 15-min) are averaged
    per hour.
    """
    # Weather is already hourly — just ensure UTC
    combined = weather_df.copy()

    for node_id, series in gauge_series.items():
        hourly = series.resample("1h").mean()
        combined[node_id] = hourly

    # Add derived features that capture physics better:
    # Rivers respond to *accumulated* rainfall, not single-hour pulses.
    if "weather_precip_mm" in combined.columns:
        combined["weather_precip_6h_sum"] = (
            combined["weather_precip_mm"].rolling(6, min_periods=1).sum()
        )
        combined["weather_precip_12h_sum"] = (
            combined["weather_precip_mm"].rolling(12, min_periods=1).sum()
        )

    # Drop rows where ANY column is NaN (keeps only overlapping hours)
    combined = combined.dropna()
    return combined


# ---------------------------------------------------------------------------
# Main demo
# ---------------------------------------------------------------------------

def run_cross_sector_demo() -> int:
    """Run the cross-sector demo end-to-end.  Returns 0 on success."""
    from infer_graph import infer_edges, create_nodes_from_data, is_shadow_link
    from config import get_config

    print("=" * 64)
    print("Munin Cross-Sector Discovery Demo  (SPR-266)")
    print("Sectors: WEATHER (atmospheric)  ↔  WATER (hydrological)")
    print("=" * 64)
    print()

    out_dir = SCRIPT_DIR / "out" / "demo_cross_sector"
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = out_dir / "cache"

    # ------------------------------------------------------------------
    # 1. Fetch data from both sectors
    # ------------------------------------------------------------------
    print("── Step 1: Fetch real-time public data ──")
    try:
        weather_df = fetch_weather(cache_dir)
    except Exception as e:
        print(f"  ERROR fetching weather: {e}")
        return 1

    gauge_series: dict[str, pd.Series] = {}
    for station in USGS_STATIONS:
        try:
            # Gage height (water level)
            s = fetch_usgs_gauge(station["site_no"], "00065", cache_dir)
            gauge_series[station["node_id"]] = s
        except Exception as e:
            print(f"  WARNING: USGS {station['site_no']} gage height failed: {e}")

        try:
            # Discharge (flow rate) — different physical quantity, same sector
            s = fetch_usgs_gauge(station["site_no"], "00060", cache_dir)
            gauge_series[f"{station['node_id']}_flow"] = s
        except Exception as e:
            print(f"  WARNING: USGS {station['site_no']} discharge failed: {e}")

    if not gauge_series:
        print("  ERROR: no USGS data available.  Cannot proceed.")
        return 1

    print()

    # ------------------------------------------------------------------
    # 2. Align to common hourly grid
    # ------------------------------------------------------------------
    print("── Step 2: Align to common hourly time axis ──")
    combined = align_to_hourly(weather_df, gauge_series)
    print(f"  Combined dataset: {combined.shape[0]} hours × {combined.shape[1]} columns")
    print(f"  Columns: {list(combined.columns)}")
    print(f"  Date range: {combined.index.min()} → {combined.index.max()}")

    if combined.shape[0] < 24:
        print("  ERROR: fewer than 24 overlapping hours — not enough data.")
        return 1

    # Save the combined CSV for reproducibility
    csv_path = out_dir / "cross_sector_timeseries.csv"
    combined.to_csv(csv_path)
    print(f"  Saved: {csv_path}")
    print()

    # ------------------------------------------------------------------
    # 3. Run Munin inference engine
    # ------------------------------------------------------------------
    print("── Step 3: Run shadow-link inference ──")

    # Use relaxed config for cross-sector (wider lag window, lower thresholds)
    config = get_config().graph
    config.min_correlation = 0.25      # Cross-sector correlations may be weaker
    config.min_stability = 0.0         # Fewer windows available in 7-day data
    config.max_lag_seconds = 43200     # Up to 12 hours lag (weather → river)
    config.stability_num_windows = 3   # Only 7 days of data
    config.stability_window_hours = 48
    config.top_k_edges_per_node = 6    # Allow more edges for discovery

    edges = infer_edges(combined, config=config)

    # Classify edges
    cross_sector_edges = []
    within_sector_edges = []

    weather_cols = {
        "weather_precip_mm", "weather_temp_c", "weather_wind_kmh",
        "weather_precip_6h_sum", "weather_precip_12h_sum",
    }

    for e in edges:
        src_is_weather = e["source"] in weather_cols
        tgt_is_weather = e["target"] in weather_cols
        if src_is_weather != tgt_is_weather:
            cross_sector_edges.append(e)
        else:
            within_sector_edges.append(e)

    print(f"  Total edges discovered: {len(edges)}")
    print(f"  Within-sector edges:    {len(within_sector_edges)}")
    print(f"  CROSS-SECTOR edges:     {len(cross_sector_edges)}")
    print()

    # ------------------------------------------------------------------
    # 4. Report results
    # ------------------------------------------------------------------
    print("── Step 4: Cross-Sector Shadow Links ──")
    if cross_sector_edges:
        print()
        for e in cross_sector_edges:
            src_sector = "WEATHER" if e["source"] in weather_cols else "WATER"
            tgt_sector = "WEATHER" if e["target"] in weather_cols else "WATER"
            lag_hours = e["inferredLagSeconds"] / 3600
            print(f"  SHADOW LINK DISCOVERED")
            print(f"    {e['source']}  ({src_sector})")
            print(f"      → {e['target']}  ({tgt_sector})")
            print(f"    Confidence:  {e['confidenceScore']:.3f}")
            print(f"    Lag:         {e['inferredLagSeconds']}s ({lag_hours:.1f}h)")
            print(f"    Stability:   {e['stabilityScore']:.3f}")
            if e.get("confounderNotes"):
                print(f"    Caveats:     {'; '.join(e['confounderNotes'])}")
            print()
    else:
        print("  No cross-sector edges met the confidence threshold.")
        print("  This may indicate:")
        print("    - Insufficient precipitation in the observation window")
        print("    - Lag exceeds the configured max_lag_seconds")
        print("    - River response to rainfall is dampened at these stations")
        print()

    # ------------------------------------------------------------------
    # 5. Print within-sector edges (sanity check)
    # ------------------------------------------------------------------
    if within_sector_edges:
        print("── Within-Sector Edges (sanity check) ──")
        for e in within_sector_edges:
            print(f"  {e['source']} → {e['target']}  "
                  f"(confidence={e['confidenceScore']:.3f}, "
                  f"lag={e['inferredLagSeconds']}s)")
        print()

    # ------------------------------------------------------------------
    # 6. Build and save graph JSON
    # ------------------------------------------------------------------
    # Tag nodes with sector metadata
    nodes = []
    for col in combined.columns:
        if col in weather_cols:
            sector = "weather"
            kind = "sensor"
        else:
            sector = "water"
            kind = "gauge"
        nodes.append({
            "id": col,
            "sector": sector,
            "label": col.replace("_", " ").title(),
            "kind": kind,
            "region": "potomac_basin",
            "lat": WEATHER_LAT,
            "lon": WEATHER_LON,
        })

    graph = {
        "meta": {
            "demo": "cross-sector",
            "spr": "SPR-266",
            "generated_utc": datetime.now(timezone.utc).isoformat(),
            "data_sources": [
                {
                    "name": "Open-Meteo",
                    "url": "https://open-meteo.com",
                    "type": "weather/atmospheric",
                    "auth": "none",
                },
                {
                    "name": "USGS NWIS",
                    "url": "https://waterservices.usgs.gov",
                    "type": "water/hydrological",
                    "auth": "none",
                },
            ],
            "observation_window_days": LOOKBACK_DAYS,
            "aligned_hours": combined.shape[0],
        },
        "nodes": nodes,
        "edges": edges,
        "cross_sector_summary": {
            "total_edges": len(edges),
            "cross_sector_edges": len(cross_sector_edges),
            "within_sector_edges": len(within_sector_edges),
            "shadow_links_found": len(cross_sector_edges) > 0,
        },
    }

    graph_path = out_dir / "cross_sector_graph.json"
    with open(graph_path, "w") as f:
        json.dump(graph, f, indent=2)
    print(f"  Graph saved: {graph_path}")

    # ------------------------------------------------------------------
    # 7. Summary verdict
    # ------------------------------------------------------------------
    print()
    print("=" * 64)
    if cross_sector_edges:
        print(f"RESULT: {len(cross_sector_edges)} cross-sector shadow link(s) "
              f"discovered between WEATHER and WATER sectors.")
        print("This demonstrates Munin's ability to find hidden dependencies")
        print("across independent infrastructure domains using only public data.")
    else:
        print("RESULT: No cross-sector links passed the confidence threshold.")
        print("The inference engine ran successfully on real cross-sector data.")
        print("With a more active weather period, shadow links would emerge.")
    print("=" * 64)

    return 0


if __name__ == "__main__":
    sys.exit(run_cross_sector_demo())
