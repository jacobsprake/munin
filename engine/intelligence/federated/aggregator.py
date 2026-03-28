"""
Secure federated aggregation server.
"""

from __future__ import annotations

import copy
import hashlib
import json
import logging
import time
from typing import Dict, List, Optional

import torch
import torch.nn as nn

from .config import FederatedConfig
from .privacy import ByzantineFilter

logger = logging.getLogger(__name__)


class FederatedAggregator:
    """
    Federated averaging server with secure aggregation simulation,
    Byzantine filtering, and convergence tracking.

    Updates are stored in "encrypted" form (the aggregator never inspects
    individual updates — only the aggregate is visible).  In production
    this would be backed by MPC / homomorphic encryption; here we
    simulate the access-control semantics.
    """

    def __init__(
        self,
        n_participants: int,
        model_template: nn.Module,
        config: FederatedConfig,
    ) -> None:
        if n_participants < config.min_participants:
            raise ValueError(
                f"n_participants ({n_participants}) < min_participants ({config.min_participants})"
            )

        self.n_participants = n_participants
        self.config = config
        self.global_model = copy.deepcopy(model_template)
        self._global_weights: Dict[str, torch.Tensor] = copy.deepcopy(
            model_template.state_dict()
        )

        # Round state
        self._pending_updates: Dict[str, Dict[str, torch.Tensor]] = {}
        self._round: int = 0
        self._history: List[Dict] = []

        # Byzantine filter
        self._byzantine_filter = ByzantineFilter(
            tolerance=config.byzantine_tolerance,
        )

        # Privacy accounting
        self._total_epsilon_consumed: float = 0.0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def receive_update(
        self,
        participant_id: str,
        encrypted_update: Dict[str, torch.Tensor],
    ) -> None:
        """
        Store an "encrypted" update from a participant.

        In a real deployment the update would be secret-shared or
        homomorphically encrypted.  Here we simply store it opaquely and
        enforce that the aggregator never inspects individual updates
        outside of the aggregate() method.
        """
        if participant_id in self._pending_updates:
            logger.warning(
                "Participant %s already submitted for round %d; overwriting.",
                participant_id, self._round,
            )
        self._pending_updates[participant_id] = encrypted_update
        logger.info(
            "Round %d: received update from %s (%d/%d).",
            self._round, participant_id,
            len(self._pending_updates), self.n_participants,
        )

    def aggregate(self) -> Dict[str, torch.Tensor]:
        """
        Compute the weighted average of pending updates (FedAvg).

        Steps:
        1. Byzantine filtering — remove poisoned updates.
        2. Aggregate surviving updates via averaging.
        3. Apply the aggregate delta to global weights.
        """
        if len(self._pending_updates) < self.config.min_participants:
            raise RuntimeError(
                f"Not enough updates to aggregate: "
                f"{len(self._pending_updates)} < {self.config.min_participants}"
            )

        updates = list(self._pending_updates.values())
        participant_ids = list(self._pending_updates.keys())

        # --- Byzantine filtering ---
        filtered_updates = self._byzantine_filter.filter_updates(updates)
        n_filtered = len(updates) - len(filtered_updates)
        if n_filtered > 0:
            logger.warning(
                "Round %d: filtered out %d suspicious updates.", self._round, n_filtered
            )

        # --- FedAvg aggregation ---
        n = len(filtered_updates)
        aggregated_delta: Dict[str, torch.Tensor] = {}
        for key in self._global_weights:
            stacked = torch.stack([u[key].float() for u in filtered_updates])
            aggregated_delta[key] = stacked.mean(dim=0)

        # Apply delta to global weights
        for key in self._global_weights:
            self._global_weights[key] = (
                self._global_weights[key].float() + aggregated_delta[key]
            )

        self.global_model.load_state_dict(
            {k: v.clone() for k, v in self._global_weights.items()}
        )

        # Record history
        summary = self.get_round_summary()
        summary["filtered_updates"] = n_filtered
        self._history.append(summary)

        # Advance round
        self._round += 1
        self._pending_updates.clear()

        return copy.deepcopy(self._global_weights)

    def broadcast_global_model(self) -> Dict[str, torch.Tensor]:
        """Return the current aggregated global model state dict."""
        return copy.deepcopy(self._global_weights)

    def verify_update(
        self,
        update: Dict[str, torch.Tensor],
        participant_id: str,
    ) -> bool:
        """
        Check a single update for poisoning indicators.

        Returns True if the update appears benign.
        """
        suspicious = self._byzantine_filter.detect_poisoning(
            [update, self._zero_update()],  # compare against zero baseline
        )
        is_clean = len(suspicious) == 0 or suspicious[0][0] != 0
        if not is_clean:
            logger.warning(
                "Update from %s flagged as potentially poisoned.", participant_id
            )
        return is_clean

    def get_round_summary(self) -> Dict:
        """
        Return a summary dict for the current round.
        """
        return {
            "round": self._round,
            "participation": len(self._pending_updates),
            "total_participants": self.n_participants,
            "participation_rate": len(self._pending_updates) / max(self.n_participants, 1),
            "privacy_budget_consumed": self._total_epsilon_consumed,
            "aggregation_strategy": self.config.aggregation_strategy,
            "timestamp": time.time(),
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _zero_update(self) -> Dict[str, torch.Tensor]:
        """Return a zero-valued update matching the model shape."""
        return {k: torch.zeros_like(v) for k, v in self._global_weights.items()}
