"""
Federated learning configuration.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class FederatedConfig:
    """Configuration for a federated learning round."""

    n_rounds: int = 100
    local_epochs: int = 5
    learning_rate: float = 0.01
    epsilon_per_round: float = 1.0
    delta: float = 1e-5
    max_grad_norm: float = 1.0
    compression_ratio: float = 0.1
    min_participants: int = 3
    byzantine_tolerance: int = 1
    aggregation_strategy: str = "fedavg"  # fedavg, fedprox, scaffold

    def __post_init__(self) -> None:
        if self.aggregation_strategy not in ("fedavg", "fedprox", "scaffold"):
            raise ValueError(
                f"Unknown aggregation strategy: {self.aggregation_strategy}. "
                "Choose from: fedavg, fedprox, scaffold"
            )
        if self.min_participants < 2 * self.byzantine_tolerance + 1:
            raise ValueError(
                f"min_participants ({self.min_participants}) must be >= "
                f"2 * byzantine_tolerance + 1 ({2 * self.byzantine_tolerance + 1})"
            )
        if not 0.0 < self.compression_ratio <= 1.0:
            raise ValueError("compression_ratio must be in (0, 1]")
        if self.epsilon_per_round <= 0:
            raise ValueError("epsilon_per_round must be positive")
