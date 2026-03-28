"""
Saint-Venant shallow water equations for open channels + Hazen-Williams for pipe flow.

Implements simplified 1D Saint-Venant equations (continuity + momentum) for
open-channel flow and the Hazen-Williams head loss formula for pressurised
pipe networks. Designed for real-time digital twin simulation of water
distribution infrastructure.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import numpy as np


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class HydraulicNode:
    """A node in the hydraulic network.

    Parameters
    ----------
    id : str
        Unique node identifier.
    type : str
        One of 'reservoir', 'pump', 'pipe', 'treatment'.
    capacity : float
        Maximum capacity (m^3 for storage, m^3/s for flow nodes).
    current_level : float
        Current water level (m) or storage volume (m^3).
    current_flow : float
        Current volumetric flow rate (m^3/s).
    elevation : float
        Node elevation above datum (m).
    failed : bool
        Whether this node is currently in a failure state.
    failure_severity : float
        Severity of failure [0, 1]. 0 = nominal, 1 = total failure.
    """

    id: str
    type: str  # reservoir | pump | pipe | treatment
    capacity: float
    current_level: float = 0.0
    current_flow: float = 0.0
    elevation: float = 0.0
    failed: bool = False
    failure_severity: float = 0.0


@dataclass
class HydraulicConnection:
    """A pipe or channel connecting two hydraulic nodes.

    Parameters
    ----------
    source_id : str
        Upstream node identifier.
    target_id : str
        Downstream node identifier.
    pipe_diameter : float
        Internal pipe diameter (m).
    length : float
        Pipe/channel length (m).
    roughness_coeff : float
        Hazen-Williams roughness coefficient C (dimensionless, typical 100-150).
    channel_width : float
        Width for open-channel sections (m). 0 means pressurised pipe.
    current_flow : float
        Current flow through this connection (m^3/s).
    """

    source_id: str
    target_id: str
    pipe_diameter: float
    length: float
    roughness_coeff: float = 130.0
    channel_width: float = 0.0
    current_flow: float = 0.0


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GRAVITY = 9.81  # m/s^2
WATER_DENSITY = 998.0  # kg/m^3


class HydraulicEngine:
    """Multi-physics hydraulic simulation engine.

    Combines simplified Saint-Venant equations for open-channel flow with
    Hazen-Williams head loss for pressurised pipe networks.

    Parameters
    ----------
    nodes : list of HydraulicNode
        All nodes in the hydraulic network.
    connections : list of HydraulicConnection
        All connections (pipes/channels) between nodes.
    """

    def __init__(
        self,
        nodes: List[HydraulicNode],
        connections: List[HydraulicConnection],
    ) -> None:
        self._nodes: Dict[str, HydraulicNode] = {n.id: n for n in nodes}
        self._connections: List[HydraulicConnection] = list(connections)
        self._time: float = 0.0

        # Build adjacency: node_id -> list of connections originating here
        self._outgoing: Dict[str, List[HydraulicConnection]] = {}
        self._incoming: Dict[str, List[HydraulicConnection]] = {}
        for conn in self._connections:
            self._outgoing.setdefault(conn.source_id, []).append(conn)
            self._incoming.setdefault(conn.target_id, []).append(conn)

    # ------------------------------------------------------------------
    # Physics: Hazen-Williams head loss
    # ------------------------------------------------------------------

    @staticmethod
    def _hazen_williams_headloss(
        flow: float,
        diameter: float,
        length: float,
        roughness: float,
    ) -> float:
        """Compute head loss (m) using the Hazen-Williams formula.

        h_f = (10.67 * L * Q^1.852) / (C^1.852 * D^4.8704)

        where Q is flow (m^3/s), L is length (m), D is diameter (m),
        and C is the roughness coefficient.
        """
        if abs(flow) < 1e-12 or diameter < 1e-6 or roughness < 1e-6:
            return 0.0
        sign = 1.0 if flow >= 0 else -1.0
        q_abs = abs(flow)
        h_f = (10.67 * length * q_abs ** 1.852) / (
            roughness ** 1.852 * diameter ** 4.8704
        )
        return sign * h_f

    # ------------------------------------------------------------------
    # Physics: Simplified Saint-Venant (open channel)
    # ------------------------------------------------------------------

    @staticmethod
    def _saint_venant_flow(
        depth_up: float,
        depth_down: float,
        channel_width: float,
        channel_length: float,
        roughness_n: float = 0.03,
        slope: float = 0.001,
    ) -> float:
        """Simplified Saint-Venant: steady uniform flow via Manning's equation.

        Q = (1/n) * A * R_h^(2/3) * S^(1/2)

        For a rectangular channel: A = w*d, P = w + 2d, R_h = A/P.
        The effective slope accounts for the depth gradient between nodes.
        """
        avg_depth = 0.5 * (depth_up + depth_down)
        if avg_depth < 1e-6 or channel_width < 1e-6:
            return 0.0

        area = channel_width * avg_depth
        wetted_perimeter = channel_width + 2.0 * avg_depth
        r_h = area / wetted_perimeter

        # Effective slope: bed slope + depth gradient
        depth_slope = (depth_up - depth_down) / max(channel_length, 1.0)
        s_eff = max(slope + depth_slope, 1e-8)

        q = (1.0 / roughness_n) * area * r_h ** (2.0 / 3.0) * math.sqrt(s_eff)
        return q

    # ------------------------------------------------------------------
    # Pump model
    # ------------------------------------------------------------------

    def _compute_pump_flow(self, node: HydraulicNode) -> float:
        """Simple pump: delivers flow proportional to (1 - failure_severity)."""
        if node.failed:
            return node.capacity * max(0.0, 1.0 - node.failure_severity)
        return node.capacity

    # ------------------------------------------------------------------
    # Simulation step
    # ------------------------------------------------------------------

    def step(self, dt: float) -> None:
        """Advance the hydraulic simulation by *dt* seconds.

        1. Compute flow through each connection (Hazen-Williams or Saint-Venant).
        2. Update node levels using continuity (mass balance).
        3. Apply pump delivery.
        """
        # --- Step 1: Compute connection flows ---
        for conn in self._connections:
            src = self._nodes.get(conn.source_id)
            tgt = self._nodes.get(conn.target_id)
            if src is None or tgt is None:
                continue

            if conn.channel_width > 0:
                # Open channel: Saint-Venant
                flow = self._saint_venant_flow(
                    depth_up=src.current_level,
                    depth_down=tgt.current_level,
                    channel_width=conn.channel_width,
                    channel_length=conn.length,
                )
            else:
                # Pressurised pipe: Hazen-Williams
                # Drive flow by head difference (elevation + water level)
                head_src = src.elevation + src.current_level
                head_tgt = tgt.elevation + tgt.current_level
                head_diff = head_src - head_tgt

                if abs(head_diff) < 1e-6:
                    flow = 0.0
                else:
                    # Estimate flow from head loss inversion:
                    # h_f = k * Q^1.852  =>  Q = (h_f / k)^(1/1.852)
                    k = 10.67 * conn.length / (
                        conn.roughness_coeff ** 1.852
                        * conn.pipe_diameter ** 4.8704
                    )
                    if k < 1e-12:
                        flow = 0.0
                    else:
                        sign = 1.0 if head_diff >= 0 else -1.0
                        flow = sign * (abs(head_diff) / k) ** (1.0 / 1.852)

            # Degrade flow if source node has failed
            if src.failed:
                flow *= max(0.0, 1.0 - src.failure_severity)

            conn.current_flow = flow

        # --- Step 2: Mass balance on storage/reservoir nodes ---
        for nid, node in self._nodes.items():
            inflow = sum(c.current_flow for c in self._incoming.get(nid, []))
            outflow = sum(c.current_flow for c in self._outgoing.get(nid, []))

            if node.type == "pump":
                pump_flow = self._compute_pump_flow(node)
                node.current_flow = pump_flow
            else:
                node.current_flow = inflow - outflow

            # Update level for storage nodes
            if node.type in ("reservoir", "treatment"):
                node.current_level += (inflow - outflow) * dt
                node.current_level = max(0.0, min(node.current_level, node.capacity))

        self._time += dt

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_state(self) -> Dict[str, Dict]:
        """Return the current state of all nodes.

        Returns
        -------
        dict
            Mapping of node_id -> {level, flow, pressure, failed, type}.
        """
        state = {}
        for nid, node in self._nodes.items():
            # Hydrostatic pressure at the node (Pa)
            pressure = WATER_DENSITY * GRAVITY * node.current_level
            state[nid] = {
                "level": node.current_level,
                "flow": node.current_flow,
                "pressure": pressure,
                "failed": node.failed,
                "failure_severity": node.failure_severity,
                "type": node.type,
            }
        return state

    def inject_failure(self, node_id: str, severity: float = 1.0) -> None:
        """Simulate a failure at *node_id*.

        Parameters
        ----------
        node_id : str
            Target node.
        severity : float
            Failure severity in [0, 1]. 1 = total failure.
        """
        node = self._nodes.get(node_id)
        if node is None:
            raise KeyError(f"Unknown hydraulic node: {node_id}")
        node.failed = True
        node.failure_severity = max(0.0, min(1.0, severity))

    def reset(self) -> None:
        """Reset all nodes to nominal state."""
        for node in self._nodes.values():
            node.failed = False
            node.failure_severity = 0.0
            node.current_flow = 0.0
        for conn in self._connections:
            conn.current_flow = 0.0
        self._time = 0.0

    def get_node(self, node_id: str) -> HydraulicNode:
        """Return a node by id."""
        node = self._nodes.get(node_id)
        if node is None:
            raise KeyError(f"Unknown hydraulic node: {node_id}")
        return node

    @property
    def time(self) -> float:
        return self._time

    def state_vector(self) -> np.ndarray:
        """Return a flat numpy array of [level, flow] for each node (sorted by id)."""
        ids = sorted(self._nodes.keys())
        vals = []
        for nid in ids:
            n = self._nodes[nid]
            vals.extend([n.current_level, n.current_flow])
        return np.array(vals, dtype=np.float64)

    def set_state_vector(self, vec: np.ndarray) -> None:
        """Set node states from a flat vector (must match state_vector layout)."""
        ids = sorted(self._nodes.keys())
        for i, nid in enumerate(ids):
            self._nodes[nid].current_level = float(vec[2 * i])
            self._nodes[nid].current_flow = float(vec[2 * i + 1])
