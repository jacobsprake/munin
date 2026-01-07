"""Infer dependency graph from time-series correlations."""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import json

def compute_correlation_with_lag(
    series1: pd.Series,
    series2: pd.Series,
    max_lag_seconds: int = 300
) -> Tuple[float, int]:
    """Compute correlation at optimal lag offset."""
    # Align timestamps
    common_idx = series1.index.intersection(series2.index)
    if len(common_idx) < 10:
        return 0.0, 0
    
    s1 = series1.loc[common_idx].dropna()
    s2 = series2.loc[common_idx].dropna()
    
    if len(s1) < 10 or len(s2) < 10:
        return 0.0, 0
    
    # Try different lag offsets
    best_corr = 0.0
    best_lag = 0
    
    # Convert max_lag to number of samples (assuming 1-minute intervals)
    max_lag_samples = min(max_lag_seconds // 60, len(s1) // 4)
    
    for lag in range(-max_lag_samples, max_lag_samples + 1):
        if lag == 0:
            s2_shifted = s2
        elif lag > 0:
            s2_shifted = s2.shift(lag)
        else:
            s2_shifted = s2.shift(lag)
        
        # Align again after shift
        aligned_idx = s1.index.intersection(s2_shifted.index)
        if len(aligned_idx) < 10:
            continue
        
        s1_aligned = s1.loc[aligned_idx]
        s2_aligned = s2_shifted.loc[aligned_idx].dropna()
        aligned_idx = s1_aligned.index.intersection(s2_aligned.index)
        
        if len(aligned_idx) < 10:
            continue
        
        s1_final = s1_aligned.loc[aligned_idx]
        s2_final = s2_aligned.loc[aligned_idx]
        
        corr = s1_final.corr(s2_final)
        if pd.notna(corr) and abs(corr) > abs(best_corr):
            best_corr = corr
            best_lag = lag
    
    lag_seconds = abs(best_lag) * 60  # Convert to seconds
    return best_corr, lag_seconds

def infer_edges(
    df: pd.DataFrame,
    min_confidence: float = 0.5,
    max_edges_per_node: int = 3
) -> List[Dict]:
    """Infer edges between nodes based on correlation."""
    edges = []
    node_ids = df.columns.tolist()
    edge_id_counter = 0
    
    for i, source in enumerate(node_ids):
        source_series = df[source]
        correlations = []
        
        for target in node_ids[i+1:]:
            target_series = df[target]
            corr, lag = compute_correlation_with_lag(source_series, target_series)
            
            if abs(corr) >= min_confidence:
                correlations.append({
                    'target': target,
                    'correlation': corr,
                    'lag': lag,
                })
        
        # Sort by absolute correlation and take top N
        correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
        for corr_data in correlations[:max_edges_per_node]:
            edge_id = f"edge_{edge_id_counter:04d}"
            edge_id_counter += 1
            
            # Determine direction based on correlation sign and lag
            # Positive correlation with lag suggests source -> target
            if corr_data['correlation'] > 0:
                edges.append({
                    'id': edge_id,
                    'source': source,
                    'target': corr_data['target'],
                    'confidenceScore': abs(corr_data['correlation']),
                    'inferredLagSeconds': int(corr_data['lag']),
                    'condition': None,
                    'evidenceRefs': [f"ev_{edge_id_counter}"]
                })
    
    return edges

def create_nodes_from_data(df: pd.DataFrame) -> List[Dict]:
    """Create node definitions from column names."""
    nodes = []
    
    # Map node_id patterns to sectors and kinds
    sector_map = {
        'substation': 'power',
        'reservoir': 'water',
        'pump': 'water',
        'tower': 'telecom',
    }
    
    kind_map = {
        'substation': 'substation',
        'reservoir': 'reservoir',
        'pump': 'pump',
        'tower': 'tower',
    }
    
    region_map = {
        'north': 'north',
        'south': 'south',
        'east': 'east',
        'west': 'west',
        'alpha': 'north',
        'beta': 'south',
    }
    
    for node_id in df.columns:
        sector = 'other'
        kind = 'service'
        region = 'unknown'
        label = node_id.replace('_', ' ').title()
        
        for key, s in sector_map.items():
            if key in node_id.lower():
                sector = s
                kind = kind_map.get(key, 'service')
                break
        
        for key, r in region_map.items():
            if key in node_id.lower():
                region = r
                break
        
        # Mock health (would come from sensor_health in real system)
        health_score = np.random.uniform(0.7, 1.0)
        if health_score < 0.8:
            status = 'degraded'
        elif health_score < 0.9:
            status = 'warning'
        else:
            status = 'ok'
        
        nodes.append({
            'id': node_id,
            'sector': sector,
            'label': label,
            'kind': kind,
            'region': region,
            'lat': None,
            'lon': None,
            'health': {
                'score': float(health_score),
                'status': status
            }
        })
    
    return nodes

def build_graph(input_path: Path, output_path: Path):
    """Build dependency graph from normalized time-series."""
    df = pd.read_csv(input_path, index_col=0, parse_dates=True)
    
    nodes = create_nodes_from_data(df)
    edges = infer_edges(df)
    
    graph = {
        'nodes': nodes,
        'edges': edges
    }
    
    with open(output_path, 'w') as f:
        json.dump(graph, f, indent=2)
    
    print(f"Graph saved to {output_path}: {len(nodes)} nodes, {len(edges)} edges")

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    input_path = out_dir / "normalized_timeseries.csv"
    output_path = out_dir / "graph.json"
    
    build_graph(input_path, output_path)

