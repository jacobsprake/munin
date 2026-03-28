"""
Munin Intelligence Stack - Layer 5: RL Response Optimisation.

Hierarchical reinforcement learning agents (Strategic, Tactical, Resource)
that optimise emergency response to infrastructure cascade failures.
Gymnasium-style environment implemented without gymnasium dependency.
"""

from .environment import ResponseEnvironment
from .agents import StrategicAgent, TacticalAgent, ResourceAgent
from .reward import compute_reward
from .trainer import RLTrainer

__all__ = [
    "ResponseEnvironment",
    "StrategicAgent",
    "TacticalAgent",
    "ResourceAgent",
    "compute_reward",
    "RLTrainer",
]
