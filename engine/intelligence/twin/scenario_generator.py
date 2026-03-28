"""
Monte Carlo + adversarial scenario generation for digital twin stress-testing.

Generates failure scenarios to evaluate infrastructure resilience, including
random failures, adversarial worst-case combinations, and spatially/temporally
correlated failure sequences.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Dict, List, Optional, Tuple

import numpy as np

if TYPE_CHECKING:
    from .twin_manager import DigitalTwinManager


# ---------------------------------------------------------------------------
# Scenario data class
# ---------------------------------------------------------------------------

@dataclass
class LabelledScenario:
    """A labelled failure scenario for simulation and training.

    Parameters
    ----------
    initial_failure : dict
        The triggering failure: {'node_id': str, 'severity': float, 'sector': str}.
    conditions : dict
        Environmental conditions (weather, demand level, time of day).
    cascade_path : list of dict
        Ordered sequence of failures that occur as the cascade progresses.
    affected_nodes : list of str
        All node IDs affected by the end of the scenario.
    timeline : list of dict
        Time-stamped events: [{'t': float, 'event': str, 'node_id': str}, ...].
    total_damage : float
        Aggregate damage metric (number of affected nodes weighted by severity).
    """

    initial_failure: Dict
    conditions: Dict = field(default_factory=dict)
    cascade_path: List[Dict] = field(default_factory=list)
    affected_nodes: List[str] = field(default_factory=list)
    timeline: List[Dict] = field(default_factory=list)
    total_damage: float = 0.0


class ScenarioGenerator:
    """Generates failure scenarios for digital twin stress-testing.

    Parameters
    ----------
    twin_manager : DigitalTwinManager
        Reference to the orchestrating twin manager (used to run simulations).
    """

    def __init__(self, twin_manager: DigitalTwinManager) -> None:
        self._twin = twin_manager

    # ------------------------------------------------------------------
    # Random scenario generation
    # ------------------------------------------------------------------

    def generate_random(
        self,
        n_scenarios: int = 1000,
        severity_range: Tuple[float, float] = (0.3, 1.0),
        max_simultaneous: int = 3,
        duration_hours: float = 48.0,
    ) -> List[LabelledScenario]:
        """Generate random failure scenarios by sampling nodes and severities.

        Parameters
        ----------
        n_scenarios : int
            Number of scenarios to generate.
        severity_range : tuple of float
            (min, max) severity for random failures.
        max_simultaneous : int
            Maximum simultaneous failures per scenario.
        duration_hours : float
            Simulation duration for each scenario.

        Returns
        -------
        list of LabelledScenario
        """
        all_nodes = self._twin.get_all_node_ids()
        if not all_nodes:
            return []

        scenarios = []
        for _ in range(n_scenarios):
            n_failures = random.randint(1, min(max_simultaneous, len(all_nodes)))
            failure_nodes = random.sample(all_nodes, n_failures)

            initial = {
                "node_id": failure_nodes[0],
                "severity": random.uniform(*severity_range),
                "sector": self._twin.get_node_sector(failure_nodes[0]),
            }

            conditions = {
                "demand_level": random.choice(["low", "normal", "peak"]),
                "weather": random.choice(["clear", "storm", "extreme"]),
                "time_of_day": random.choice(["morning", "afternoon", "night"]),
                "additional_failures": [
                    {
                        "node_id": nid,
                        "severity": random.uniform(*severity_range),
                        "delay_hours": random.uniform(0, 2),
                    }
                    for nid in failure_nodes[1:]
                ],
            }

            scenario = self._simulate_scenario(
                initial, conditions, duration_hours
            )
            scenarios.append(scenario)

        return scenarios

    # ------------------------------------------------------------------
    # Adversarial scenario generation
    # ------------------------------------------------------------------

    def generate_adversarial(
        self,
        n_scenarios: int = 100,
        n_candidates: int = 500,
        duration_hours: float = 48.0,
    ) -> List[LabelledScenario]:
        """Generate adversarial scenarios that maximise cascade damage.

        Strategy: generate a large candidate pool of random scenarios,
        simulate them, and return the top-N by total damage.

        Parameters
        ----------
        n_scenarios : int
            Number of adversarial scenarios to return.
        n_candidates : int
            Size of the random candidate pool to search over.
        duration_hours : float
            Simulation duration for each candidate.

        Returns
        -------
        list of LabelledScenario, sorted by total_damage descending.
        """
        candidates = self.generate_random(
            n_scenarios=n_candidates,
            severity_range=(0.7, 1.0),
            max_simultaneous=5,
            duration_hours=duration_hours,
        )

        # Sort by damage (descending) and return top N
        candidates.sort(key=lambda s: s.total_damage, reverse=True)
        return candidates[:n_scenarios]

    # ------------------------------------------------------------------
    # Correlated scenario generation
    # ------------------------------------------------------------------

    def generate_correlated(
        self,
        n_scenarios: int = 100,
        correlation_radius_km: float = 50.0,
        temporal_spread_hours: float = 4.0,
        duration_hours: float = 48.0,
    ) -> List[LabelledScenario]:
        """Generate spatially and temporally correlated failure scenarios.

        Models real-world correlated failures (e.g., a storm hitting a
        geographic region, causing a sequence of failures).

        Parameters
        ----------
        n_scenarios : int
            Number of correlated scenarios.
        correlation_radius_km : float
            Spatial radius within which failures are correlated.
        temporal_spread_hours : float
            Time window over which correlated failures occur.
        duration_hours : float
            Total simulation duration.

        Returns
        -------
        list of LabelledScenario
        """
        all_nodes = self._twin.get_all_node_ids()
        node_positions = self._twin.get_node_positions()

        if not all_nodes:
            return []

        scenarios = []
        for _ in range(n_scenarios):
            # Pick a random epicentre
            epicentre_id = random.choice(all_nodes)
            epicentre_pos = node_positions.get(epicentre_id, (0.0, 0.0))

            # Find all nodes within the correlation radius
            nearby_nodes = []
            for nid in all_nodes:
                pos = node_positions.get(nid, (0.0, 0.0))
                dist = np.sqrt(
                    (pos[0] - epicentre_pos[0]) ** 2
                    + (pos[1] - epicentre_pos[1]) ** 2
                )
                if dist <= correlation_radius_km:
                    # Severity decays with distance
                    severity = max(0.3, 1.0 - dist / correlation_radius_km)
                    delay = (dist / correlation_radius_km) * temporal_spread_hours
                    nearby_nodes.append({
                        "node_id": nid,
                        "severity": severity,
                        "delay_hours": delay,
                    })

            if not nearby_nodes:
                continue

            initial = {
                "node_id": epicentre_id,
                "severity": random.uniform(0.8, 1.0),
                "sector": self._twin.get_node_sector(epicentre_id),
            }

            conditions = {
                "demand_level": "peak",
                "weather": "extreme",
                "time_of_day": random.choice(["morning", "afternoon", "night"]),
                "additional_failures": nearby_nodes[1:],  # skip epicentre
                "correlation_radius_km": correlation_radius_km,
                "epicentre": epicentre_id,
            }

            scenario = self._simulate_scenario(
                initial, conditions, duration_hours
            )
            scenarios.append(scenario)

        return scenarios

    # ------------------------------------------------------------------
    # Internal simulation
    # ------------------------------------------------------------------

    def _simulate_scenario(
        self,
        initial_failure: Dict,
        conditions: Dict,
        duration_hours: float,
    ) -> LabelledScenario:
        """Run a single scenario through the digital twin and collect results."""
        # Reset the twin to clean state
        self._twin.reset()

        timeline: List[Dict] = []
        cascade_path: List[Dict] = []

        # Inject initial failure
        node_id = initial_failure["node_id"]
        severity = initial_failure["severity"]
        self._twin.inject_failure(node_id, severity)
        timeline.append({"t": 0.0, "event": "initial_failure", "node_id": node_id})
        cascade_path.append({"node_id": node_id, "severity": severity, "t": 0.0})

        # Schedule additional failures
        additional = conditions.get("additional_failures", [])
        additional_sorted = sorted(additional, key=lambda x: x.get("delay_hours", 0))

        # Simulate in 5-minute steps
        dt_seconds = 300.0
        total_steps = int(duration_hours * 3600 / dt_seconds)
        additional_idx = 0

        for step_i in range(total_steps):
            current_hours = step_i * dt_seconds / 3600.0

            # Inject any scheduled additional failures
            while additional_idx < len(additional_sorted):
                af = additional_sorted[additional_idx]
                if af.get("delay_hours", 0) <= current_hours:
                    self._twin.inject_failure(
                        af["node_id"], af["severity"]
                    )
                    timeline.append({
                        "t": current_hours,
                        "event": "additional_failure",
                        "node_id": af["node_id"],
                    })
                    cascade_path.append({
                        "node_id": af["node_id"],
                        "severity": af["severity"],
                        "t": current_hours,
                    })
                    additional_idx += 1
                else:
                    break

            # Advance simulation
            self._twin.step(dt_seconds)

        # Collect final state
        full_state = self._twin.get_full_state()
        affected = []
        total_damage = 0.0

        for sector_state in full_state.values():
            for nid, ns in sector_state.items():
                if ns.get("failed", False):
                    affected.append(nid)
                    total_damage += ns.get("failure_severity", 1.0)

        return LabelledScenario(
            initial_failure=initial_failure,
            conditions=conditions,
            cascade_path=cascade_path,
            affected_nodes=affected,
            timeline=timeline,
            total_damage=total_damage,
        )
