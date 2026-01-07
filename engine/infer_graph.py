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

def compute_stability_score(
    df: pd.DataFrame,
    source: str,
    target: str,
    window_hours: int = 24,
    num_windows: int = 5
) -> float:
    """Compute stability score by checking correlation across multiple windows."""
    if source not in df.columns or target not in df.columns:
        return 0.0
    
    source_series = df[source]
    target_series = df[target]
    
    # Split data into windows
    total_hours = (df.index.max() - df.index.min()).total_seconds() / 3600
    if total_hours < window_hours:
        return 0.0
    
    window_size = int(len(df) / num_windows)
    correlations = []
    
    for i in range(num_windows):
        start_idx = i * window_size
        end_idx = min((i + 1) * window_size, len(df))
        if end_idx - start_idx < 10:
            continue
        
        window_df = df.iloc[start_idx:end_idx]
        s1 = window_df[source].dropna()
        s2 = window_df[target].dropna()
        
        common_idx = s1.index.intersection(s2.index)
        if len(common_idx) < 10:
            continue
        
        corr = s1.loc[common_idx].corr(s2.loc[common_idx])
        if pd.notna(corr):
            correlations.append(abs(corr))
    
    if len(correlations) < 2:
        return 0.0
    
    # Stability is inverse of variance across windows
    mean_corr = np.mean(correlations)
    std_corr = np.std(correlations)
    
    if mean_corr == 0:
        return 0.0
    
    # Normalize: higher mean and lower std = higher stability
    stability = mean_corr * (1 - min(std_corr / mean_corr, 1.0))
    return float(np.clip(stability, 0.0, 1.0))

def is_shadow_link(
    source: str,
    target: str,
    registry_edges: List[Dict] = None
) -> bool:
    """Check if edge is a shadow link (not in registry)."""
    if registry_edges is None:
        # If no registry provided, mark cross-sector edges as shadow links
        # This is a heuristic: cross-sector dependencies are often undocumented
        source_sector = 'other'
        target_sector = 'other'
        
        if 'substation' in source.lower() or 'power' in source.lower():
            source_sector = 'power'
        elif 'reservoir' in source.lower() or 'pump' in source.lower():
            source_sector = 'water'
        elif 'tower' in source.lower():
            source_sector = 'telecom'
        
        if 'substation' in target.lower() or 'power' in target.lower():
            target_sector = 'power'
        elif 'reservoir' in target.lower() or 'pump' in target.lower():
            target_sector = 'water'
        elif 'tower' in target.lower():
            target_sector = 'telecom'
        
        return source_sector != target_sector and source_sector != 'other' and target_sector != 'other'
    
    # Check against registry
    for reg_edge in registry_edges:
        if (reg_edge.get('source') == source and reg_edge.get('target') == target) or \
           (reg_edge.get('source') == target and reg_edge.get('target') == source):
            return False
    
    return True

def infer_edges(
    df: pd.DataFrame,
    min_confidence: float = 0.5,
    max_edges_per_node: int = 3,
    registry_edges: List[Dict] = None
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
                stability = compute_stability_score(df, source, target)
                is_shadow = is_shadow_link(source, target, registry_edges)
                
                correlations.append({
                    'target': target,
                    'correlation': corr,
                    'lag': lag,
                    'stability': stability,
                    'is_shadow': is_shadow,
                })
        
        # Sort by absolute correlation and take top N
        correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
        for corr_data in correlations[:max_edges_per_node]:
            edge_id = f"edge_{edge_id_counter:04d}"
            edge_id_counter += 1
            
            # Determine direction based on correlation sign and lag
            # Positive correlation with lag suggests source -> target
            if corr_data['correlation'] > 0:
                # Count evidence windows (simplified: use data length)
                window_count = max(1, len(df) // (24 * 60))  # Approximate windows per day
                
                # Generate confounder notes
                confounder_notes = []
                if corr_data['stability'] < 0.5:
                    confounder_notes.append("Low stability across windows")
                if abs(corr_data['correlation']) < 0.7:
                    confounder_notes.append("Moderate correlation strength")
                
                edges.append({
                    'id': edge_id,
                    'source': source,
                    'target': corr_data['target'],
                    'confidenceScore': abs(corr_data['correlation']),
                    'inferredLagSeconds': int(corr_data['lag']),
                    'condition': None,
                    'evidenceRefs': [f"ev_{edge_id_counter}"],
                    'isShadowLink': corr_data['is_shadow'],
                    'stabilityScore': corr_data['stability'],
                    'evidenceWindowCount': window_count,
                    'confounderNotes': confounder_notes if confounder_notes else None
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

def build_graph(input_path: Path, output_path: Path, registry_path: Path = None):
    """Build dependency graph from normalized time-series."""
    df = pd.read_csv(input_path, index_col=0, parse_dates=True)
    
    # Load registry if provided
    registry_edges = None
    if registry_path and registry_path.exists():
        with open(registry_path, 'r') as f:
            registry_data = json.load(f)
            registry_edges = registry_data.get('edges', [])
    
    nodes = create_nodes_from_data(df)
    edges = infer_edges(df, registry_edges=registry_edges)
    
    graph = {
        'nodes': nodes,
        'edges': edges
    }
    
    with open(output_path, 'w') as f:
        json.dump(graph, f, indent=2)
    
    shadow_count = sum(1 for e in edges if e.get('isShadowLink', False))
    print(f"Graph saved to {output_path}: {len(nodes)} nodes, {len(edges)} edges ({shadow_count} shadow links)")

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    input_path = out_dir / "normalized_timeseries.csv"
    output_path = out_dir / "graph.json"
    
    build_graph(input_path, output_path)

