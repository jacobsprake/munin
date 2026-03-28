"""
Network topology with bandwidth allocation, signal attenuation, and congestion.

Models telecommunications infrastructure including signal propagation loss,
bandwidth congestion, and redundancy path calculation for the Munin digital twin.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Optional, Set, Tuple

import numpy as np


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class TelecomNode:
    """A node in the telecommunications network.

    Parameters
    ----------
    id : str
        Unique node identifier.
    type : str
        One of 'tower', 'switch', 'router'.
    bandwidth_gbps : float
        Maximum bandwidth capacity in Gbps.
    current_load_gbps : float
        Current traffic load in Gbps.
    signal_strength_dbm : float
        Current signal strength in dBm.
    position_xy : tuple of float
        Geographic position (x, y) in km for attenuation calculation.
    failed : bool
        Whether this node has failed.
    failure_severity : float
        Severity of failure [0, 1].
    """

    id: str
    type: str  # tower | switch | router
    bandwidth_gbps: float
    current_load_gbps: float = 0.0
    signal_strength_dbm: float = -30.0
    position_xy: Tuple[float, float] = (0.0, 0.0)
    failed: bool = False
    failure_severity: float = 0.0


@dataclass
class TelecomConnection:
    """A link between two telecom nodes.

    Parameters
    ----------
    source_id : str
        Source node identifier.
    target_id : str
        Target node identifier.
    bandwidth_gbps : float
        Link capacity in Gbps.
    current_load_gbps : float
        Current traffic on this link.
    link_type : str
        'fiber' or 'wireless'.
    """

    source_id: str
    target_id: str
    bandwidth_gbps: float = 10.0
    current_load_gbps: float = 0.0
    link_type: str = "fiber"  # fiber | wireless


# ---------------------------------------------------------------------------
# Signal attenuation models
# ---------------------------------------------------------------------------

# Fiber attenuation: ~0.2 dB/km for single-mode fiber at 1550nm
FIBER_ATTENUATION_DB_PER_KM = 0.2

# Free-space path loss reference: FSPL(d) = 20*log10(d) + 20*log10(f) + 32.44
# Using 2.4 GHz as default frequency
DEFAULT_FREQ_GHZ = 2.4

# Congestion threshold: performance degrades above this utilisation ratio
CONGESTION_THRESHOLD = 0.8


class TelecomEngine:
    """Telecommunications network simulation engine.

    Models signal attenuation, bandwidth congestion, and path redundancy
    for the telecom sector of the digital twin.

    Parameters
    ----------
    nodes : list of TelecomNode
        All nodes in the telecom network.
    connections : list of TelecomConnection
        All links between nodes.
    """

    def __init__(
        self,
        nodes: List[TelecomNode],
        connections: List[TelecomConnection],
    ) -> None:
        self._nodes: Dict[str, TelecomNode] = {n.id: n for n in nodes}
        self._connections: List[TelecomConnection] = list(connections)
        self._time: float = 0.0

        # Adjacency lists (bidirectional for redundancy search)
        self._adjacency: Dict[str, List[Tuple[str, TelecomConnection]]] = {}
        for conn in self._connections:
            self._adjacency.setdefault(conn.source_id, []).append(
                (conn.target_id, conn)
            )
            self._adjacency.setdefault(conn.target_id, []).append(
                (conn.source_id, conn)
            )

    # ------------------------------------------------------------------
    # Signal attenuation
    # ------------------------------------------------------------------

    def _compute_attenuation(
        self,
        src: TelecomNode,
        tgt: TelecomNode,
        conn: TelecomConnection,
    ) -> float:
        """Compute signal attenuation in dB between two nodes."""
        dx = src.position_xy[0] - tgt.position_xy[0]
        dy = src.position_xy[1] - tgt.position_xy[1]
        distance_km = math.sqrt(dx * dx + dy * dy)

        if conn.link_type == "fiber":
            return FIBER_ATTENUATION_DB_PER_KM * distance_km
        else:
            # Free-space path loss (wireless)
            if distance_km < 0.001:
                return 0.0
            fspl = (
                20.0 * math.log10(distance_km)
                + 20.0 * math.log10(DEFAULT_FREQ_GHZ)
                + 32.44
            )
            return fspl

    # ------------------------------------------------------------------
    # Congestion model
    # ------------------------------------------------------------------

    @staticmethod
    def _congestion_factor(load: float, capacity: float) -> float:
        """Compute congestion-induced throughput degradation.

        Returns a factor in [0, 1] representing effective throughput ratio.
        Below CONGESTION_THRESHOLD utilisation, throughput is linear.
        Above it, throughput degrades quadratically.
        """
        if capacity <= 0:
            return 0.0
        utilisation = load / capacity
        if utilisation <= CONGESTION_THRESHOLD:
            return 1.0
        elif utilisation >= 1.0:
            return 0.1  # severe congestion, 10% effective throughput
        else:
            # Quadratic degradation between threshold and 1.0
            excess = (utilisation - CONGESTION_THRESHOLD) / (
                1.0 - CONGESTION_THRESHOLD
            )
            return max(0.1, 1.0 - 0.9 * excess * excess)

    # ------------------------------------------------------------------
    # Redundancy path calculation (BFS-based)
    # ------------------------------------------------------------------

    def find_redundant_paths(
        self,
        source_id: str,
        target_id: str,
        max_paths: int = 3,
    ) -> List[List[str]]:
        """Find up to *max_paths* node-disjoint paths between source and target.

        Uses iterative BFS with node removal to find disjoint paths.
        """
        if source_id not in self._nodes or target_id not in self._nodes:
            return []

        paths: List[List[str]] = []
        excluded_nodes: Set[str] = set()

        for _ in range(max_paths):
            path = self._bfs_path(source_id, target_id, excluded_nodes)
            if path is None:
                break
            paths.append(path)
            # Exclude intermediate nodes to find disjoint paths
            for nid in path[1:-1]:
                excluded_nodes.add(nid)

        return paths

    def _bfs_path(
        self,
        source_id: str,
        target_id: str,
        excluded: Set[str],
    ) -> Optional[List[str]]:
        """BFS shortest path avoiding excluded nodes and failed nodes."""
        if source_id in excluded or target_id in excluded:
            return None

        visited: Set[str] = set()
        queue: deque = deque()
        queue.append((source_id, [source_id]))
        visited.add(source_id)

        while queue:
            current, path = queue.popleft()
            if current == target_id:
                return path

            for neighbor_id, conn in self._adjacency.get(current, []):
                if neighbor_id in visited or neighbor_id in excluded:
                    continue
                node = self._nodes.get(neighbor_id)
                if node is None or (node.failed and node.failure_severity >= 1.0):
                    continue
                visited.add(neighbor_id)
                queue.append((neighbor_id, path + [neighbor_id]))

        return None

    # ------------------------------------------------------------------
    # Simulation step
    # ------------------------------------------------------------------

    def step(self, dt: float) -> None:
        """Advance telecom simulation by *dt* seconds.

        1. Compute signal attenuation on each link.
        2. Update node signal strength from best incoming link.
        3. Compute congestion on each link and node.
        4. Degrade throughput for congested nodes.
        """
        # Reset node signal strength
        best_signal: Dict[str, float] = {
            nid: -120.0 for nid in self._nodes
        }

        # Step 1+2: Attenuation and signal propagation
        for conn in self._connections:
            src = self._nodes.get(conn.source_id)
            tgt = self._nodes.get(conn.target_id)
            if src is None or tgt is None:
                continue

            if src.failed and src.failure_severity >= 1.0:
                continue

            atten = self._compute_attenuation(src, tgt, conn)
            effective_signal = src.signal_strength_dbm - atten

            # Degrade if source is partially failed
            if src.failed:
                effective_signal -= 20.0 * src.failure_severity

            if effective_signal > best_signal[conn.target_id]:
                best_signal[conn.target_id] = effective_signal

            # Symmetric: also propagate in reverse for bidirectional links
            if not (tgt.failed and tgt.failure_severity >= 1.0):
                rev_signal = tgt.signal_strength_dbm - atten
                if tgt.failed:
                    rev_signal -= 20.0 * tgt.failure_severity
                if rev_signal > best_signal[conn.source_id]:
                    best_signal[conn.source_id] = rev_signal

        # Update node signal strengths
        for nid, node in self._nodes.items():
            if not node.failed:
                # Keep own signal if it is a tower (transmitter)
                if node.type == "tower":
                    best_signal[nid] = max(best_signal[nid], node.signal_strength_dbm)
                node.signal_strength_dbm = best_signal[nid]

        # Step 3+4: Congestion
        for conn in self._connections:
            factor = self._congestion_factor(
                conn.current_load_gbps, conn.bandwidth_gbps
            )
            # Effective throughput
            conn.current_load_gbps = min(
                conn.current_load_gbps, conn.bandwidth_gbps * factor
            )

        for nid, node in self._nodes.items():
            if node.failed:
                node.current_load_gbps *= max(0.0, 1.0 - node.failure_severity)

        self._time += dt

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_state(self) -> Dict[str, Dict]:
        """Return the current state of all telecom nodes."""
        state = {}
        for nid, node in self._nodes.items():
            congestion = self._congestion_factor(
                node.current_load_gbps, node.bandwidth_gbps
            )
            state[nid] = {
                "bandwidth_gbps": node.bandwidth_gbps,
                "load_gbps": node.current_load_gbps,
                "signal_strength_dbm": node.signal_strength_dbm,
                "congestion_factor": congestion,
                "failed": node.failed,
                "failure_severity": node.failure_severity,
                "type": node.type,
            }
        return state

    def inject_failure(self, node_id: str, severity: float = 1.0) -> None:
        """Simulate a failure at *node_id*."""
        node = self._nodes.get(node_id)
        if node is None:
            raise KeyError(f"Unknown telecom node: {node_id}")
        node.failed = True
        node.failure_severity = max(0.0, min(1.0, severity))

    def reset(self) -> None:
        """Reset all nodes to nominal state."""
        for node in self._nodes.values():
            node.failed = False
            node.failure_severity = 0.0
        for conn in self._connections:
            conn.current_load_gbps = 0.0
        self._time = 0.0

    def get_node(self, node_id: str) -> TelecomNode:
        node = self._nodes.get(node_id)
        if node is None:
            raise KeyError(f"Unknown telecom node: {node_id}")
        return node

    @property
    def time(self) -> float:
        return self._time

    def state_vector(self) -> np.ndarray:
        """Flat array of [load_gbps, signal_strength_dbm] per node."""
        ids = sorted(self._nodes.keys())
        vals = []
        for nid in ids:
            n = self._nodes[nid]
            vals.extend([n.current_load_gbps, n.signal_strength_dbm])
        return np.array(vals, dtype=np.float64)

    def set_state_vector(self, vec: np.ndarray) -> None:
        ids = sorted(self._nodes.keys())
        for i, nid in enumerate(ids):
            self._nodes[nid].current_load_gbps = float(vec[2 * i])
            self._nodes[nid].signal_strength_dbm = float(vec[2 * i + 1])
