"""
Statistical drift detection on model inputs and outputs.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import numpy as np
from scipy import stats  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class DriftResult:
    """Result of a statistical drift test."""

    statistic: float
    p_value: float
    is_drifted: bool
    method: str
    details: Dict[str, Any] = field(default_factory=dict)


class DriftDetector:
    """
    Detect statistical drift between a reference distribution and new data
    using KS test, PSI, or KL divergence.
    """

    METHODS = ("ks", "psi", "kl")

    def __init__(self, reference_distribution: np.ndarray) -> None:
        self.reference = np.asarray(reference_distribution, dtype=np.float64).ravel()
        if self.reference.size == 0:
            raise ValueError("reference_distribution must be non-empty")

    def detect_drift(
        self,
        new_data: np.ndarray,
        method: str = "ks",
        threshold: float = 0.05,
    ) -> DriftResult:
        """
        Run a drift test.

        Args:
            new_data: New observations.
            method: 'ks' (Kolmogorov-Smirnov), 'psi' (Population Stability Index),
                     or 'kl' (KL divergence).
            threshold: p-value threshold for KS; PSI/KL threshold for is_drifted.

        Returns:
            DriftResult with test statistic and drift flag.
        """
        new = np.asarray(new_data, dtype=np.float64).ravel()
        if new.size == 0:
            raise ValueError("new_data must be non-empty")

        if method == "ks":
            return self._ks_test(new, threshold)
        elif method == "psi":
            return self._psi(new, threshold)
        elif method == "kl":
            return self._kl_divergence(new, threshold)
        else:
            raise ValueError(f"Unknown method '{method}'. Choose from {self.METHODS}")

    def check_performance_drift(
        self,
        recent_metrics: Dict[str, float],
        baseline_metrics: Dict[str, float],
        relative_tolerance: float = 0.10,
    ) -> bool:
        """
        Return True if any metric has degraded beyond relative_tolerance.
        """
        for key in baseline_metrics:
            if key not in recent_metrics:
                continue
            baseline = baseline_metrics[key]
            recent = recent_metrics[key]
            if baseline == 0:
                continue
            relative_change = (baseline - recent) / abs(baseline)
            if relative_change > relative_tolerance:
                logger.warning(
                    "Performance drift on %s: baseline=%.4f recent=%.4f (%.1f%% degradation)",
                    key, baseline, recent, relative_change * 100,
                )
                return True
        return False

    def get_alert(self, threshold: float = 0.15) -> Optional[Dict[str, Any]]:
        """
        Quick convenience: run PSI against the stored reference using its own
        internal copy of the latest new_data.  (Meant for monitoring loops
        where new_data is continuously appended.)

        Returns an alert dict if drift is detected, else None.
        """
        # This is a no-op unless someone calls detect_drift first, so we
        # store the last result.
        if not hasattr(self, "_last_result"):
            return None
        result: DriftResult = self._last_result
        if result.statistic > threshold:
            return {
                "alert": "drift_detected",
                "method": result.method,
                "statistic": result.statistic,
                "threshold": threshold,
                "timestamp": time.time(),
                "details": result.details,
            }
        return None

    # ------------------------------------------------------------------
    # Private methods
    # ------------------------------------------------------------------

    def _ks_test(self, new: np.ndarray, threshold: float) -> DriftResult:
        stat, p_value = stats.ks_2samp(self.reference, new)
        result = DriftResult(
            statistic=float(stat),
            p_value=float(p_value),
            is_drifted=p_value < threshold,
            method="ks",
            details={"n_reference": len(self.reference), "n_new": len(new)},
        )
        self._last_result = result
        return result

    def _psi(
        self,
        new: np.ndarray,
        threshold: float,
        n_bins: int = 20,
    ) -> DriftResult:
        """Population Stability Index."""
        min_val = min(self.reference.min(), new.min())
        max_val = max(self.reference.max(), new.max())
        bins = np.linspace(min_val, max_val, n_bins + 1)

        ref_counts = np.histogram(self.reference, bins=bins)[0].astype(np.float64)
        new_counts = np.histogram(new, bins=bins)[0].astype(np.float64)

        # Avoid zeros
        ref_pct = (ref_counts + 1e-10) / ref_counts.sum()
        new_pct = (new_counts + 1e-10) / new_counts.sum()

        psi_value = float(np.sum((new_pct - ref_pct) * np.log(new_pct / ref_pct)))

        result = DriftResult(
            statistic=psi_value,
            p_value=0.0,  # PSI has no p-value
            is_drifted=psi_value > threshold,
            method="psi",
            details={"n_bins": n_bins, "psi": psi_value},
        )
        self._last_result = result
        return result

    def _kl_divergence(
        self,
        new: np.ndarray,
        threshold: float,
        n_bins: int = 20,
    ) -> DriftResult:
        """KL divergence from reference to new distribution."""
        min_val = min(self.reference.min(), new.min())
        max_val = max(self.reference.max(), new.max())
        bins = np.linspace(min_val, max_val, n_bins + 1)

        ref_counts = np.histogram(self.reference, bins=bins)[0].astype(np.float64)
        new_counts = np.histogram(new, bins=bins)[0].astype(np.float64)

        ref_pct = (ref_counts + 1e-10) / ref_counts.sum()
        new_pct = (new_counts + 1e-10) / new_counts.sum()

        kl = float(np.sum(ref_pct * np.log(ref_pct / new_pct)))

        result = DriftResult(
            statistic=kl,
            p_value=0.0,
            is_drifted=kl > threshold,
            method="kl",
            details={"kl_divergence": kl},
        )
        self._last_result = result
        return result
