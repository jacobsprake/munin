"""
Munin Intelligence Stack — Layer 6: Federated Learning

Secure federated learning with differential privacy, Byzantine fault
tolerance, and bandwidth-efficient update compression.
"""

from .config import FederatedConfig
from .privacy import DifferentialPrivacy, ByzantineFilter
from .participant import FederatedParticipant
from .aggregator import FederatedAggregator

__all__ = [
    "FederatedConfig",
    "DifferentialPrivacy",
    "ByzantineFilter",
    "FederatedParticipant",
    "FederatedAggregator",
]
