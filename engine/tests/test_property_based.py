"""Property-based tests using Hypothesis for core Munin engine modules.

Tests cover:
    - infer_graph: edge invariants (no NaN, bounded scores, bounded lags,
      edge-count cap).
    - sensor_health: missingness and stuck-at detection on synthetic data.
    - adversarial_inputs: stuck-at injection creates detectable anomalies.

All tests use ``@settings(max_examples=50)`` or fewer to keep the suite
fast while still providing meaningful fuzz coverage.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from hypothesis import given, settings, strategies as st

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------

ENGINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE_DIR))

from config import GraphInferenceConfig
from infer_graph import infer_edges
from sensor_health import detect_missingness, detect_stuck_at, assess_sensor_health
from adversarial_inputs import StuckAt


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

def _make_timeseries_df(
    n_nodes: int,
    n_samples: int,
    seed: int,
    *,
    inject_nan_ratio: float = 0.0,
    inject_stuck: bool = False,
) -> pd.DataFrame:
    """Build a synthetic time-series DataFrame for testing.

    Args:
        n_nodes:          Number of sensor columns.
        n_samples:        Number of time steps.
        seed:             RNG seed.
        inject_nan_ratio: Fraction of values to set to NaN.
        inject_stuck:     If True, set the first column to a constant.
    """
    rng = np.random.RandomState(seed)
    timestamps = pd.date_range("2026-01-01", periods=n_samples, freq="1min")

    data: dict[str, np.ndarray] = {}
    for i in range(n_nodes):
        col = f"node_{i:02d}"
        base = rng.randn(n_samples) * 10 + 100
        if i > 0:
            # Introduce correlation with previous node
            prev = data[f"node_{i - 1:02d}"]
            base = 0.6 * base + 0.4 * prev
        data[col] = base

    df = pd.DataFrame(data, index=timestamps)

    if inject_nan_ratio > 0:
        mask = rng.random(df.shape) < inject_nan_ratio
        df = df.mask(mask)

    if inject_stuck and n_nodes > 0:
        df.iloc[:, 0] = df.iloc[0, 0]  # constant value

    return df


# ---------------------------------------------------------------------------
# infer_graph property tests
# ---------------------------------------------------------------------------

class TestInferGraphProperties:
    """Property-based tests for graph inference invariants."""

    @given(
        n_nodes=st.integers(min_value=2, max_value=12),
        n_samples=st.integers(min_value=60, max_value=300),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=10_000)
    def test_no_nan_in_edge_scores(self, n_nodes: int, n_samples: int, seed: int) -> None:
        """All edge confidence / stability scores must be finite (no NaN)."""
        df = _make_timeseries_df(n_nodes, n_samples, seed)
        edges = infer_edges(df, min_confidence=0.3, max_edges_per_node=5)

        for edge in edges:
            assert not np.isnan(edge["confidenceScore"]), (
                f"NaN confidenceScore on edge {edge['id']}"
            )
            assert not np.isnan(edge["stabilityScore"]), (
                f"NaN stabilityScore on edge {edge['id']}"
            )

    @given(
        n_nodes=st.integers(min_value=2, max_value=12),
        n_samples=st.integers(min_value=60, max_value=300),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=10_000)
    def test_confidence_in_unit_interval(self, n_nodes: int, n_samples: int, seed: int) -> None:
        """All confidence scores must be in [0.0, 1.0]."""
        df = _make_timeseries_df(n_nodes, n_samples, seed)
        edges = infer_edges(df, min_confidence=0.3, max_edges_per_node=5)

        for edge in edges:
            assert 0.0 <= edge["confidenceScore"] <= 1.0, (
                f"confidenceScore {edge['confidenceScore']} out of [0, 1]"
            )

    @given(
        n_nodes=st.integers(min_value=2, max_value=12),
        n_samples=st.integers(min_value=60, max_value=300),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=10_000)
    def test_stability_in_unit_interval(self, n_nodes: int, n_samples: int, seed: int) -> None:
        """All stability scores must be in [0.0, 1.0]."""
        df = _make_timeseries_df(n_nodes, n_samples, seed)
        edges = infer_edges(df, min_confidence=0.3, max_edges_per_node=5)

        for edge in edges:
            assert 0.0 <= edge["stabilityScore"] <= 1.0, (
                f"stabilityScore {edge['stabilityScore']} out of [0, 1]"
            )

    @given(
        n_nodes=st.integers(min_value=2, max_value=12),
        n_samples=st.integers(min_value=60, max_value=300),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=10_000)
    def test_lag_non_negative(self, n_nodes: int, n_samples: int, seed: int) -> None:
        """All inferred lag values must be >= 0."""
        df = _make_timeseries_df(n_nodes, n_samples, seed)
        edges = infer_edges(df, min_confidence=0.3, max_edges_per_node=5)

        for edge in edges:
            assert edge["inferredLagSeconds"] >= 0, (
                f"Negative lag {edge['inferredLagSeconds']} on edge {edge['id']}"
            )

    @given(
        n_nodes=st.integers(min_value=2, max_value=12),
        n_samples=st.integers(min_value=60, max_value=300),
        max_edges=st.integers(min_value=1, max_value=5),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=10_000)
    def test_edge_count_bounded(
        self, n_nodes: int, n_samples: int, max_edges: int, seed: int
    ) -> None:
        """Total edge count must not exceed max_edges_per_node * n_nodes."""
        df = _make_timeseries_df(n_nodes, n_samples, seed)
        edges = infer_edges(df, min_confidence=0.3, max_edges_per_node=max_edges)

        upper_bound = max_edges * n_nodes
        assert len(edges) <= upper_bound, (
            f"Edge count {len(edges)} exceeds upper bound "
            f"{max_edges} * {n_nodes} = {upper_bound}"
        )


# ---------------------------------------------------------------------------
# sensor_health property tests
# ---------------------------------------------------------------------------

class TestSensorHealthProperties:
    """Property-based tests for sensor health detection."""

    @given(
        n_samples=st.integers(min_value=50, max_value=500),
        nan_ratio=st.floats(min_value=0.12, max_value=0.5),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=5_000)
    def test_detect_missingness_when_missing(
        self, n_samples: int, nan_ratio: float, seed: int
    ) -> None:
        """detect_missingness returns True when > 10% of values are NaN."""
        rng = np.random.RandomState(seed)
        values = rng.randn(n_samples) * 10 + 100
        mask = rng.random(n_samples) < nan_ratio
        values[mask] = np.nan
        series = pd.Series(values)

        result = detect_missingness(series, threshold=0.1)
        actual_ratio = np.sum(mask) / n_samples
        if actual_ratio > 0.1:
            assert bool(result) is True, (
                f"Expected missingness detection with ratio {actual_ratio:.2f}"
            )

    @given(
        n_samples=st.integers(min_value=50, max_value=500),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=5_000)
    def test_detect_stuck_at_when_constant(self, n_samples: int, seed: int) -> None:
        """detect_stuck_at returns True when variance is near zero."""
        rng = np.random.RandomState(seed)
        constant_value = rng.uniform(50, 200)
        # Add negligible noise well below threshold
        values = np.full(n_samples, constant_value) + rng.normal(0, 1e-8, n_samples)
        series = pd.Series(values)

        assert bool(detect_stuck_at(series)) is True, (
            f"Expected stuck-at detection for near-constant series "
            f"(var={series.var():.2e})"
        )

    @given(
        n_samples=st.integers(min_value=50, max_value=500),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=5_000)
    def test_healthy_sensor_not_stuck(self, n_samples: int, seed: int) -> None:
        """A sensor with normal variance should NOT be flagged as stuck."""
        rng = np.random.RandomState(seed)
        values = rng.randn(n_samples) * 10 + 100
        series = pd.Series(values)

        assert bool(detect_stuck_at(series)) is False, (
            f"False positive: healthy sensor flagged as stuck "
            f"(var={series.var():.2f})"
        )


# ---------------------------------------------------------------------------
# adversarial injection detection test
# ---------------------------------------------------------------------------

class TestAdversarialInjectionDetection:
    """Ensure that injected stuck-at conditions are detected by sensor_health."""

    @given(
        n_samples=st.integers(min_value=100, max_value=500),
        duration_rows=st.integers(min_value=30, max_value=100),
        seed=st.integers(min_value=0, max_value=9999),
    )
    @settings(max_examples=50, deadline=10_000)
    def test_stuck_at_injection_detected(
        self, n_samples: int, duration_rows: int, seed: int
    ) -> None:
        """A StuckAt injection should produce a detectable anomaly."""
        df = _make_timeseries_df(n_nodes=3, n_samples=n_samples, seed=seed)
        target = df.columns[0]

        attacker = StuckAt(duration_rows=min(duration_rows, n_samples // 2), seed=seed)
        df_attacked, _meta = attacker.inject(df, target)

        health = assess_sensor_health(df_attacked)
        node_health = health.get(target, {})
        issues = node_health.get("issues", [])

        # The stuck-at injection should cause at least one health issue
        # (either stuck_at or drift depending on window placement).
        assert len(issues) > 0, (
            f"StuckAt injection on '{target}' was not detected by "
            f"sensor_health (duration={duration_rows}, n_samples={n_samples})"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
