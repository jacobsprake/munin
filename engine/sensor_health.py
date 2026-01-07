"""Detect sensor degradation: missingness, stuck-at, drift."""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List
import json

def detect_missingness(series: pd.Series, threshold: float = 0.1) -> bool:
    """Detect if series has excessive missing values."""
    missing_ratio = series.isna().sum() / len(series)
    return missing_ratio > threshold

def detect_stuck_at(series: pd.Series, threshold: float = 0.01) -> bool:
    """Detect if series variance is near zero (stuck sensor)."""
    if len(series.dropna()) < 10:
        return True
    variance = series.var()
    mean_abs = series.abs().mean()
    if mean_abs == 0:
        return True
    cv = variance / (mean_abs + 1e-10)  # Coefficient of variation
    return cv < threshold

def detect_drift(series: pd.Series, window_size: int = 10) -> bool:
    """Detect if rolling mean shows significant shift."""
    if len(series.dropna()) < window_size * 2:
        return False
    
    rolling_mean = series.rolling(window=window_size, min_periods=window_size//2).mean()
    first_half = rolling_mean.iloc[:len(rolling_mean)//2].dropna()
    second_half = rolling_mean.iloc[len(rolling_mean)//2:].dropna()
    
    if len(first_half) == 0 or len(second_half) == 0:
        return False
    
    mean_diff = abs(second_half.mean() - first_half.mean())
    std_pooled = (first_half.std() + second_half.std()) / 2
    
    if std_pooled == 0:
        return False
    
    # Drift if mean shift is > 2 standard deviations
    return mean_diff > 2 * std_pooled

def assess_sensor_health(df: pd.DataFrame) -> Dict[str, Dict]:
    """Assess health for each sensor/node."""
    health_report = {}
    
    for node_id in df.columns:
        series = df[node_id]
        
        issues = []
        if detect_missingness(series):
            issues.append('missingness')
        if detect_stuck_at(series):
            issues.append('stuck_at')
        if detect_drift(series):
            issues.append('drift')
        
        if len(issues) == 0:
            status = 'ok'
            score = 1.0
        elif len(issues) == 1:
            status = 'degraded'
            score = 0.7
        else:
            status = 'warning'
            score = 0.4
        
        health_report[node_id] = {
            'status': status,
            'score': float(score),
            'issues': issues
        }
    
    return health_report

def build_evidence_windows(
    df: pd.DataFrame,
    edges: List[Dict],
    window_hours: int = 24
) -> List[Dict]:
    """Build evidence windows for each edge."""
    evidence_windows = []
    ev_id_counter = 0
    
    for edge in edges:
        source = edge['source']
        target = edge['target']
        
        if source not in df.columns or target not in df.columns:
            continue
        
        source_series = df[source]
        target_series = df[target]
        
        # Create a single evidence window covering the data range
        start_ts = df.index.min()
        end_ts = df.index.max()
        
        # Compute correlation in this window
        common_idx = source_series.index.intersection(target_series.index)
        if len(common_idx) > 10:
            s1 = source_series.loc[common_idx].dropna()
            s2 = target_series.loc[common_idx].dropna()
            aligned_idx = s1.index.intersection(s2.index)
            
            if len(aligned_idx) > 10:
                corr = s1.loc[aligned_idx].corr(s2.loc[aligned_idx])
                if pd.notna(corr):
                    ev_id = f"ev_{ev_id_counter:04d}"
                    ev_id_counter += 1
                    
                    evidence_windows.append({
                        'id': ev_id,
                        'edgeId': edge['id'],
                        'startTs': start_ts.isoformat(),
                        'endTs': end_ts.isoformat(),
                        'correlation': float(corr),
                        'lagSeconds': int(edge['inferredLagSeconds']),
                        'robustness': float(edge['confidenceScore']),
                        'notes': f"Correlation window: {len(aligned_idx)} samples"
                    })
    
    return evidence_windows

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    
    # Load normalized data
    df = pd.read_csv(out_dir / "normalized_timeseries.csv", index_col=0, parse_dates=True)
    
    # Assess health
    health = assess_sensor_health(df)
    
    # Load graph to build evidence
    with open(out_dir / "graph.json", 'r') as f:
        graph = json.load(f)
    
    evidence_windows = build_evidence_windows(df, graph['edges'])
    
    evidence_data = {
        'windows': evidence_windows
    }
    
    with open(out_dir / "evidence.json", 'w') as f:
        json.dump(evidence_data, f, indent=2)
    
    print(f"Evidence saved: {len(evidence_windows)} windows")

