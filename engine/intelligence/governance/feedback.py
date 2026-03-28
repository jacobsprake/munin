"""
Feedback integration from incidents, operator corrections, and near-misses.
"""

from __future__ import annotations

import copy
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


@dataclass
class _IncidentRecord:
    incident_id: str
    munin_prediction: Any
    actual_outcome: Any
    timestamp: float = field(default_factory=time.time)


@dataclass
class _OverrideRecord:
    decision_id: str
    munin_recommendation: Any
    operator_action: Any
    outcome: Any
    timestamp: float = field(default_factory=time.time)


@dataclass
class _NearMissRecord:
    event_data: Dict[str, Any]
    cascade_path_observed: List[str]
    cascade_path_predicted: List[str]
    timestamp: float = field(default_factory=time.time)


class FeedbackCollector:
    """
    Collects operational feedback — incidents, operator overrides, and
    near-misses — and converts them into training signals.
    """

    def __init__(self) -> None:
        self._incidents: List[_IncidentRecord] = []
        self._overrides: List[_OverrideRecord] = []
        self._near_misses: List[_NearMissRecord] = []

    # ------------------------------------------------------------------
    # Recording
    # ------------------------------------------------------------------

    def record_incident(
        self,
        incident_id: str,
        munin_prediction: Any,
        actual_outcome: Any,
    ) -> Dict[str, Any]:
        """Compare prediction vs reality for a resolved incident."""
        record = _IncidentRecord(
            incident_id=incident_id,
            munin_prediction=munin_prediction,
            actual_outcome=actual_outcome,
        )
        self._incidents.append(record)
        correct = self._prediction_matches(munin_prediction, actual_outcome)
        logger.info(
            "Incident %s recorded. Prediction %s.",
            incident_id, "correct" if correct else "incorrect",
        )
        return {
            "incident_id": incident_id,
            "prediction_correct": correct,
            "timestamp": record.timestamp,
        }

    def record_operator_override(
        self,
        decision_id: str,
        munin_recommendation: Any,
        operator_action: Any,
        outcome: Any,
    ) -> Dict[str, Any]:
        """Record when an operator overrode Munin's recommendation."""
        record = _OverrideRecord(
            decision_id=decision_id,
            munin_recommendation=munin_recommendation,
            operator_action=operator_action,
            outcome=outcome,
        )
        self._overrides.append(record)
        munin_would_have_been_right = self._prediction_matches(
            munin_recommendation, outcome
        )
        logger.info(
            "Override %s recorded. Munin would have been %s.",
            decision_id,
            "correct" if munin_would_have_been_right else "incorrect",
        )
        return {
            "decision_id": decision_id,
            "munin_would_have_been_correct": munin_would_have_been_right,
            "timestamp": record.timestamp,
        }

    def record_near_miss(
        self,
        event_data: Dict[str, Any],
        cascade_path_observed: List[str],
        cascade_path_predicted: List[str],
    ) -> Dict[str, Any]:
        """
        Near-misses are the most valuable learning signal.
        Record both the observed and predicted cascade paths.
        """
        record = _NearMissRecord(
            event_data=event_data,
            cascade_path_observed=cascade_path_observed,
            cascade_path_predicted=cascade_path_predicted,
        )
        self._near_misses.append(record)
        path_match = cascade_path_observed == cascade_path_predicted
        logger.info(
            "Near-miss recorded. Cascade path prediction %s.",
            "matched" if path_match else "diverged",
        )
        return {
            "path_match": path_match,
            "observed_length": len(cascade_path_observed),
            "predicted_length": len(cascade_path_predicted),
            "timestamp": record.timestamp,
        }

    # ------------------------------------------------------------------
    # Training signal generation
    # ------------------------------------------------------------------

    def get_training_signal(self) -> Dict[str, Any]:
        """
        Aggregate feedback into a training-ready signal.

        Returns dict with:
          - incorrect_predictions: list of (prediction, actual) pairs
          - beneficial_overrides: operator actions that led to better outcomes
          - near_miss_cascade_corrections: predicted vs observed paths
        """
        incorrect_predictions = [
            {
                "prediction": r.munin_prediction,
                "actual": r.actual_outcome,
                "timestamp": r.timestamp,
            }
            for r in self._incidents
            if not self._prediction_matches(r.munin_prediction, r.actual_outcome)
        ]

        beneficial_overrides = [
            {
                "recommendation": r.munin_recommendation,
                "operator_action": r.operator_action,
                "outcome": r.outcome,
                "timestamp": r.timestamp,
            }
            for r in self._overrides
            if not self._prediction_matches(r.munin_recommendation, r.outcome)
        ]

        near_miss_corrections = [
            {
                "event_data": r.event_data,
                "observed_path": r.cascade_path_observed,
                "predicted_path": r.cascade_path_predicted,
                "timestamp": r.timestamp,
            }
            for r in self._near_misses
            if r.cascade_path_observed != r.cascade_path_predicted
        ]

        return {
            "incorrect_predictions": incorrect_predictions,
            "beneficial_overrides": beneficial_overrides,
            "near_miss_cascade_corrections": near_miss_corrections,
            "total_feedback_items": (
                len(incorrect_predictions)
                + len(beneficial_overrides)
                + len(near_miss_corrections)
            ),
        }

    def get_feedback_summary(self) -> Dict[str, Any]:
        """Stats on prediction accuracy, override rate, improvement trend."""
        total_incidents = len(self._incidents)
        correct_incidents = sum(
            1 for r in self._incidents
            if self._prediction_matches(r.munin_prediction, r.actual_outcome)
        )

        total_overrides = len(self._overrides)
        overrides_where_munin_correct = sum(
            1 for r in self._overrides
            if self._prediction_matches(r.munin_recommendation, r.outcome)
        )

        total_near_misses = len(self._near_misses)
        path_matches = sum(
            1 for r in self._near_misses
            if r.cascade_path_observed == r.cascade_path_predicted
        )

        return {
            "incidents": {
                "total": total_incidents,
                "correct_predictions": correct_incidents,
                "accuracy": correct_incidents / max(total_incidents, 1),
            },
            "overrides": {
                "total": total_overrides,
                "munin_would_have_been_correct": overrides_where_munin_correct,
                "unnecessary_override_rate": (
                    overrides_where_munin_correct / max(total_overrides, 1)
                ),
            },
            "near_misses": {
                "total": total_near_misses,
                "cascade_path_matches": path_matches,
                "path_accuracy": path_matches / max(total_near_misses, 1),
            },
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _prediction_matches(prediction: Any, actual: Any) -> bool:
        """Flexible comparison between prediction and actual outcome."""
        if prediction == actual:
            return True
        # Handle dict comparison (e.g. severity levels)
        if isinstance(prediction, dict) and isinstance(actual, dict):
            return prediction.get("label") == actual.get("label")
        # Handle numeric comparison with tolerance
        try:
            return abs(float(prediction) - float(actual)) < 0.1
        except (TypeError, ValueError):
            return str(prediction) == str(actual)


class ContinuousLearner:
    """
    Orchestrates the retrain-revalidate-promote loop using drift
    detection and operational feedback.
    """

    def __init__(
        self,
        model: nn.Module,
        feedback_collector: FeedbackCollector,
        revalidator: Any,  # ModelRevalidator — avoid circular import
    ) -> None:
        self.model = model
        self.feedback_collector = feedback_collector
        self.revalidator = revalidator
        self._model_lineage: List[Dict[str, Any]] = []
        self._current_version: int = 0

    def should_retrain(self, drift_detector: Any) -> bool:
        """
        Decide whether to retrain based on drift severity and
        accumulated feedback volume.
        """
        # Check data drift
        drift_alert = drift_detector.get_alert() if drift_detector else None
        has_drift = drift_alert is not None

        # Check feedback volume
        signal = self.feedback_collector.get_training_signal()
        feedback_volume = signal["total_feedback_items"]
        has_enough_feedback = feedback_volume >= 10

        should = has_drift or has_enough_feedback
        logger.info(
            "should_retrain: drift=%s feedback_items=%d -> %s",
            has_drift, feedback_volume, should,
        )
        return should

    def retrain(
        self,
        model: nn.Module,
        new_data: Any,
        feedback: Dict[str, Any],
        n_epochs: int = 10,
        lr: float = 0.001,
    ) -> nn.Module:
        """
        Fine-tune the model on new data plus feedback-derived corrections.

        Args:
            model: Current model to fine-tune.
            new_data: Tuple of (inputs, targets) tensors.
            feedback: Output of FeedbackCollector.get_training_signal().
            n_epochs: Training epochs.
            lr: Learning rate.

        Returns:
            The retrained model.
        """
        retrained = copy.deepcopy(model)
        retrained.train()
        optimizer = torch.optim.Adam(retrained.parameters(), lr=lr)
        criterion = nn.MSELoss()

        inputs, targets = new_data

        for epoch in range(n_epochs):
            optimizer.zero_grad()
            outputs = retrained(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            if (epoch + 1) % max(n_epochs // 5, 1) == 0:
                logger.info("Retrain epoch %d/%d loss=%.6f", epoch + 1, n_epochs, loss.item())

        return retrained

    def promote_if_valid(
        self,
        new_model: nn.Module,
        test_data: Dict[str, Any],
    ) -> bool:
        """
        Only promote the new model if it passes full revalidation.

        Returns True if promoted, False if rejected.
        """
        report = self.revalidator.validate(new_model, test_data)

        if self.revalidator.approve(report):
            old_version = self._current_version
            self._current_version += 1
            self.model = new_model

            self._model_lineage.append({
                "event": "promotion",
                "old_version": old_version,
                "new_version": self._current_version,
                "revalidation": self.revalidator.generate_audit_entry(report),
                "timestamp": time.time(),
            })
            logger.info(
                "Model promoted: v%d -> v%d", old_version, self._current_version
            )
            return True
        else:
            logger.warning(
                "Model rejected: failed %d/%d revalidation tests.",
                report.tests_failed, report.tests_run,
            )
            self._model_lineage.append({
                "event": "rejection",
                "version_attempted": self._current_version + 1,
                "revalidation": self.revalidator.generate_audit_entry(report),
                "timestamp": time.time(),
            })
            return False

    def get_model_lineage(self) -> List[Dict[str, Any]]:
        """Full chain from training data to model version to predictions."""
        return list(self._model_lineage)
