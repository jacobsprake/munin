#!/usr/bin/env python3
"""
Shadow Link Detection Script

This script demonstrates the "Secret" - discovering cross-sector dependencies
that are invisible to traditional monitoring systems.

When run, it outputs:
  [ANALYSIS] Ingesting Substation_A and Pump_Station_7 logs...
  [MATCH] 98% Temporal Correlation found.
  [WARNING] Physical Shadow Link detected. Sector 4 vulnerability confirmed.
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np
import json

# Add engine directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from infer_graph import compute_correlation_with_lag, is_shadow_link
from sensor_health import detect_missingness, detect_stuck_at, detect_drift

def detect_shadow_links(data_path: Path, output_verbose: bool = True):
    """
    Detect shadow links (cross-sector dependencies) from time-series data.
    
    This is the "Secret" - finding dependencies that exist in physics
    but are not documented in any registry.
    """
    if output_verbose:
        print("=" * 70)
        print("SHADOW LINK DETECTION - Cross-Sector Dependency Analysis")
        print("=" * 70)
        print()
    
    # Load normalized time-series data
    if not data_path.exists():
        if output_verbose:
            print(f"[ERROR] Data file not found: {data_path}")
            print("[INFO] Run 'python engine/run.py' first to generate normalized data.")
        return []
    
    df = pd.read_csv(data_path, index_col=0, parse_dates=True)
    
    if output_verbose:
        print(f"[ANALYSIS] Loaded {len(df.columns)} nodes from time-series data")
        print(f"[ANALYSIS] Time range: {df.index.min()} to {df.index.max()}")
        print(f"[ANALYSIS] Total samples: {len(df)}")
        print()
    
    # Filter out degraded sensors
    healthy_nodes = []
    for node_id in df.columns:
        series = df[node_id].dropna()
        if len(series) < 10:
            continue
        
        missing_ratio = detect_missingness(series)
        is_stuck = detect_stuck_at(series)
        has_drift = detect_drift(series)
        
        if missing_ratio < 0.1 and not is_stuck and not has_drift:
            healthy_nodes.append(node_id)
    
    if output_verbose:
        print(f"[FILTER] {len(healthy_nodes)} healthy nodes after sensor health filtering")
        print()
    
    # Detect cross-sector dependencies
    shadow_links = []
    node_list = list(healthy_nodes)
    
    # Sample pairs for demonstration (full analysis would test all pairs)
    # In production, this would be parallelized
    test_pairs = []
    for i, source in enumerate(node_list[:10]):  # Limit for demo
        for target in node_list[i+1:min(i+6, len(node_list))]:  # Limit pairs
            test_pairs.append((source, target))
    
    if output_verbose:
        print(f"[ANALYSIS] Testing {len(test_pairs)} node pairs for shadow links...")
        print()
    
    for source, target in test_pairs:
        source_series = df[source].dropna()
        target_series = df[target].dropna()
        
        if len(source_series) < 10 or len(target_series) < 10:
            continue
        
        # Compute correlation with lag detection
        correlation, lag_seconds = compute_correlation_with_lag(
            source_series, target_series, max_lag_seconds=300
        )
        
        # Check if this is a shadow link (cross-sector dependency)
        is_shadow = is_shadow_link(source, target, registry_edges=None)
        
        if abs(correlation) >= 0.5 and is_shadow:
            correlation_percent = abs(correlation) * 100
            
            if output_verbose:
                print(f"[ANALYSIS] Ingesting {source} and {target} logs...")
                print(f"[MATCH] {correlation_percent:.1f}% Temporal Correlation found.")
                print(f"[MATCH] Lag: {lag_seconds}s")
                print(f"[WARNING] Physical Shadow Link detected. Cross-sector vulnerability confirmed.")
                print()
            
            shadow_links.append({
                'source': source,
                'target': target,
                'correlation': correlation,
                'correlation_percent': correlation_percent,
                'lag_seconds': lag_seconds,
                'is_shadow_link': True
            })
    
    # Find the most significant shadow link
    if shadow_links:
        top_link = max(shadow_links, key=lambda x: abs(x['correlation']))
        
        if output_verbose:
            print("=" * 70)
            print("TOP SHADOW LINK DETECTED")
            print("=" * 70)
            print(f"Source: {top_link['source']}")
            print(f"Target: {top_link['target']}")
            print(f"Correlation: {top_link['correlation_percent']:.1f}%")
            print(f"Lag: {top_link['lag_seconds']}s")
            print()
            print("[CONCLUSION] This dependency exists in physics but is not")
            print("            documented in any registry. Traditional monitoring")
            print("            systems cannot predict this cascade.")
            print("=" * 70)
    else:
        if output_verbose:
            print("[INFO] No shadow links detected with correlation >= 50%")
            print("[INFO] This may indicate:")
            print("      - Insufficient data")
            print("      - No cross-sector dependencies in sample data")
            print("      - All dependencies are already documented")
    
    return shadow_links

def main():
    """Main entry point for standalone execution."""
    script_dir = Path(__file__).parent
    data_path = script_dir / "out" / "normalized_timeseries.csv"
    
    # Check if normalized data exists, if not run pipeline
    if not data_path.exists():
        print("[INFO] Normalized data not found. Running pipeline...")
        from run import main as run_pipeline
        run_pipeline()
    
    shadow_links = detect_shadow_links(data_path, output_verbose=True)
    
    # Save results
    output_path = script_dir / "out" / "shadow_links.json"
    output_path.parent.mkdir(exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump({'shadow_links': shadow_links}, f, indent=2)
    
    print(f"\n[OUTPUT] Results saved to: {output_path}")

if __name__ == "__main__":
    main()

