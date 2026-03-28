"""
Power flow using simplified Newton-Raphson + protection relay logic.

Implements a DC power flow approximation with Newton-Raphson iteration for
the electrical grid sector of the Munin digital twin. Includes overcurrent
protection relay simulation.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class PowerNode:
    """A node in the electrical power network.

    Parameters
    ----------
    id : str
        Unique node identifier.
    type : str
        One of 'generator', 'substation', 'load'.
    capacity_mw : float
        Rated capacity in megawatts.
    current_load_mw : float
        Current load or generation in MW.
    voltage_pu : float
        Per-unit voltage (1.0 = nominal).
    phase_angle : float
        Bus voltage angle (radians).
    failed : bool
        Whether this node has tripped or failed.
    failure_severity : float
        Severity of failure [0, 1].
    """

    id: str
    type: str  # generator | substation | load
    capacity_mw: float
    current_load_mw: float = 0.0
    voltage_pu: float = 1.0
    phase_angle: float = 0.0
    failed: bool = False
    failure_severity: float = 0.0


@dataclass
class PowerConnection:
    """A transmission line connecting two power nodes.

    Parameters
    ----------
    source_id : str
        Sending-end bus identifier.
    target_id : str
        Receiving-end bus identifier.
    reactance_pu : float
        Line reactance in per-unit (used for DC power flow).
    capacity_mw : float
        Thermal capacity of the line in MW.
    current_flow_mw : float
        Current power flow on the line in MW.
    """

    source_id: str
    target_id: str
    reactance_pu: float = 0.1
    capacity_mw: float = 100.0
    current_flow_mw: float = 0.0


# ---------------------------------------------------------------------------
# Protection relay settings
# ---------------------------------------------------------------------------

OVERCURRENT_TRIP_FACTOR = 1.2  # Trip when load > 1.2 * capacity
UNDERVOLTAGE_THRESHOLD = 0.9  # Trip when voltage < 0.9 pu
OVERVOLTAGE_THRESHOLD = 1.1   # Trip when voltage > 1.1 pu


class ElectricalEngine:
    """Simplified DC power flow engine with protection relays.

    Uses the DC power flow approximation: P_ij = (theta_i - theta_j) / X_ij.
    Newton-Raphson iteration solves for bus angles given injections.

    Parameters
    ----------
    nodes : list of PowerNode
        All buses in the electrical network.
    connections : list of PowerConnection
        All transmission lines.
    """

    def __init__(
        self,
        nodes: List[PowerNode],
        connections: List[PowerConnection],
    ) -> None:
        self._nodes: Dict[str, PowerNode] = {n.id: n for n in nodes}
        self._connections: List[PowerConnection] = list(connections)
        self._time: float = 0.0
        self._tripped_relays: List[str] = []

        # Index nodes for matrix operations
        self._node_ids = sorted(self._nodes.keys())
        self._idx: Dict[str, int] = {nid: i for i, nid in enumerate(self._node_ids)}

    # ------------------------------------------------------------------
    # DC Power Flow: Newton-Raphson
    # ------------------------------------------------------------------

    def _build_b_matrix(self) -> np.ndarray:
        """Build the B (susceptance) matrix for DC power flow.

        B_ij = -1/X_ij for connected buses i,j.
        B_ii = sum(1/X_ij) for all connections to bus i.
        """
        n = len(self._node_ids)
        B = np.zeros((n, n), dtype=np.float64)

        for conn in self._connections:
            i = self._idx.get(conn.source_id)
            j = self._idx.get(conn.target_id)
            if i is None or j is None:
                continue
            b = 1.0 / max(conn.reactance_pu, 1e-6)
            B[i, j] -= b
            B[j, i] -= b
            B[i, i] += b
            B[j, j] += b

        return B

    def _get_injection_vector(self) -> np.ndarray:
        """Compute net power injection at each bus (generation - load)."""
        n = len(self._node_ids)
        P = np.zeros(n, dtype=np.float64)

        for nid, node in self._nodes.items():
            idx = self._idx[nid]
            if node.failed:
                P[idx] = 0.0
            elif node.type == "generator":
                P[idx] = node.current_load_mw * (1.0 - node.failure_severity)
            elif node.type == "load":
                P[idx] = -node.current_load_mw
            else:
                # Substation: net pass-through
                P[idx] = 0.0

        return P

    def _solve_dc_power_flow(self, max_iter: int = 10, tol: float = 1e-6) -> None:
        """Solve DC power flow: B * theta = P.

        Uses the slack bus (first generator) as the reference (angle = 0).
        """
        n = len(self._node_ids)
        if n == 0:
            return

        B = self._build_b_matrix()
        P = self._get_injection_vector()

        # Find slack bus (first generator)
        slack_idx = 0
        for nid in self._node_ids:
            node = self._nodes[nid]
            if node.type == "generator" and not node.failed:
                slack_idx = self._idx[nid]
                break

        # Remove slack bus row/column
        mask = np.ones(n, dtype=bool)
        mask[slack_idx] = False
        B_red = B[np.ix_(mask, mask)]
        P_red = P[mask]

        # Solve via Newton-Raphson (linear for DC, single iteration)
        try:
            theta_red = np.linalg.solve(B_red, P_red)
        except np.linalg.LinAlgError:
            # Singular matrix: network is disconnected
            theta_red = np.zeros(n - 1, dtype=np.float64)

        # Reconstruct full theta vector
        theta = np.zeros(n, dtype=np.float64)
        j = 0
        for i in range(n):
            if i == slack_idx:
                theta[i] = 0.0
            else:
                theta[i] = theta_red[j]
                j += 1

        # Write angles back to nodes
        for nid in self._node_ids:
            self._nodes[nid].phase_angle = float(theta[self._idx[nid]])

        # Compute line flows
        for conn in self._connections:
            i = self._idx.get(conn.source_id)
            j = self._idx.get(conn.target_id)
            if i is None or j is None:
                continue
            flow = (theta[i] - theta[j]) / max(conn.reactance_pu, 1e-6)
            conn.current_flow_mw = flow

    # ------------------------------------------------------------------
    # Protection relays
    # ------------------------------------------------------------------

    def _check_protection(self) -> List[str]:
        """Check protection relay conditions and trip overloaded nodes.

        Returns list of newly tripped node IDs.
        """
        newly_tripped = []

        for nid, node in self._nodes.items():
            if node.failed:
                continue

            # Overcurrent: load exceeds 120% of capacity
            if node.current_load_mw > OVERCURRENT_TRIP_FACTOR * node.capacity_mw:
                node.failed = True
                node.failure_severity = 1.0
                newly_tripped.append(nid)
                continue

            # Voltage protection (simplified: model voltage drop under load)
            load_ratio = node.current_load_mw / max(node.capacity_mw, 1e-6)
            estimated_voltage = 1.0 - 0.15 * load_ratio  # simplified droop
            node.voltage_pu = max(0.0, estimated_voltage)

            if node.voltage_pu < UNDERVOLTAGE_THRESHOLD:
                node.failed = True
                node.failure_severity = 0.8
                newly_tripped.append(nid)
            elif node.voltage_pu > OVERVOLTAGE_THRESHOLD:
                node.failed = True
                node.failure_severity = 0.5
                newly_tripped.append(nid)

        return newly_tripped

    # ------------------------------------------------------------------
    # Simulation step
    # ------------------------------------------------------------------

    def step(self, dt: float) -> None:
        """Advance the electrical simulation by *dt* seconds.

        1. Solve DC power flow (Newton-Raphson).
        2. Update node loads from line flows.
        3. Check protection relays.
        """
        self._solve_dc_power_flow()

        # Update substation loads from net flow
        for nid in self._node_ids:
            node = self._nodes[nid]
            if node.type == "substation":
                inflow = sum(
                    c.current_flow_mw
                    for c in self._connections
                    if c.target_id == nid
                )
                outflow = sum(
                    c.current_flow_mw
                    for c in self._connections
                    if c.source_id == nid
                )
                node.current_load_mw = abs(inflow - outflow)

        # Check protection
        tripped = self._check_protection()
        self._tripped_relays.extend(tripped)

        self._time += dt

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_state(self) -> Dict[str, Dict]:
        """Return the current state of all power nodes."""
        state = {}
        for nid, node in self._nodes.items():
            state[nid] = {
                "load_mw": node.current_load_mw,
                "capacity_mw": node.capacity_mw,
                "voltage_pu": node.voltage_pu,
                "phase_angle": node.phase_angle,
                "failed": node.failed,
                "failure_severity": node.failure_severity,
                "type": node.type,
            }
        return state

    def inject_failure(self, node_id: str, severity: float = 1.0) -> None:
        """Simulate a failure at *node_id*."""
        node = self._nodes.get(node_id)
        if node is None:
            raise KeyError(f"Unknown power node: {node_id}")
        node.failed = True
        node.failure_severity = max(0.0, min(1.0, severity))

    def reset(self) -> None:
        """Reset all nodes to nominal state."""
        for node in self._nodes.values():
            node.failed = False
            node.failure_severity = 0.0
            node.voltage_pu = 1.0
            node.phase_angle = 0.0
        for conn in self._connections:
            conn.current_flow_mw = 0.0
        self._tripped_relays.clear()
        self._time = 0.0

    def get_node(self, node_id: str) -> PowerNode:
        node = self._nodes.get(node_id)
        if node is None:
            raise KeyError(f"Unknown power node: {node_id}")
        return node

    @property
    def time(self) -> float:
        return self._time

    @property
    def tripped_relays(self) -> List[str]:
        return list(self._tripped_relays)

    def state_vector(self) -> np.ndarray:
        """Flat array of [load_mw, voltage_pu] per node (sorted by id)."""
        ids = sorted(self._nodes.keys())
        vals = []
        for nid in ids:
            n = self._nodes[nid]
            vals.extend([n.current_load_mw, n.voltage_pu])
        return np.array(vals, dtype=np.float64)

    def set_state_vector(self, vec: np.ndarray) -> None:
        ids = sorted(self._nodes.keys())
        for i, nid in enumerate(ids):
            self._nodes[nid].current_load_mw = float(vec[2 * i])
            self._nodes[nid].voltage_pu = float(vec[2 * i + 1])
