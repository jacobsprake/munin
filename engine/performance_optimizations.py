"""
Performance optimizations for graph inference.

Implements parallelization, sparse handling, caching, and other optimizations
for scaling to national-scale telemetry.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import json
import hashlib
from functools import lru_cache
from multiprocessing import Pool, cpu_count
import joblib
from config import GraphInferenceConfig


def compute_correlation_batch(
    pairs: List[Tuple[str, str, pd.Series, pd.Series]],
    max_lag_seconds: int,
    min_samples: int
) -> List[Tuple[str, str, float, int]]:
    """Compute correlations for a batch of node pairs (for parallelization)."""
    from infer_graph import compute_correlation_with_lag
    
    results = []
    for source, target, s1, s2 in pairs:
        corr, lag = compute_correlation_with_lag(s1, s2, max_lag_seconds, min_samples)
        results.append((source, target, corr, lag))
    
    return results


def parallelize_correlation_computation(
    df: pd.DataFrame,
    node_pairs: List[Tuple[str, str]],
    max_lag_seconds: int,
    min_samples: int,
    n_jobs: Optional[int] = None
) -> Dict[Tuple[str, str], Tuple[float, int]]:
    """Parallelize correlation computation across CPU cores."""
    if n_jobs is None:
        n_jobs = max(1, cpu_count() - 1)
    
    # Prepare batches
    batch_size = max(1, len(node_pairs) // n_jobs)
    batches = []
    
    for i in range(0, len(node_pairs), batch_size):
        batch = []
        for source, target in node_pairs[i:i+batch_size]:
            batch.append((source, target, df[source], df[target]))
        batches.append(batch)
    
    # Compute in parallel
    with Pool(processes=n_jobs) as pool:
        batch_results = pool.starmap(
            compute_correlation_batch,
            [(batch, max_lag_seconds, min_samples) for batch in batches]
        )
    
    # Flatten results
    results = {}
    for batch_result in batch_results:
        for source, target, corr, lag in batch_result:
            results[(source, target)] = (corr, lag)
    
    return results


def create_sparse_timeseries(df: pd.DataFrame, sparsity_threshold: float = 0.5) -> pd.DataFrame:
    """Convert dense DataFrame to sparse representation for memory efficiency."""
    # For mostly-empty sensors, use sparse representation
    sparse_df = df.copy()
    
    for col in sparse_df.columns:
        missing_ratio = sparse_df[col].isna().sum() / len(sparse_df)
        if missing_ratio > sparsity_threshold:
            # Convert to sparse Series
            sparse_df[col] = pd.arrays.SparseArray(sparse_df[col])
    
    return sparse_df


def downsample_timeseries(
    df: pd.DataFrame,
    resample_interval: str = '5min',
    method: str = 'mean'
) -> Tuple[pd.DataFrame, Dict[str, float]]:
    """Downsample time-series with error bounds."""
    error_bounds = {}
    
    downsampled = df.resample(resample_interval).agg(method)
    
    # Compute error bounds (max deviation from original)
    for col in df.columns:
        original = df[col].dropna()
        downsampled_col = downsampled[col].dropna()
        
        if len(original) > 0 and len(downsampled_col) > 0:
            # Align and compute max error
            aligned = original.reindex(downsampled_col.index, method='nearest')
            errors = abs(aligned - downsampled_col)
            error_bounds[col] = float(errors.max()) if len(errors) > 0 else 0.0
    
    return downsampled, error_bounds


@lru_cache(maxsize=1000)
def cached_correlation(
    source_hash: str,
    target_hash: int,
    max_lag: int,
    min_samples: int
) -> Tuple[float, int]:
    """Cached correlation computation (for stable asset pairs)."""
    # This is a placeholder - actual implementation would use real data
    # Cache key includes hashes of series data
    return 0.0, 0


def fast_approximate_correlation(
    series1: pd.Series,
    series2: pd.Series,
    projection_dim: int = 10
) -> float:
    """Fast approximate correlation using random projections."""
    # Random projection for dimensionality reduction
    np.random.seed(42)  # Deterministic projections
    projection_matrix = np.random.randn(projection_dim, len(series1))
    
    proj1 = projection_matrix @ series1.values
    proj2 = projection_matrix @ series2.values
    
    # Compute correlation on projections
    return float(np.corrcoef(proj1, proj2)[0, 1])


def intra_sector_correlation_fast_path(
    df: pd.DataFrame,
    sector_map: Dict[str, str],
    config: GraphInferenceConfig
) -> List[Dict]:
    """Fast path for intra-sector correlations (before cross-sector shadow links)."""
    from infer_graph import infer_edges
    
    # Group nodes by sector
    sectors = {}
    for node_id in df.columns:
        sector = sector_map.get(node_id, 'other')
        if sector not in sectors:
            sectors[sector] = []
        sectors[sector].append(node_id)
    
    # Compute intra-sector edges
    intra_sector_edges = []
    for sector, node_ids in sectors.items():
        if len(node_ids) < 2:
            continue
        
        sector_df = df[node_ids]
        sector_edges = infer_edges(sector_df, config=config)
        intra_sector_edges.extend(sector_edges)
    
    return intra_sector_edges


def adaptive_batch_size(n_nodes: int, n_samples: int, n_cores: int) -> int:
    """Compute optimal batch size based on dataset and CPU cores."""
    # Heuristic: balance memory usage and parallelism
    memory_per_pair_mb = (n_samples * 8 * 2) / (1024 * 1024)  # Two series, float64
    available_memory_gb = 8  # Assume 8GB available
    max_pairs_per_core = int((available_memory_gb * 1024) / (memory_per_pair_mb * n_cores))
    
    batch_size = min(max_pairs_per_core, n_nodes * (n_nodes - 1) // (2 * n_cores))
    return max(1, batch_size)


def vectorized_sensor_health(df: pd.DataFrame) -> Dict[str, Dict]:
    """Vectorized sensor health computation using NumPy broadcasting."""
    health = {}
    
    for col in df.columns:
        series = df[col].dropna()
        
        if len(series) < 10:
            health[col] = {'status': 'insufficient_data', 'score': 0.0}
            continue
        
        # Vectorized computations
        missing_ratio = series.isna().sum() / len(df[col])
        mean_val = float(series.mean())
        std_val = float(series.std())
        cv = std_val / (abs(mean_val) + 1e-10)
        
        # Vectorized drift detection
        half_point = len(series) // 2
        first_half_mean = float(series.iloc[:half_point].mean())
        second_half_mean = float(series.iloc[half_point:].mean())
        mean_diff = abs(second_half_mean - first_half_mean)
        pooled_std = (series.iloc[:half_point].std() + series.iloc[half_point:].std()) / 2
        
        drift_detected = mean_diff > (2.0 * pooled_std) if pooled_std > 0 else False
        
        # Compute observability score
        missingness_score = 1.0 - min(missing_ratio, 1.0)
        noise_score = min(1.0, cv * 10)
        drift_score = 0.0 if not drift_detected else 0.5
        
        observability = (missingness_score * 0.4 + noise_score * 0.3 + drift_score * 0.2)
        
        health[col] = {
            'status': 'ok' if observability > 0.7 else 'degraded' if observability > 0.4 else 'failed',
            'score': float(observability),
            'missing_ratio': float(missing_ratio),
            'cv': float(cv),
            'drift_detected': drift_detected
        }
    
    return health
