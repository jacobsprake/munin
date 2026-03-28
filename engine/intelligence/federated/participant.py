"""
Local training client for federated learning.
"""

from __future__ import annotations

import copy
import logging
from typing import Dict, Optional

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from .config import FederatedConfig
from .privacy import DifferentialPrivacy

logger = logging.getLogger(__name__)


class FederatedParticipant:
    """
    A single participant in a federated learning round.

    Handles local training, update computation, differential-privacy
    noise injection, and sparse compression for bandwidth efficiency.
    """

    def __init__(
        self,
        participant_id: str,
        local_model: nn.Module,
        local_data: TensorDataset | DataLoader,
        config: FederatedConfig,
    ) -> None:
        self.participant_id = participant_id
        self.local_model = copy.deepcopy(local_model)
        self.config = config

        if isinstance(local_data, DataLoader):
            self.data_loader = local_data
        else:
            self.data_loader = DataLoader(
                local_data, batch_size=32, shuffle=True
            )

        self._dp = DifferentialPrivacy(
            epsilon=config.epsilon_per_round,
            delta=config.delta,
            max_grad_norm=config.max_grad_norm,
        )
        self._cumulative_epsilon: float = 0.0
        self._rounds_completed: int = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def train_local(
        self,
        global_weights: Dict[str, torch.Tensor],
        n_epochs: int = 5,
    ) -> Dict[str, torch.Tensor]:
        """
        Train on local data starting from *global_weights* and return the
        locally-trained model's state dict.
        """
        self.local_model.load_state_dict(
            {k: v.clone() for k, v in global_weights.items()}
        )
        self.local_model.train()

        optimizer = torch.optim.SGD(
            self.local_model.parameters(), lr=self.config.learning_rate
        )
        criterion = nn.MSELoss()

        for epoch in range(n_epochs):
            epoch_loss = 0.0
            n_batches = 0
            for batch in self.data_loader:
                if len(batch) == 2:
                    inputs, targets = batch
                else:
                    inputs = batch[0]
                    targets = inputs  # autoencoder-style fallback

                optimizer.zero_grad()
                outputs = self.local_model(inputs)
                loss = criterion(outputs, targets)
                loss.backward()

                # Per-sample gradient clipping for DP
                self._dp.clip_gradients(self.local_model)

                optimizer.step()
                epoch_loss += loss.item()
                n_batches += 1

            avg_loss = epoch_loss / max(n_batches, 1)
            logger.debug(
                "Participant %s epoch %d/%d loss=%.6f",
                self.participant_id, epoch + 1, n_epochs, avg_loss,
            )

        self._rounds_completed += 1
        return copy.deepcopy(self.local_model.state_dict())

    def compute_update(
        self,
        global_weights: Dict[str, torch.Tensor],
    ) -> Dict[str, torch.Tensor]:
        """
        Compute delta between local model weights and global weights,
        apply DP noise and compression, and return the update.
        """
        local_weights = self.local_model.state_dict()
        delta: Dict[str, torch.Tensor] = {}
        for key in global_weights:
            delta[key] = local_weights[key].float() - global_weights[key].float()

        # Differential privacy noise
        delta = self.add_noise(delta)

        # Sparse compression
        delta = self.compress(delta)

        # Track privacy budget
        sampling_rate = 1.0  # full participation
        self._cumulative_epsilon = self._dp.compute_epsilon_spent(
            self._rounds_completed, sampling_rate
        )

        return delta

    def add_noise(
        self,
        update: Dict[str, torch.Tensor],
    ) -> Dict[str, torch.Tensor]:
        """Add calibrated Gaussian noise for differential privacy."""
        sensitivity = self.config.max_grad_norm
        return self._dp.add_noise(update, sensitivity)

    def compress(
        self,
        update: Dict[str, torch.Tensor],
    ) -> Dict[str, torch.Tensor]:
        """
        Sparse update compression for bandwidth efficiency.

        Keeps only the top-k values by magnitude (where k is determined
        by compression_ratio) and zeros out the rest.
        """
        ratio = self.config.compression_ratio
        compressed: Dict[str, torch.Tensor] = {}
        for key, tensor in update.items():
            flat = tensor.flatten()
            k = max(1, int(flat.numel() * ratio))
            if k >= flat.numel():
                compressed[key] = tensor
                continue
            topk_vals, topk_idx = torch.topk(flat.abs(), k)
            mask = torch.zeros_like(flat)
            mask[topk_idx] = 1.0
            compressed[key] = (flat * mask).reshape(tensor.shape)
        return compressed

    def get_privacy_budget_consumed(self) -> float:
        """Return the cumulative epsilon spent so far."""
        return self._cumulative_epsilon
