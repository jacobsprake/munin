"""
Orchestrates the multi-physics digital twin.

The DigitalTwinManager is the top-level controller that initialises all
physics engines (hydraulic, electrical, telecom), manages cross-sector
coupling, runs the Ensemble Kalman Filter for data assimilation, and
provides a unified interface for scenario simulation and ML training
data export.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

from .physics.hydraulic import HydraulicEngine, HydraulicNode, HydraulicConnection
from .physics.electrical import ElectricalEngine, PowerNode, PowerConnection
from .physics.telecom import TelecomEngine, TelecomNode, TelecomConnection
from .physics.coupling import CrossSectorCoupling, CouplingDependency
from .kalman_filter import EnsembleKalmanFilter


# ---------------------------------------------------------------------------
# Nation configuration
# ---------------------------------------------------------------------------

@dataclass
class NationConfig:
    """Configuration for a nation's infrastructure network.

    Parameters
    ----------
    hydraulic_nodes : list of HydraulicNode
    hydraulic_connections : list of HydraulicConnection
    power_nodes : list of PowerNode
    power_connections : list of PowerConnection
    telecom_nodes : list of TelecomNode
    telecom_connections : list of TelecomConnection
    coupling_dependencies : list of CouplingDependency
    enkf_ensemble_size : int
        Ensemble size for the Kalman filter.
    """

    hydraulic_nodes: List[HydraulicNode] = field(default_factory=list)
    hydraulic_connections: List[HydraulicConnection] = field(default_factory=list)
    power_nodes: List[PowerNode] = field(default_factory=list)
    power_connections: List[PowerConnection] = field(default_factory=list)
    telecom_nodes: List[TelecomNode] = field(default_factory=list)
    telecom_connections: List[TelecomConnection] = field(default_factory=list)
    coupling_dependencies: List[CouplingDependency] = field(default_factory=list)
    enkf_ensemble_size: int = 50


class DigitalTwinManager:
    """Top-level orchestrator for the Munin multi-physics digital twin.

    Parameters
    ----------
    nation_config : NationConfig
        Full infrastructure description including all sectors and couplings.
    """

    def __init__(self, nation_config: NationConfig) -> None:
        self._config = nation_config

        # Initialise physics engines
        self._hydraulic = HydraulicEngine(
            nation_config.hydraulic_nodes,
            nation_config.hydraulic_connections,
        )
        self._electrical = ElectricalEngine(
            nation_config.power_nodes,
            nation_config.power_connections,
        )
        self._telecom = TelecomEngine(
            nation_config.telecom_nodes,
            nation_config.telecom_connections,
        )

        # Cross-sector coupling
        self._coupling = CrossSectorCoupling(nation_config.coupling_dependencies)

        # Compute total state dimension for Kalman filter
        n_hyd = len(nation_config.hydraulic_nodes) * 2  # level + flow
        n_elec = len(nation_config.power_nodes) * 2     # load + voltage
        n_tel = len(nation_config.telecom_nodes) * 2    # load + signal
        self._state_dim = n_hyd + n_elec + n_tel

        # Observation dimension defaults to state dimension (all states observable)
        self._obs_dim = self._state_dim

        # Ensemble Kalman Filter
        self._enkf = EnsembleKalmanFilter(
            state_dim=self._state_dim,
            obs_dim=self._obs_dim,
            ensemble_size=nation_config.enkf_ensemble_size,
        )

        # Initialise EnKF from current state
        mean = self._get_combined_state_vector()
        std = np.abs(mean) * 0.05 + 0.01  # 5% relative + small absolute noise
        self._enkf.initialize_ensemble(mean, std)

        # Time-series recording for training data export
        self._history: List[Dict[str, Any]] = []
        self._time: float = 0.0

        # Node registry for cross-sector queries
        self._node_sector_map: Dict[str, str] = {}
        self._node_position_map: Dict[str, Tuple[float, float]] = {}
        self._build_node_registry()

    # ------------------------------------------------------------------
    # Node registry
    # ------------------------------------------------------------------

    def _build_node_registry(self) -> None:
        """Build a flat registry mapping node_id -> sector."""
        for node in self._config.hydraulic_nodes:
            self._node_sector_map[node.id] = "water"
            self._node_position_map[node.id] = (0.0, 0.0)

        for node in self._config.power_nodes:
            self._node_sector_map[node.id] = "power"
            self._node_position_map[node.id] = (0.0, 0.0)

        for node in self._config.telecom_nodes:
            self._node_sector_map[node.id] = "telecom"
            self._node_position_map[node.id] = node.position_xy

    def get_all_node_ids(self) -> List[str]:
        """Return all node IDs across all sectors."""
        return list(self._node_sector_map.keys())

    def get_node_sector(self, node_id: str) -> str:
        """Return the sector ('water', 'power', 'telecom') for a node."""
        return self._node_sector_map.get(node_id, "unknown")

    def get_node_positions(self) -> Dict[str, Tuple[float, float]]:
        """Return node positions for spatial correlation calculations."""
        return dict(self._node_position_map)

    # ------------------------------------------------------------------
    # Combined state vector
    # ------------------------------------------------------------------

    def _get_combined_state_vector(self) -> np.ndarray:
        """Concatenate state vectors from all physics engines."""
        vecs = []
        if self._config.hydraulic_nodes:
            vecs.append(self._hydraulic.state_vector())
        if self._config.power_nodes:
            vecs.append(self._electrical.state_vector())
        if self._config.telecom_nodes:
            vecs.append(self._telecom.state_vector())
        if vecs:
            return np.concatenate(vecs)
        return np.zeros(0, dtype=np.float64)

    def _set_combined_state_vector(self, vec: np.ndarray) -> None:
        """Distribute a combined state vector back to individual engines."""
        offset = 0
        n_hyd = len(self._config.hydraulic_nodes) * 2
        n_elec = len(self._config.power_nodes) * 2
        n_tel = len(self._config.telecom_nodes) * 2

        if n_hyd > 0:
            self._hydraulic.set_state_vector(vec[offset : offset + n_hyd])
            offset += n_hyd
        if n_elec > 0:
            self._electrical.set_state_vector(vec[offset : offset + n_elec])
            offset += n_elec
        if n_tel > 0:
            self._telecom.set_state_vector(vec[offset : offset + n_tel])
            offset += n_tel

    # ------------------------------------------------------------------
    # Simulation step
    # ------------------------------------------------------------------

    def step(self, dt: float) -> None:
        """Advance all engines + coupling + data assimilation by *dt* seconds.

        Order of operations:
        1. Step all physics engines.
        2. Propagate cross-sector coupling.
        3. Record state for training data.
        """
        # Step individual engines
        self._hydraulic.step(dt)
        self._electrical.step(dt)
        self._telecom.step(dt)

        # Propagate cross-sector effects
        self._coupling.propagate(
            hydraulic=self._hydraulic,
            electrical=self._electrical,
            telecom=self._telecom,
        )

        self._time += dt

        # Record history
        self._history.append({
            "time": self._time,
            "state_vector": self._get_combined_state_vector().copy(),
            "full_state": self.get_full_state(),
        })

    # ------------------------------------------------------------------
    # Failure injection
    # ------------------------------------------------------------------

    def inject_failure(self, node_id: str, severity: float = 1.0) -> None:
        """Inject a failure at *node_id*, routing to the correct engine.

        Parameters
        ----------
        node_id : str
            Target node.
        severity : float
            Failure severity [0, 1].
        """
        sector = self._node_sector_map.get(node_id)
        if sector == "water":
            self._hydraulic.inject_failure(node_id, severity)
        elif sector == "power":
            self._electrical.inject_failure(node_id, severity)
        elif sector == "telecom":
            self._telecom.inject_failure(node_id, severity)
        else:
            raise KeyError(
                f"Unknown node '{node_id}' — not found in any sector."
            )

    # ------------------------------------------------------------------
    # Scenario simulation
    # ------------------------------------------------------------------

    def simulate_scenario(
        self,
        scenario: Any,
        duration_hours: float = 48.0,
        dt_seconds: float = 300.0,
    ) -> Dict:
        """Run a full scenario simulation and return results.

        Parameters
        ----------
        scenario : LabelledScenario or dict
            A scenario with 'initial_failure' and optional 'conditions'.
        duration_hours : float
            How long to simulate.
        dt_seconds : float
            Time step in seconds.

        Returns
        -------
        dict with keys: 'final_state', 'timeline', 'affected_nodes', 'total_damage'.
        """
        self.reset()

        # Extract scenario details
        if hasattr(scenario, "initial_failure"):
            initial = scenario.initial_failure
            conditions = scenario.conditions
        else:
            initial = scenario.get("initial_failure", {})
            conditions = scenario.get("conditions", {})

        # Inject initial failure
        self.inject_failure(initial["node_id"], initial.get("severity", 1.0))

        # Schedule additional failures
        additional = conditions.get("additional_failures", [])
        additional_sorted = sorted(additional, key=lambda x: x.get("delay_hours", 0))

        timeline = [{"t": 0.0, "event": "initial_failure", "node_id": initial["node_id"]}]
        total_steps = int(duration_hours * 3600 / dt_seconds)
        add_idx = 0

        for step_i in range(total_steps):
            current_hours = step_i * dt_seconds / 3600.0

            while add_idx < len(additional_sorted):
                af = additional_sorted[add_idx]
                if af.get("delay_hours", 0) <= current_hours:
                    self.inject_failure(af["node_id"], af["severity"])
                    timeline.append({
                        "t": current_hours,
                        "event": "additional_failure",
                        "node_id": af["node_id"],
                    })
                    add_idx += 1
                else:
                    break

            self.step(dt_seconds)

        # Collect results
        full_state = self.get_full_state()
        affected = []
        total_damage = 0.0
        for sector_state in full_state.values():
            for nid, ns in sector_state.items():
                if ns.get("failed", False):
                    affected.append(nid)
                    total_damage += ns.get("failure_severity", 1.0)

        return {
            "final_state": full_state,
            "timeline": timeline,
            "affected_nodes": affected,
            "total_damage": total_damage,
        }

    # ------------------------------------------------------------------
    # Data assimilation
    # ------------------------------------------------------------------

    def assimilate(self, live_sensor_data: np.ndarray) -> Dict:
        """Update twin state from real sensor data via Ensemble Kalman Filter.

        Parameters
        ----------
        live_sensor_data : ndarray of shape (obs_dim,)
            Live sensor readings mapped to the observation space.

        Returns
        -------
        dict with 'state_mean', 'divergence_check'.
        """
        # Check divergence before update
        obs_noise = np.eye(self._obs_dim) * 0.01
        div_check = self._enkf.check_divergence(
            live_sensor_data, obs_noise
        )

        # Run EnKF update
        analysis_mean, analysis_cov = self._enkf.update(
            live_sensor_data, obs_noise
        )

        # Push updated state back to engines
        self._set_combined_state_vector(analysis_mean)

        return {
            "state_mean": analysis_mean,
            "divergence_check": div_check,
        }

    # ------------------------------------------------------------------
    # State queries
    # ------------------------------------------------------------------

    def get_full_state(self) -> Dict[str, Dict]:
        """Return combined state across all sectors.

        Returns
        -------
        dict with keys 'water', 'power', 'telecom', each containing
        the respective engine's get_state() output.
        """
        return {
            "water": self._hydraulic.get_state(),
            "power": self._electrical.get_state(),
            "telecom": self._telecom.get_state(),
        }

    # ------------------------------------------------------------------
    # Training data export
    # ------------------------------------------------------------------

    def export_training_data(self) -> Dict[str, np.ndarray]:
        """Export recorded time-series for ML training.

        Returns
        -------
        dict with keys:
            'timestamps' : ndarray of shape (T,)
            'state_vectors' : ndarray of shape (T, state_dim)
        """
        if not self._history:
            return {
                "timestamps": np.array([], dtype=np.float64),
                "state_vectors": np.zeros((0, self._state_dim), dtype=np.float64),
            }

        timestamps = np.array(
            [h["time"] for h in self._history], dtype=np.float64
        )
        state_vectors = np.stack(
            [h["state_vector"] for h in self._history]
        )

        return {
            "timestamps": timestamps,
            "state_vectors": state_vectors,
        }

    # ------------------------------------------------------------------
    # Reset
    # ------------------------------------------------------------------

    def reset(self) -> None:
        """Reset all engines and history to clean state."""
        self._hydraulic.reset()
        self._electrical.reset()
        self._telecom.reset()
        self._history.clear()
        self._time = 0.0

        # Re-initialise EnKF
        mean = self._get_combined_state_vector()
        std = np.abs(mean) * 0.05 + 0.01
        self._enkf.initialize_ensemble(mean, std)

    # ------------------------------------------------------------------
    # Engine access (for coupling and advanced use)
    # ------------------------------------------------------------------

    @property
    def hydraulic(self) -> HydraulicEngine:
        return self._hydraulic

    @property
    def electrical(self) -> ElectricalEngine:
        return self._electrical

    @property
    def telecom(self) -> TelecomEngine:
        return self._telecom

    @property
    def coupling(self) -> CrossSectorCoupling:
        return self._coupling

    @property
    def enkf(self) -> EnsembleKalmanFilter:
        return self._enkf

    @property
    def time(self) -> float:
        return self._time
