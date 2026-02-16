"""Inject sensor degradation for demo purposes."""
import pandas as pd
import numpy as np
from typing import Dict, Optional
from config import RNGConfig

# Use deterministic RNG for degradation injection
_rng_config = RNGConfig(base_seed=42, synthetic_seed_offset=3000)

def inject_drift(df: pd.DataFrame, node_id: str, drift_rate: float = 0.1) -> pd.DataFrame:
    """Inject drift into a sensor signal."""
    if node_id not in df.columns:
        return df
    
    df_copy = df.copy()
    series = df_copy[node_id].copy()
    
    # Add linear drift
    n_samples = len(series.dropna())
    if n_samples > 0:
        drift_values = np.linspace(0, drift_rate * series.abs().mean(), n_samples)
        non_na_mask = ~series.isna()
        series.loc[non_na_mask] = series.loc[non_na_mask] + drift_values
    
    df_copy[node_id] = series
    return df_copy

def inject_missingness(df: pd.DataFrame, node_id: str, missing_rate: float = 0.2) -> pd.DataFrame:
    """Inject missing values into a sensor signal."""
    if node_id not in df.columns:
        return df
    
    df_copy = df.copy()
    series = df_copy[node_id].copy()
    
    # Randomly set values to NaN (deterministic based on node_id)
    n_missing = int(len(series) * missing_rate)
    # Use deterministic RNG seeded by node_id for reproducibility
    import hashlib
    node_seed = int(hashlib.md5(node_id.encode()).hexdigest()[:8], 16) + _rng_config.get_synthetic_seed()
    rng = np.random.RandomState(node_seed % (2**31))
    missing_indices = rng.choice(series.index, size=n_missing, replace=False)
    series.loc[missing_indices] = np.nan
    
    df_copy[node_id] = series
    return df_copy

def inject_stuck_at(df: pd.DataFrame, node_id: str, stuck_value: Optional[float] = None) -> pd.DataFrame:
    """Inject stuck-at behavior into a sensor signal."""
    if node_id not in df.columns:
        return df
    
    df_copy = df.copy()
    series = df_copy[node_id].copy()
    
    # Set to a constant value (use median if not specified)
    if stuck_value is None:
        stuck_value = series.median()
    
    # Stuck after some point in time
    stuck_start_idx = len(series) // 2
    series.iloc[stuck_start_idx:] = stuck_value
    
    df_copy[node_id] = series
    return df_copy

def inject_timestamp_skew(df: pd.DataFrame, node_id: str, skew_seconds: int = 60) -> pd.DataFrame:
    """Inject timestamp skew (simulated by shifting values)."""
    if node_id not in df.columns:
        return df
    
    df_copy = df.copy()
    series = df_copy[node_id].copy()
    
    # Shift the series by skew_seconds worth of samples
    # Assuming 1-minute intervals
    shift_samples = skew_seconds // 60
    if shift_samples > 0:
        series = series.shift(shift_samples)
    
    df_copy[node_id] = series
    return df_copy

def apply_degradation_mode(
    df: pd.DataFrame,
    mode: str,
    node_ids: Optional[list] = None
) -> pd.DataFrame:
    """Apply a degradation mode to specified nodes."""
    if mode is None or mode == "none":
        return df
    
    if node_ids is None:
        # Apply to all nodes
        node_ids = df.columns.tolist()
    
    df_result = df.copy()
    
    for node_id in node_ids:
        if node_id not in df.columns:
            continue
        
        if mode == "drift":
            df_result = inject_drift(df_result, node_id, drift_rate=0.15)
        elif mode == "missingness":
            df_result = inject_missingness(df_result, node_id, missing_rate=0.25)
        elif mode == "stuck_at":
            df_result = inject_stuck_at(df_result, node_id)
        elif mode == "timestamp_skew":
            df_result = inject_timestamp_skew(df_result, node_id, skew_seconds=120)
        elif mode == "combined":
            # Apply multiple degradations
            df_result = inject_drift(df_result, node_id, drift_rate=0.1)
            df_result = inject_missingness(df_result, node_id, missing_rate=0.15)
    
    return df_result


