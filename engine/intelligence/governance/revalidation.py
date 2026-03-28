"""
Formal revalidation before promoting retrained models to production.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


@dataclass
class RevalidationReport:
    """Outcome of a model revalidation run."""

    passed: bool
    tests_run: int
    tests_passed: int
    tests_failed: int
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


class ModelRevalidator:
    """
    Gate-keeper that runs a battery of tests on a retrained model
    before it may be promoted to production.

    Tests:
      1. Performance above thresholds (precision, recall, FPR).
      2. Adversarial robustness (noise injection, missing sensors, crafted inputs).
      3. Physics consistency (predictions do not violate conservation laws).
      4. Uncertainty calibration (predicted CIs match empirical coverage).
    """

    def __init__(
        self,
        adversarial_suite: Optional[Dict[str, Any]] = None,
        performance_thresholds: Optional[Dict[str, float]] = None,
    ) -> None:
        self.adversarial_suite = adversarial_suite or {}
        self.performance_thresholds = performance_thresholds or {
            "precision": 0.90,
            "recall": 0.85,
            "fpr": 0.05,  # maximum acceptable
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(
        self,
        model: nn.Module,
        test_data: Dict[str, Any],
    ) -> RevalidationReport:
        """
        Run all revalidation tests and return a RevalidationReport.

        Args:
            model: The model to validate.
            test_data: Dict with keys:
                - 'inputs': torch.Tensor
                - 'targets': torch.Tensor
                - 'metrics': dict of pre-computed metrics (precision, recall, fpr, ...)
                - 'noisy_inputs' (optional): inputs with Gaussian noise
                - 'missing_inputs' (optional): inputs with missing sensors (NaN/zero)
                - 'adversarial_inputs' (optional): crafted adversarial examples
                - 'conservation_fn' (optional): callable(predictions) -> bool
                - 'ci_lower', 'ci_upper', 'empirical_coverage_target' (optional)
        """
        results: Dict[str, Dict[str, Any]] = {}
        model.eval()

        # 1. Performance thresholds
        results["performance"] = self._test_performance(test_data.get("metrics", {}))

        # 2. Adversarial robustness
        results["adversarial"] = self._test_adversarial(model, test_data)

        # 3. Physics consistency
        results["physics"] = self._test_physics(model, test_data)

        # 4. Uncertainty calibration
        results["calibration"] = self._test_calibration(model, test_data)

        # Aggregate
        tests_run = len(results)
        tests_passed = sum(1 for r in results.values() if r.get("passed", False))
        tests_failed = tests_run - tests_passed
        overall = tests_failed == 0

        report = RevalidationReport(
            passed=overall,
            tests_run=tests_run,
            tests_passed=tests_passed,
            tests_failed=tests_failed,
            details=results,
        )
        logger.info(
            "Revalidation %s: %d/%d tests passed.",
            "PASSED" if overall else "FAILED", tests_passed, tests_run,
        )
        return report

    def approve(self, report: RevalidationReport) -> bool:
        """Return whether the model passes all checks."""
        return report.passed

    def generate_audit_entry(self, report: RevalidationReport) -> Dict[str, Any]:
        """Generate an audit-trail entry from the revalidation report."""
        return {
            "event": "revalidation",
            "passed": report.passed,
            "tests_run": report.tests_run,
            "tests_passed": report.tests_passed,
            "tests_failed": report.tests_failed,
            "details": report.details,
            "timestamp": report.timestamp,
        }

    # ------------------------------------------------------------------
    # Internal test methods
    # ------------------------------------------------------------------

    def _test_performance(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """Check that metrics meet thresholds."""
        failures: List[str] = []
        for key, threshold in self.performance_thresholds.items():
            value = metrics.get(key)
            if value is None:
                failures.append(f"{key}: metric missing")
                continue
            if key == "fpr":
                # FPR must be *below* threshold
                if value > threshold:
                    failures.append(
                        f"{key}: {value:.4f} > max {threshold:.4f}"
                    )
            else:
                if value < threshold:
                    failures.append(
                        f"{key}: {value:.4f} < min {threshold:.4f}"
                    )
        return {"passed": len(failures) == 0, "failures": failures}

    def _test_adversarial(
        self,
        model: nn.Module,
        test_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Run adversarial robustness tests."""
        failures: List[str] = []

        with torch.no_grad():
            # Noise injection
            noisy = test_data.get("noisy_inputs")
            if noisy is not None:
                clean_out = model(test_data["inputs"])
                noisy_out = model(noisy)
                noise_diff = (clean_out - noisy_out).abs().mean().item()
                threshold = self.adversarial_suite.get("noise_threshold", 0.5)
                if noise_diff > threshold:
                    failures.append(
                        f"noise_robustness: mean_diff={noise_diff:.4f} > {threshold}"
                    )

            # Missing sensors
            missing = test_data.get("missing_inputs")
            if missing is not None:
                clean_out = model(test_data["inputs"])
                missing_out = model(missing)
                miss_diff = (clean_out - missing_out).abs().mean().item()
                threshold = self.adversarial_suite.get("missing_threshold", 0.5)
                if miss_diff > threshold:
                    failures.append(
                        f"missing_sensor: mean_diff={miss_diff:.4f} > {threshold}"
                    )

            # Adversarial crafted inputs
            adv = test_data.get("adversarial_inputs")
            if adv is not None:
                adv_out = model(adv)
                # Detection: adversarial outputs should be flagged (high uncertainty / anomaly)
                adv_mean = adv_out.abs().mean().item()
                threshold = self.adversarial_suite.get("adversarial_threshold", 2.0)
                if adv_mean > threshold:
                    failures.append(
                        f"adversarial_injection: mean_output={adv_mean:.4f} > {threshold}"
                    )

        return {"passed": len(failures) == 0, "failures": failures}

    def _test_physics(
        self,
        model: nn.Module,
        test_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Check that predictions satisfy conservation laws."""
        conservation_fn = test_data.get("conservation_fn")
        if conservation_fn is None:
            return {"passed": True, "skipped": True, "reason": "no conservation_fn provided"}

        with torch.no_grad():
            predictions = model(test_data["inputs"])
        consistent = conservation_fn(predictions)
        return {
            "passed": bool(consistent),
            "failures": [] if consistent else ["predictions violate conservation laws"],
        }

    def _test_calibration(
        self,
        model: nn.Module,
        test_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Check uncertainty calibration: predicted confidence intervals should
        match empirical coverage.
        """
        ci_lower = test_data.get("ci_lower")
        ci_upper = test_data.get("ci_upper")
        targets = test_data.get("targets")
        target_coverage = test_data.get("empirical_coverage_target", 0.90)

        if ci_lower is None or ci_upper is None or targets is None:
            return {"passed": True, "skipped": True, "reason": "no CI data provided"}

        if isinstance(ci_lower, torch.Tensor):
            ci_lower = ci_lower.numpy()
        if isinstance(ci_upper, torch.Tensor):
            ci_upper = ci_upper.numpy()
        if isinstance(targets, torch.Tensor):
            targets = targets.numpy()

        ci_lower = np.asarray(ci_lower).ravel()
        ci_upper = np.asarray(ci_upper).ravel()
        targets_flat = np.asarray(targets).ravel()

        in_interval = ((targets_flat >= ci_lower) & (targets_flat <= ci_upper)).mean()
        # Allow 5 percentage points of slack
        passed = in_interval >= (target_coverage - 0.05)
        failures: List[str] = []
        if not passed:
            failures.append(
                f"empirical_coverage={in_interval:.4f} < target={target_coverage:.4f}-0.05"
            )
        return {
            "passed": bool(passed),
            "empirical_coverage": float(in_interval),
            "target_coverage": target_coverage,
            "failures": failures,
        }
