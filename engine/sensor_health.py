"""Detect sensor degradation: missingness, stuck-at, drift."""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List
import json

def detect_missingness(series: pd.Series, threshold: float = 0.1) -> bool:
    """
    Detect if series has excessive missing values.
    
    Threshold rationale (based on realistic SCADA distributions):
    - < 5% missing: Normal operational variance (network hiccups, brief outages)
    - 5-10% missing: Degraded but acceptable (scheduled maintenance windows)
    - > 10% missing: Significant data loss, may produce false correlations
    """
    missing_ratio = series.isna().sum() / len(series)
    return missing_ratio > threshold

def detect_stuck_at(series: pd.Series, threshold: float = 0.01) -> bool:
    """
    Detect if series variance is near zero (stuck sensor).
    
    Threshold rationale:
    - CV < 0.01: Sensor likely stuck at constant value
    - Realistic SCADA sensors show CV > 0.05 even for stable processes
    - Stuck sensors create spurious correlations with other stuck sensors
    """
    if len(series.dropna()) < 10:
        return True
    variance = series.var()
    mean_abs = series.abs().mean()
    if mean_abs == 0:
        return True
    cv = variance / (mean_abs + 1e-10)  # Coefficient of variation
    return cv < threshold

def detect_drift(series: pd.Series, window_size: int = 10, multiplier: float = 2.0) -> bool:
    """
    Detect if rolling mean shows significant shift (calibration drift).
    
    Threshold rationale:
    - 2 * std_pooled: Standard statistical test for significant mean shift
    - Calibration drift creates time-varying correlations that break graph stability
    - Realistic SCADA sensors maintain calibration within 1-2 std deviations
    """
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
    
    # Drift if mean shift is > multiplier * standard deviations
    return mean_diff > multiplier * std_pooled

def compute_observability_score(series: pd.Series) -> Dict:
    """Compute observability score and drivers."""
    missingness_rate = series.isna().sum() / len(series) if len(series) > 0 else 1.0
    
    # Noise score (coefficient of variation)
    clean_series = series.dropna()
    if len(clean_series) < 10:
        noise_score = 1.0
    else:
        variance = clean_series.var()
        mean_abs = clean_series.abs().mean()
        if mean_abs == 0:
            noise_score = 1.0
        else:
            cv = variance / (mean_abs + 1e-10)
            noise_score = min(1.0, cv * 10)  # Normalize
    
    # Drift score
    drift_score = 0.0
    if len(clean_series) >= 20:
        rolling_mean = clean_series.rolling(window=10, min_periods=5).mean()
        first_half = rolling_mean.iloc[:len(rolling_mean)//2].dropna()
        second_half = rolling_mean.iloc[len(rolling_mean)//2:].dropna()
        
        if len(first_half) > 0 and len(second_half) > 0:
            mean_diff = abs(second_half.mean() - first_half.mean())
            std_pooled = (first_half.std() + second_half.std()) / 2
            if std_pooled > 0:
                drift_score = min(1.0, mean_diff / (2 * std_pooled + 1e-10))
    
    # Timestamp skew heuristic (jitter in intervals)
    skew_score = 0.0
    if len(clean_series) >= 10:
        intervals = clean_series.index.to_series().diff().dt.total_seconds()
        expected_interval = intervals.median()
        if expected_interval > 0:
            jitter = intervals.std() / expected_interval
            skew_score = min(1.0, jitter)
    
    # Overall observability score (lower is better, so invert)
    observability_score = 1.0 - (missingness_rate * 0.4 + noise_score * 0.3 + drift_score * 0.2 + skew_score * 0.1)
    observability_score = max(0.0, min(1.0, observability_score))
    
    drivers = []
    if missingness_rate > 0.1:
        drivers.append(f"Missingness: {missingness_rate:.1%}")
    if noise_score > 0.3:
        drivers.append(f"Noise: {noise_score:.2f}")
    if drift_score > 0.2:
        drivers.append(f"Drift: {drift_score:.2f}")
    if skew_score > 0.2:
        drivers.append(f"Timestamp skew: {skew_score:.2f}")
    
    return {
        'score': float(observability_score),
        'drivers': drivers
    }

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
        
        observability = compute_observability_score(series)
        
        health_report[node_id] = {
            'status': status,
            'score': float(score),
            'issues': issues,
            'observability': observability
        }
    
    return health_report

def compute_quality_context(
    source_series: pd.Series,
    target_series: pd.Series,
    window_idx: pd.Index
) -> Dict:
    """Compute quality context for an evidence window."""
    s1_window = source_series.loc[window_idx]
    s2_window = target_series.loc[window_idx]
    
    # Missingness
    missingness = (s1_window.isna().sum() + s2_window.isna().sum()) / (2 * len(window_idx))
    
    # Noise score
    s1_clean = s1_window.dropna()
    s2_clean = s2_window.dropna()
    
    noise_scores = []
    for s in [s1_clean, s2_clean]:
        if len(s) > 10:
            variance = s.var()
            mean_abs = s.abs().mean()
            if mean_abs > 0:
                cv = variance / mean_abs
                noise_scores.append(min(1.0, cv * 10))
    
    noise_score = np.mean(noise_scores) if noise_scores else 0.5
    
    # Drift score (simplified)
    drift_score = 0.0
    if len(s1_clean) >= 20:
        rolling_mean = s1_clean.rolling(window=10, min_periods=5).mean()
        if len(rolling_mean.dropna()) >= 2:
            first_half = rolling_mean.iloc[:len(rolling_mean)//2].dropna()
            second_half = rolling_mean.iloc[len(rolling_mean)//2:].dropna()
            if len(first_half) > 0 and len(second_half) > 0:
                mean_diff = abs(second_half.mean() - first_half.mean())
                std_pooled = (first_half.std() + second_half.std()) / 2
                if std_pooled > 0:
                    drift_score = min(1.0, mean_diff / (2 * std_pooled + 1e-10))
    
    return {
        'missingness': float(missingness),
        'noiseScore': float(noise_score),
        'driftScore': float(drift_score)
    }

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
        
        # Create multiple evidence windows
        total_hours = (df.index.max() - df.index.min()).total_seconds() / 3600
        num_windows = max(1, int(total_hours / window_hours))
        window_size = len(df) // num_windows
        
        for i in range(num_windows):
            start_idx = i * window_size
            end_idx = min((i + 1) * window_size, len(df))
            if end_idx - start_idx < 10:
                continue
            
            window_df = df.iloc[start_idx:end_idx]
            start_ts = window_df.index.min()
            end_ts = window_df.index.max()
            
            # Compute correlation in this window
            common_idx = source_series.index.intersection(target_series.index)
            window_common = common_idx.intersection(window_df.index)
            
            if len(window_common) > 10:
                s1 = source_series.loc[window_common].dropna()
                s2 = target_series.loc[window_common].dropna()
                aligned_idx = s1.index.intersection(s2.index)
                
                if len(aligned_idx) > 10:
                    corr = s1.loc[aligned_idx].corr(s2.loc[aligned_idx])
                    if pd.notna(corr):
                        ev_id = f"ev_{ev_id_counter:04d}"
                        ev_id_counter += 1
                        
                        quality_context = compute_quality_context(
                            source_series, target_series, aligned_idx
                        )
                        
                        # Determine support type (simplified: positive correlation = support)
                        support_type = "support" if corr > 0.3 else "counterexample"
                        
                        evidence_windows.append({
                            'id': ev_id,
                            'edgeId': edge['id'],
                            'startTs': start_ts.isoformat(),
                            'endTs': end_ts.isoformat(),
                            'correlation': float(corr),
                            'lagSeconds': int(edge.get('inferredLagSeconds', 0)),
                            'robustness': float(edge.get('confidenceScore', 0.5)),
                            'notes': f"Window {i+1}/{num_windows}: {len(aligned_idx)} samples",
                            'qualityContext': quality_context,
                            'supportType': support_type
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

