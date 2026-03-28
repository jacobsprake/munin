"""
Anomaly detection on the autoencoder latent space + reconstruction error.

Uses a One-Class SVM trained on the joint feature space of latent vectors
and per-sample reconstruction errors extracted from a clean training set.
A ConfounderFilter cross-references flagged anomalies against environmental
factors (weather, demand, maintenance) to suppress false positives.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


@dataclass
class AnomalyResult:
    """Container for per-sample anomaly detection results."""

    scores: np.ndarray          # Raw anomaly score (lower = more anomalous for OC-SVM)
    flags: np.ndarray           # Binary flags (True = anomaly)
    threshold: float            # Decision threshold used
    attributions: Optional[List[Dict[str, float]]] = None  # Per-sample explanations


class AnomalyDetector:
    """One-Class SVM detector on autoencoder latent + reconstruction error.

    Parameters
    ----------
    nu : float
        Upper bound on the fraction of training errors / support vectors
        (controls sensitivity). Default 0.05 (expect ~5 % outliers).
    kernel : str
        SVM kernel. ``"rbf"`` works well for the latent manifold.
    anomaly_percentile : float
        Percentile of the training-set score distribution used to derive
        the anomaly threshold (higher = fewer false positives).
    """

    def __init__(
        self,
        nu: float = 0.05,
        kernel: str = "rbf",
        anomaly_percentile: float = 95.0,
    ) -> None:
        self.nu = nu
        self.kernel = kernel
        self.anomaly_percentile = anomaly_percentile

        self.svm: Optional[OneClassSVM] = None
        self.scaler: Optional[StandardScaler] = None
        self.threshold: Optional[float] = None
        self._is_fitted = False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_features(
        latent_vectors: np.ndarray,
        reconstruction_errors: np.ndarray,
    ) -> np.ndarray:
        """Concatenate latent codes and reconstruction errors into a single
        feature matrix for the SVM.

        Parameters
        ----------
        latent_vectors : ndarray (n_samples, latent_dim)
        reconstruction_errors : ndarray (n_samples,) or (n_samples, n_sensors)

        Returns
        -------
        features : ndarray (n_samples, latent_dim + error_dim)
        """
        if reconstruction_errors.ndim == 1:
            reconstruction_errors = reconstruction_errors[:, np.newaxis]
        return np.concatenate([latent_vectors, reconstruction_errors], axis=1)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fit(
        self,
        latent_vectors: np.ndarray,
        reconstruction_errors: np.ndarray,
    ) -> "AnomalyDetector":
        """Fit the One-Class SVM on clean training data.

        Parameters
        ----------
        latent_vectors : ndarray (n_samples, latent_dim)
        reconstruction_errors : ndarray (n_samples,) or (n_samples, n_sensors)

        Returns
        -------
        self
        """
        features = self._build_features(latent_vectors, reconstruction_errors)

        self.scaler = StandardScaler()
        features_scaled = self.scaler.fit_transform(features)

        self.svm = OneClassSVM(nu=self.nu, kernel=self.kernel, gamma="scale")
        self.svm.fit(features_scaled)

        # Derive threshold from training distribution.
        train_scores = self.svm.decision_function(features_scaled)
        # decision_function: positive = inlier, negative = outlier.
        # We negate so that *higher* score = more anomalous.
        neg_scores = -train_scores
        self.threshold = float(np.percentile(neg_scores, self.anomaly_percentile))

        self._is_fitted = True
        logger.info(
            "AnomalyDetector fitted on %d samples. Threshold=%.4f (p%s)",
            len(features),
            self.threshold,
            self.anomaly_percentile,
        )
        return self

    def score(
        self,
        latent_vectors: np.ndarray,
        reconstruction_errors: np.ndarray,
    ) -> np.ndarray:
        """Return per-sample anomaly scores (higher = more anomalous).

        Parameters
        ----------
        latent_vectors : ndarray (n_samples, latent_dim)
        reconstruction_errors : ndarray (n_samples,) or (n_samples, n_sensors)

        Returns
        -------
        scores : ndarray (n_samples,)
        """
        if not self._is_fitted:
            raise RuntimeError("AnomalyDetector has not been fitted yet.")

        features = self._build_features(latent_vectors, reconstruction_errors)
        features_scaled = self.scaler.transform(features)  # type: ignore[union-attr]
        raw = self.svm.decision_function(features_scaled)  # type: ignore[union-attr]
        return -raw  # negate so higher = more anomalous

    def detect(
        self,
        latent_vectors: np.ndarray,
        reconstruction_errors: np.ndarray,
        threshold: Optional[float] = None,
    ) -> AnomalyResult:
        """Return binary anomaly flags.

        Parameters
        ----------
        latent_vectors : ndarray (n_samples, latent_dim)
        reconstruction_errors : ndarray (n_samples,) or (n_samples, n_sensors)
        threshold : float, optional
            Override the threshold derived during ``fit()``.

        Returns
        -------
        AnomalyResult
        """
        scores = self.score(latent_vectors, reconstruction_errors)
        thr = threshold if threshold is not None else self.threshold
        if thr is None:
            raise RuntimeError("No threshold available. Call fit() first or provide one.")
        flags = scores > thr
        return AnomalyResult(scores=scores, flags=flags, threshold=thr)


class ConfounderFilter:
    """Cross-references anomalies with environmental context to suppress
    false positives caused by physically normal but statistically unusual
    operating conditions (seasonal demand shifts, scheduled maintenance,
    extreme weather, etc.).

    Parameters
    ----------
    suppression_threshold : float
        If the environmental explanation score exceeds this value the
        anomaly is suppressed (reclassified as normal). Default 0.7.
    """

    # Known confounder categories and their default weights.
    CONFOUNDER_WEIGHTS: Dict[str, float] = {
        "temperature": 0.25,
        "humidity": 0.10,
        "wind_speed": 0.10,
        "precipitation": 0.15,
        "demand_cycle": 0.25,
        "maintenance_flag": 0.15,
    }

    def __init__(self, suppression_threshold: float = 0.7) -> None:
        self.suppression_threshold = suppression_threshold

    def filter_anomalies(
        self,
        anomaly_result: AnomalyResult,
        environmental_data: Dict[str, np.ndarray],
    ) -> AnomalyResult:
        """Filter anomalies by cross-referencing environmental factors.

        For each flagged anomaly, compute an *explanation score* that
        quantifies how much of the anomalous reading can be attributed to
        known confounders.  If the explanation score exceeds
        ``suppression_threshold`` the flag is suppressed.

        Parameters
        ----------
        anomaly_result : AnomalyResult
            Output of ``AnomalyDetector.detect()``.
        environmental_data : dict
            Keys are confounder names (e.g. ``"temperature"``,
            ``"demand_cycle"``, ``"maintenance_flag"``).
            Values are 1-D arrays (n_samples,) with normalised deviation
            scores in [0, 1] indicating how unusual each environmental
            factor is (1 = extreme deviation from baseline).

        Returns
        -------
        filtered : AnomalyResult
            Updated flags and per-sample attributions.
        """
        n_samples = len(anomaly_result.scores)
        attributions: List[Dict[str, float]] = []
        filtered_flags = anomaly_result.flags.copy()

        for i in range(n_samples):
            if not anomaly_result.flags[i]:
                # Not flagged -- nothing to filter.
                attributions.append({})
                continue

            # Build explanation for this sample.
            explanation: Dict[str, float] = {}
            explanation_score = 0.0
            total_weight = 0.0

            for factor, weight in self.CONFOUNDER_WEIGHTS.items():
                if factor in environmental_data:
                    deviation = float(environmental_data[factor][i])
                    explanation[factor] = deviation
                    explanation_score += weight * deviation
                    total_weight += weight

            # Normalise if not all factors are present.
            if total_weight > 0:
                explanation_score /= total_weight

            explanation["_explanation_score"] = explanation_score

            if explanation_score >= self.suppression_threshold:
                # Environmentally explainable -- suppress the anomaly.
                filtered_flags[i] = False
                explanation["_suppressed"] = 1.0
                logger.debug(
                    "Sample %d anomaly suppressed (explanation_score=%.3f)",
                    i,
                    explanation_score,
                )
            else:
                explanation["_suppressed"] = 0.0

            attributions.append(explanation)

        return AnomalyResult(
            scores=anomaly_result.scores,
            flags=filtered_flags,
            threshold=anomaly_result.threshold,
            attributions=attributions,
        )
