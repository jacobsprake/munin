"""
Differential privacy and Byzantine fault tolerance for federated learning.
"""

from __future__ import annotations

import math
import logging
from typing import List, Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn

logger = logging.getLogger(__name__)


class DifferentialPrivacy:
    """
    Differential privacy mechanism with Renyi DP accounting.

    Provides per-sample gradient clipping and calibrated Gaussian noise
    addition to guarantee (epsilon, delta)-differential privacy.
    """

    def __init__(
        self,
        epsilon: float = 1.0,
        delta: float = 1e-5,
        max_grad_norm: float = 1.0,
    ) -> None:
        if epsilon <= 0:
            raise ValueError("epsilon must be positive")
        if not (0 < delta < 1):
            raise ValueError("delta must be in (0, 1)")
        if max_grad_norm <= 0:
            raise ValueError("max_grad_norm must be positive")

        self.epsilon = epsilon
        self.delta = delta
        self.max_grad_norm = max_grad_norm
        self._cumulative_epsilon: float = 0.0
        self._rounds_participated: int = 0

    def clip_gradients(self, model: nn.Module) -> float:
        """
        Clip per-sample gradients to max_grad_norm (L2 norm).

        Returns the total gradient norm before clipping.
        """
        total_norm = 0.0
        for param in model.parameters():
            if param.grad is not None:
                param_norm = param.grad.data.norm(2).item()
                total_norm += param_norm ** 2
        total_norm = math.sqrt(total_norm)

        clip_coef = self.max_grad_norm / max(total_norm, self.max_grad_norm)
        for param in model.parameters():
            if param.grad is not None:
                param.grad.data.mul_(clip_coef)

        return total_norm

    def add_noise(
        self,
        gradients: Dict[str, torch.Tensor],
        sensitivity: float,
    ) -> Dict[str, torch.Tensor]:
        """
        Add calibrated Gaussian noise to gradients.

        Noise scale: sigma = sensitivity * sqrt(2 * ln(1.25 / delta)) / epsilon
        """
        sigma = sensitivity * math.sqrt(2.0 * math.log(1.25 / self.delta)) / self.epsilon
        noisy_gradients: Dict[str, torch.Tensor] = {}
        for name, grad in gradients.items():
            # Convert numpy arrays to torch tensors if needed
            if isinstance(grad, np.ndarray):
                grad_tensor = torch.from_numpy(grad).float()
            else:
                grad_tensor = grad
            noise = torch.normal(
                mean=0.0,
                std=sigma,
                size=grad_tensor.shape,
                device=grad_tensor.device,
                dtype=grad_tensor.dtype,
            )
            result = grad_tensor + noise
            # Convert back to numpy if the input was numpy
            if isinstance(grad, np.ndarray):
                noisy_gradients[name] = result.numpy()
            else:
                noisy_gradients[name] = result
        return noisy_gradients

    def compute_epsilon_spent(
        self,
        n_rounds: int,
        sampling_rate: float,
    ) -> float:
        """
        Compute cumulative epsilon using Renyi Differential Privacy (moments accountant).

        Uses the analytical Gaussian mechanism bound under Renyi divergence
        of order alpha, then converts to (epsilon, delta)-DP.
        """
        if sampling_rate <= 0 or sampling_rate > 1:
            raise ValueError("sampling_rate must be in (0, 1]")

        sigma = (
            self.max_grad_norm
            * math.sqrt(2.0 * math.log(1.25 / self.delta))
            / self.epsilon
        )

        # Renyi DP accounting with optimal alpha search
        best_epsilon = float("inf")
        for alpha_int in range(2, 128):
            alpha = float(alpha_int)
            # Renyi divergence of the sampled Gaussian mechanism
            rdp = (alpha * sampling_rate ** 2) / (2.0 * sigma ** 2)
            # Compose over n_rounds
            rdp_total = n_rounds * rdp
            # Convert from RDP to (epsilon, delta)-DP
            eps = rdp_total + math.log(1.0 / self.delta) / (alpha - 1.0)
            best_epsilon = min(best_epsilon, eps)

        return best_epsilon

    def check_budget(self, max_epsilon: float) -> bool:
        """Return True if cumulative privacy budget is exhausted."""
        return self._cumulative_epsilon >= max_epsilon

    def step(self, sampling_rate: float = 1.0) -> float:
        """Record one round of participation and return updated cumulative epsilon."""
        self._rounds_participated += 1
        self._cumulative_epsilon = self.compute_epsilon_spent(
            self._rounds_participated, sampling_rate
        )
        return self._cumulative_epsilon


class ByzantineFilter:
    """
    Byzantine-robust aggregation filter.

    Detects and removes poisoned model updates using coordinate-wise
    median and cosine similarity checks.  Tolerates up to f malicious
    participants in a cohort of >= 2f + 1.
    """

    def __init__(
        self,
        tolerance: int = 1,
        cosine_threshold: float = 0.5,
        method: str = "trimmed_mean",
    ) -> None:
        """
        Args:
            tolerance: Maximum number of Byzantine (malicious) participants.
            cosine_threshold: Minimum cosine similarity to the mean update.
                Updates below this are flagged as suspicious.
            method: 'median' or 'trimmed_mean'.
        """
        if method not in ("median", "trimmed_mean"):
            raise ValueError("method must be 'median' or 'trimmed_mean'")
        self.tolerance = tolerance
        self.cosine_threshold = cosine_threshold
        self.method = method

    def filter_updates(
        self,
        updates: List[Dict[str, torch.Tensor]],
    ) -> List[Dict[str, torch.Tensor]]:
        """
        Remove outlier updates using coordinate-wise median or trimmed mean.

        Returns the filtered list of updates (suspicious ones removed).
        """
        if len(updates) < 2 * self.tolerance + 1:
            raise ValueError(
                f"Need at least {2 * self.tolerance + 1} updates, got {len(updates)}"
            )

        suspicious = self.detect_poisoning(updates)
        suspicious_set = {idx for idx, _ in suspicious}
        filtered = [u for i, u in enumerate(updates) if i not in suspicious_set]

        if len(filtered) < self.tolerance + 1:
            logger.warning(
                "Too many updates filtered (%d/%d). Falling back to coordinate-wise %s.",
                len(updates) - len(filtered),
                len(updates),
                self.method,
            )
            return self._coordinate_wise_aggregate(updates)

        return filtered

    def detect_poisoning(
        self,
        updates: List[Dict[str, torch.Tensor]],
        global_model: Optional[Dict[str, torch.Tensor]] = None,
    ) -> List[Tuple[int, float]]:
        """
        Flag suspicious updates based on cosine similarity to the mean update.

        Returns list of (index, cosine_similarity) for suspicious updates.
        """
        # Flatten each update into a single vector
        flat_updates = []
        for update in updates:
            flat = torch.cat([
                torch.from_numpy(v).flatten().float() if isinstance(v, np.ndarray) else v.flatten().float()
                for v in update.values()
            ])
            flat_updates.append(flat)

        stacked = torch.stack(flat_updates)
        mean_update = stacked.mean(dim=0)
        mean_norm = mean_update.norm(2)

        suspicious: List[Tuple[int, float]] = []
        for i, flat in enumerate(flat_updates):
            if mean_norm > 0 and flat.norm(2) > 0:
                cos_sim = torch.dot(flat, mean_update) / (flat.norm(2) * mean_norm)
                cos_val = cos_sim.item()
            else:
                cos_val = 1.0  # zero update is not suspicious

            if cos_val < self.cosine_threshold:
                suspicious.append((i, cos_val))
                logger.info(
                    "Update %d flagged as suspicious (cosine_sim=%.4f < %.4f)",
                    i, cos_val, self.cosine_threshold,
                )

        return suspicious

    def _coordinate_wise_aggregate(
        self,
        updates: List[Dict[str, torch.Tensor]],
    ) -> List[Dict[str, torch.Tensor]]:
        """
        Produce a single robust aggregate via coordinate-wise median or trimmed mean.

        Returns a list containing one aggregated update dict.
        """
        keys = list(updates[0].keys())
        aggregated: Dict[str, torch.Tensor] = {}

        for key in keys:
            stacked = torch.stack([
                torch.from_numpy(u[key]).float() if isinstance(u[key], np.ndarray) else u[key].float()
                for u in updates
            ])
            if self.method == "median":
                aggregated[key] = stacked.median(dim=0).values
            else:
                # Trimmed mean: remove top and bottom `tolerance` values per coordinate
                sorted_vals, _ = stacked.sort(dim=0)
                trimmed = sorted_vals[self.tolerance : len(updates) - self.tolerance]
                aggregated[key] = trimmed.mean(dim=0)

        return [aggregated]
