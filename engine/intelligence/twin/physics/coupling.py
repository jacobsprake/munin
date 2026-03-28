"""
Cross-sector coupling interfaces for the Munin digital twin.

Models interdependencies between infrastructure sectors:
  - Power -> Water: pumping stations depend on electrical supply.
  - Telecom -> SCADA: communication dependency for remote monitoring.
  - Water -> Power: cooling water for thermal power plants.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np

from .hydraulic import HydraulicEngine
from .electrical import ElectricalEngine
from .telecom import TelecomEngine


# ---------------------------------------------------------------------------
# Coupling dependency descriptors
# ---------------------------------------------------------------------------

@dataclass
class CouplingDependency:
    """Describes a cross-sector dependency.

    Parameters
    ----------
    source_sector : str
        Sector providing the service ('power', 'water', 'telecom').
    source_node_id : str
        Node in the source sector.
    target_sector : str
        Sector consuming the service.
    target_node_id : str
        Node in the target sector.
    coupling_type : str
        Nature of coupling ('power_to_pump', 'telecom_to_scada', 'water_to_cooling').
    coupling_strength : float
        How strongly the target depends on the source [0, 1].
        1.0 means total dependency (target fails if source fails).
    """

    source_sector: str
    source_node_id: str
    target_sector: str
    target_node_id: str
    coupling_type: str
    coupling_strength: float = 1.0


class CrossSectorCoupling:
    """Manages cross-sector state propagation between physics engines.

    Tracks explicit dependencies between infrastructure sectors and
    propagates failures and degradation across sector boundaries.

    Parameters
    ----------
    dependencies : list of CouplingDependency
        All cross-sector dependency mappings.
    """

    def __init__(self, dependencies: Optional[List[CouplingDependency]] = None) -> None:
        self._dependencies = list(dependencies) if dependencies else []

    # ------------------------------------------------------------------
    # Dependency management
    # ------------------------------------------------------------------

    def add_dependency(self, dep: CouplingDependency) -> None:
        """Register a new cross-sector dependency."""
        self._dependencies.append(dep)

    def remove_dependency(
        self, source_node_id: str, target_node_id: str
    ) -> None:
        """Remove a specific dependency."""
        self._dependencies = [
            d
            for d in self._dependencies
            if not (
                d.source_node_id == source_node_id
                and d.target_node_id == target_node_id
            )
        ]

    # ------------------------------------------------------------------
    # Propagation logic
    # ------------------------------------------------------------------

    def propagate(
        self,
        hydraulic: Optional[HydraulicEngine] = None,
        electrical: Optional[ElectricalEngine] = None,
        telecom: Optional[TelecomEngine] = None,
    ) -> List[Dict]:
        """Propagate state changes across sector boundaries.

        For each registered dependency, checks if the source node is
        degraded or failed, and applies proportional degradation to the
        target node.

        Parameters
        ----------
        hydraulic : HydraulicEngine or None
        electrical : ElectricalEngine or None
        telecom : TelecomEngine or None

        Returns
        -------
        list of dict
            Log of propagation events with details.
        """
        engines = {
            "water": hydraulic,
            "power": electrical,
            "telecom": telecom,
        }

        events: List[Dict] = []

        for dep in self._dependencies:
            src_engine = engines.get(dep.source_sector)
            tgt_engine = engines.get(dep.target_sector)

            if src_engine is None or tgt_engine is None:
                continue

            # Get source node state
            src_state = self._get_node_state(src_engine, dep.source_node_id)
            if src_state is None:
                continue

            src_failed = src_state.get("failed", False)
            src_severity = src_state.get("failure_severity", 0.0)

            if not src_failed and src_severity == 0.0:
                continue  # Source is healthy, no propagation needed

            # Compute propagated severity
            propagated_severity = src_severity * dep.coupling_strength

            if propagated_severity < 0.01:
                continue  # Negligible effect

            # Apply to target
            event = self._apply_coupling(
                tgt_engine, dep, propagated_severity
            )
            if event is not None:
                events.append(event)

        return events

    def _get_node_state(self, engine: object, node_id: str) -> Optional[Dict]:
        """Get state dict for a specific node from any engine."""
        state = engine.get_state()  # type: ignore[union-attr]
        return state.get(node_id)

    def _apply_coupling(
        self,
        engine: object,
        dep: CouplingDependency,
        severity: float,
    ) -> Optional[Dict]:
        """Apply coupling effect to target node."""
        try:
            engine.inject_failure(dep.target_node_id, severity)  # type: ignore[union-attr]
        except KeyError:
            return None

        return {
            "coupling_type": dep.coupling_type,
            "source": f"{dep.source_sector}:{dep.source_node_id}",
            "target": f"{dep.target_sector}:{dep.target_node_id}",
            "propagated_severity": severity,
        }

    # ------------------------------------------------------------------
    # Specific coupling models
    # ------------------------------------------------------------------

    def propagate_power_to_water(
        self,
        electrical: ElectricalEngine,
        hydraulic: HydraulicEngine,
    ) -> List[Dict]:
        """Propagate power failures to water pumping stations.

        When a power node fails, all dependent pumping stations lose
        their electrical supply and cannot maintain flow.
        """
        events = []
        power_deps = [
            d for d in self._dependencies if d.coupling_type == "power_to_pump"
        ]

        for dep in power_deps:
            power_state = electrical.get_state().get(dep.source_node_id, {})
            if power_state.get("failed", False):
                severity = power_state.get("failure_severity", 1.0) * dep.coupling_strength
                try:
                    hydraulic.inject_failure(dep.target_node_id, severity)
                    events.append({
                        "coupling_type": "power_to_pump",
                        "power_node": dep.source_node_id,
                        "pump_node": dep.target_node_id,
                        "severity": severity,
                    })
                except KeyError:
                    pass

        return events

    def propagate_telecom_to_scada(
        self,
        telecom: TelecomEngine,
        hydraulic: Optional[HydraulicEngine] = None,
        electrical: Optional[ElectricalEngine] = None,
    ) -> List[Dict]:
        """Propagate telecom failures to SCADA-monitored infrastructure.

        When telecom nodes fail, remote monitoring and control of
        infrastructure becomes degraded — operators lose visibility.
        This is modelled as increased effective failure severity on
        dependent nodes (blind spots).
        """
        events = []
        scada_deps = [
            d for d in self._dependencies if d.coupling_type == "telecom_to_scada"
        ]

        for dep in scada_deps:
            telecom_state = telecom.get_state().get(dep.source_node_id, {})
            if telecom_state.get("failed", False):
                severity = (
                    telecom_state.get("failure_severity", 1.0)
                    * dep.coupling_strength
                    * 0.5  # SCADA loss degrades but does not directly fail
                )
                target_engine = (
                    hydraulic if dep.target_sector == "water" else electrical
                )
                if target_engine is not None:
                    try:
                        target_engine.inject_failure(dep.target_node_id, severity)
                        events.append({
                            "coupling_type": "telecom_to_scada",
                            "telecom_node": dep.source_node_id,
                            "target_node": dep.target_node_id,
                            "target_sector": dep.target_sector,
                            "severity": severity,
                        })
                    except KeyError:
                        pass

        return events

    def propagate_water_to_power(
        self,
        hydraulic: HydraulicEngine,
        electrical: ElectricalEngine,
    ) -> List[Dict]:
        """Propagate water supply failures to thermal power plants.

        Thermal power plants require cooling water. If the water supply
        is disrupted, the plant must reduce output or shut down.
        """
        events = []
        cooling_deps = [
            d for d in self._dependencies if d.coupling_type == "water_to_cooling"
        ]

        for dep in cooling_deps:
            water_state = hydraulic.get_state().get(dep.source_node_id, {})
            water_level = water_state.get("level", 0.0)

            # If water level is critically low, degrade the power plant
            water_node = hydraulic.get_node(dep.source_node_id)
            if water_node.capacity > 0:
                level_ratio = water_level / water_node.capacity
            else:
                level_ratio = 0.0

            if level_ratio < 0.2:
                # Critical: force power reduction
                severity = (1.0 - level_ratio / 0.2) * dep.coupling_strength
                try:
                    electrical.inject_failure(dep.target_node_id, severity)
                    events.append({
                        "coupling_type": "water_to_cooling",
                        "water_node": dep.source_node_id,
                        "power_node": dep.target_node_id,
                        "water_level_ratio": level_ratio,
                        "severity": severity,
                    })
                except KeyError:
                    pass

        return events

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def get_dependencies(self) -> List[Dict]:
        """Return all dependencies as dicts for serialisation."""
        return [
            {
                "source_sector": d.source_sector,
                "source_node_id": d.source_node_id,
                "target_sector": d.target_sector,
                "target_node_id": d.target_node_id,
                "coupling_type": d.coupling_type,
                "coupling_strength": d.coupling_strength,
            }
            for d in self._dependencies
        ]
