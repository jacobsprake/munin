"""
Gymnasium-style environment for infrastructure response optimisation.

Implements the standard reset/step/render interface without requiring
the gymnasium package. The environment wraps the digital twin to simulate
cascade scenarios and evaluates response actions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from ..twin.scenario_generator import LabelledScenario


# ---------------------------------------------------------------------------
# Action and observation spaces (no gymnasium dependency)
# ---------------------------------------------------------------------------

@dataclass
class Space:
    """Minimal space descriptor replacing gymnasium spaces."""
    shape: Tuple[int, ...]
    low: Optional[np.ndarray] = None
    high: Optional[np.ndarray] = None
    n: Optional[int] = None  # For discrete spaces

    def sample(self) -> np.ndarray:
        """Sample a random action from this space."""
        low = self.low if self.low is not None else np.zeros(self.shape)
        high = self.high if self.high is not None else np.ones(self.shape)
        return np.random.uniform(low, high).astype(np.float32)


# ---------------------------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------------------------

@dataclass
class EnvConfig:
    """Configuration for the response environment.

    Parameters
    ----------
    n_playbooks : int
        Number of available response playbooks.
    n_ministries : int
        Number of ministries that can be engaged.
    n_resource_types : int
        Number of resource types (crews, equipment, barriers, etc.).
    max_steps : int
        Maximum episode length in decision steps.
    decision_interval_seconds : float
        Time between decisions (300s = 5 minutes for strategic).
    """

    n_playbooks: int = 10
    n_ministries: int = 5
    n_resource_types: int = 8
    max_steps: int = 200
    decision_interval_seconds: float = 300.0


class ResponseEnvironment:
    """Gymnasium-compatible environment for response optimisation.

    State space includes:
        - Cascade prediction features (damage estimate, spread rate, etc.)
        - Current time step / total budget
        - Available resources per type
        - Authorization status per ministry
        - Ministry workload indicators

    Action space (discrete + continuous hybrid):
        - Discrete: playbook selection, ministry routing
        - Continuous: resource pre-positioning weights

    Reward:
        -latency - 0.5*cascade_damage - 100*compliance_violation - 50*audit_gap

    Parameters
    ----------
    config : EnvConfig
        Environment configuration.
    scenarios : list of LabelledScenario, optional
        Pool of scenarios to sample from on reset.
    """

    def __init__(
        self,
        config: Optional[EnvConfig] = None,
        scenarios: Optional[List[LabelledScenario]] = None,
    ) -> None:
        self.config = config or EnvConfig()
        self._scenarios = scenarios or []

        # Observation: cascade features (8) + time (2) + resources (n_resource)
        #   + auth_status (n_ministries) + workloads (n_ministries)
        self._cascade_dim = 8
        self._obs_dim = (
            self._cascade_dim
            + 2  # current_step_frac, time_elapsed_frac
            + self.config.n_resource_types
            + self.config.n_ministries  # authorization binary
            + self.config.n_ministries  # workload
        )

        # Action: playbook_id (discrete) + ministry_id (discrete) + resource_weights (continuous)
        self._action_dim = 2 + self.config.n_resource_types

        # Spaces
        self.observation_space = Space(
            shape=(self._obs_dim,),
            low=np.zeros(self._obs_dim, dtype=np.float32),
            high=np.ones(self._obs_dim, dtype=np.float32),
        )
        self.action_space = Space(
            shape=(self._action_dim,),
            low=np.zeros(self._action_dim, dtype=np.float32),
            high=np.ones(self._action_dim, dtype=np.float32),
            n=self.config.n_playbooks,  # discrete part
        )

        # Internal state
        self._current_step: int = 0
        self._done: bool = False
        self._state: np.ndarray = np.zeros(self._obs_dim, dtype=np.float32)
        self._scenario: Optional[LabelledScenario] = None

        # Response tracking
        self._resources: np.ndarray = np.ones(
            self.config.n_resource_types, dtype=np.float32
        )
        self._authorization: np.ndarray = np.zeros(
            self.config.n_ministries, dtype=np.float32
        )
        self._ministry_workload: np.ndarray = np.zeros(
            self.config.n_ministries, dtype=np.float32
        )

        # Metrics
        self._total_latency: float = 0.0
        self._cascade_damage: float = 0.0
        self._compliance_violations: int = 0
        self._audit_gaps: int = 0
        self._activated_playbooks: List[int] = []
        self._engaged_ministries: List[int] = []

    # ------------------------------------------------------------------
    # Gymnasium interface
    # ------------------------------------------------------------------

    def reset(
        self, scenario: Optional[LabelledScenario] = None
    ) -> np.ndarray:
        """Reset the environment to an initial state.

        Parameters
        ----------
        scenario : LabelledScenario, optional
            Specific scenario. If None, samples randomly from the pool.

        Returns
        -------
        observation : ndarray of shape (obs_dim,)
        """
        self._current_step = 0
        self._done = False

        # Select scenario
        if scenario is not None:
            self._scenario = scenario
        elif self._scenarios:
            idx = np.random.randint(0, len(self._scenarios))
            self._scenario = self._scenarios[idx]
        else:
            self._scenario = None

        # Reset metrics
        self._total_latency = 0.0
        self._cascade_damage = 0.0
        self._compliance_violations = 0
        self._audit_gaps = 0
        self._activated_playbooks = []
        self._engaged_ministries = []

        # Reset resources (full availability)
        self._resources = np.ones(self.config.n_resource_types, dtype=np.float32)

        # Reset authorizations
        self._authorization = np.zeros(self.config.n_ministries, dtype=np.float32)

        # Randomise ministry workload
        self._ministry_workload = np.random.uniform(
            0.1, 0.5, size=self.config.n_ministries
        ).astype(np.float32)

        # Build initial observation
        self._state = self._build_observation()
        return self._state.copy()

    def step(
        self, action: np.ndarray
    ) -> Tuple[np.ndarray, float, bool, Dict]:
        """Take an action and advance the environment.

        Parameters
        ----------
        action : ndarray of shape (action_dim,)
            [playbook_id_prob, ministry_id_prob, resource_weights...]

        Returns
        -------
        observation : ndarray
        reward : float
        done : bool
        info : dict
        """
        if self._done:
            return self._state.copy(), 0.0, True, {"warning": "episode_done"}

        self._current_step += 1

        # Ensure action is 1D array of correct length
        action = np.atleast_1d(np.asarray(action, dtype=np.float32))
        if len(action) < self._action_dim:
            action = np.pad(action, (0, self._action_dim - len(action)))

        # Parse action
        playbook_id = int(np.clip(
            action[0] * self.config.n_playbooks, 0, self.config.n_playbooks - 1
        ))
        ministry_id = int(np.clip(
            action[1] * self.config.n_ministries, 0, self.config.n_ministries - 1
        ))
        resource_weights = np.clip(action[2:], 0, 1)

        # Pad resource_weights if needed
        if len(resource_weights) < self.config.n_resource_types:
            resource_weights = np.pad(
                resource_weights,
                (0, self.config.n_resource_types - len(resource_weights)),
            )

        # --- Execute action ---

        # 1. Activate playbook
        self._activated_playbooks.append(playbook_id)
        latency_this_step = self._compute_playbook_latency(playbook_id)
        self._total_latency += latency_this_step

        # 2. Route authorization to ministry
        auth_delay = self._route_authorization(ministry_id)
        self._total_latency += auth_delay

        # 3. Pre-position resources
        resource_cost = self._allocate_resources(resource_weights)

        # 4. Simulate cascade progression
        cascade_delta = self._simulate_cascade_step()
        self._cascade_damage += cascade_delta

        # 5. Check compliance and audit
        all_signatures = self._authorization.sum() >= (
            self.config.n_ministries * 0.6
        )
        if not all_signatures and self._current_step > 5:
            self._compliance_violations += 1

        audit_complete = len(self._activated_playbooks) == len(
            set(self._activated_playbooks)
        )  # No duplicate playbooks as proxy for audit completeness
        if not audit_complete:
            self._audit_gaps += 1

        # --- Compute reward ---
        from .reward import compute_reward

        reward = compute_reward(
            authorization_latency_minutes=self._total_latency / 60.0,
            cascade_affected_count=int(self._cascade_damage),
            all_signatures_obtained=all_signatures,
            audit_trail_complete=audit_complete,
        )

        # --- Check termination ---
        if self._current_step >= self.config.max_steps:
            self._done = True
        if self._cascade_damage <= 0 and self._current_step > 10:
            self._done = True  # Cascade contained

        # --- Build next observation ---
        self._state = self._build_observation()

        info = {
            "step": self._current_step,
            "playbook_id": playbook_id,
            "ministry_id": ministry_id,
            "latency": self._total_latency,
            "cascade_damage": self._cascade_damage,
            "compliance_violations": self._compliance_violations,
            "audit_gaps": self._audit_gaps,
        }

        return self._state.copy(), float(reward), self._done, info

    def render(self) -> str:
        """Return a human-readable summary of the current state."""
        lines = [
            f"=== Response Environment (Step {self._current_step}/{self.config.max_steps}) ===",
            f"Cascade damage: {self._cascade_damage:.1f}",
            f"Total latency: {self._total_latency:.0f}s ({self._total_latency/60:.1f}min)",
            f"Resources available: {self._resources.mean():.1%}",
            f"Authorizations: {self._authorization.sum():.0f}/{self.config.n_ministries}",
            f"Compliance violations: {self._compliance_violations}",
            f"Audit gaps: {self._audit_gaps}",
            f"Playbooks activated: {len(set(self._activated_playbooks))}",
            f"Done: {self._done}",
        ]
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_observation(self) -> np.ndarray:
        """Construct the observation vector from internal state."""
        obs = np.zeros(self._obs_dim, dtype=np.float32)
        offset = 0

        # Cascade features (8 dims)
        cascade_feats = self._get_cascade_features()
        obs[offset : offset + self._cascade_dim] = cascade_feats
        offset += self._cascade_dim

        # Time features
        obs[offset] = self._current_step / max(self.config.max_steps, 1)
        obs[offset + 1] = min(
            1.0,
            self._total_latency / (self.config.max_steps * self.config.decision_interval_seconds),
        )
        offset += 2

        # Resources
        n_res = self.config.n_resource_types
        obs[offset : offset + n_res] = self._resources[:n_res]
        offset += n_res

        # Authorization status
        n_min = self.config.n_ministries
        obs[offset : offset + n_min] = self._authorization[:n_min]
        offset += n_min

        # Ministry workloads
        obs[offset : offset + n_min] = self._ministry_workload[:n_min]

        return obs

    def _get_cascade_features(self) -> np.ndarray:
        """Extract cascade prediction features from the current scenario."""
        feats = np.zeros(self._cascade_dim, dtype=np.float32)
        if self._scenario is not None:
            feats[0] = min(1.0, self._scenario.total_damage / 50.0)
            feats[1] = min(1.0, len(self._scenario.affected_nodes) / 100.0)
            feats[2] = min(1.0, len(self._scenario.cascade_path) / 20.0)
            feats[3] = min(1.0, self._cascade_damage / 50.0)
        else:
            # Random cascade for training without scenarios
            feats[0] = np.random.uniform(0.1, 0.8)
            feats[1] = np.random.uniform(0.05, 0.5)
        # Remaining features: spread rate, containment probability, etc.
        feats[4] = max(0, 1.0 - self._current_step / max(self.config.max_steps, 1))
        feats[5] = self._resources.mean()
        feats[6] = self._authorization.mean()
        feats[7] = self._ministry_workload.mean()
        return feats

    def _compute_playbook_latency(self, playbook_id: int) -> float:
        """Estimate latency for activating a playbook (seconds)."""
        # More complex playbooks (higher ID) take longer
        base_latency = 60.0 + playbook_id * 30.0
        # First activation is slower
        if playbook_id not in self._activated_playbooks:
            base_latency *= 1.5
        return base_latency

    def _route_authorization(self, ministry_id: int) -> float:
        """Route an authorization request to a ministry.

        Returns the delay in seconds.
        """
        self._engaged_ministries.append(ministry_id)

        # Delay depends on workload
        workload = self._ministry_workload[ministry_id]
        delay = 120.0 * (1.0 + workload)  # 2-4 minutes

        # Grant authorization (probabilistic, higher workload = harder)
        if np.random.random() > workload:
            self._authorization[ministry_id] = 1.0

        # Increase workload
        self._ministry_workload[ministry_id] = min(
            1.0, self._ministry_workload[ministry_id] + 0.1
        )

        return delay

    def _allocate_resources(self, weights: np.ndarray) -> float:
        """Allocate resources according to weight vector. Returns cost."""
        allocation = np.minimum(weights, self._resources)
        self._resources -= allocation * 0.1  # 10% consumed per step
        self._resources = np.clip(self._resources, 0, 1)
        return float(allocation.sum())

    def _simulate_cascade_step(self) -> float:
        """Simulate one step of cascade progression. Returns delta damage."""
        if self._scenario is None:
            # Without a scenario, simulate a decaying cascade
            base_damage = max(0, 5.0 - self._current_step * 0.1)
        else:
            n_affected = len(self._scenario.affected_nodes)
            step_frac = self._current_step / max(self.config.max_steps, 1)
            base_damage = n_affected * 0.1 * (1.0 - step_frac)

        # Resources mitigate damage
        mitigation = self._resources.mean() * 0.5
        # Authorizations improve response
        auth_bonus = self._authorization.mean() * 0.3

        delta = max(0, base_damage * (1.0 - mitigation - auth_bonus))
        return delta

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def obs_dim(self) -> int:
        return self._obs_dim

    @property
    def action_dim(self) -> int:
        return self._action_dim
