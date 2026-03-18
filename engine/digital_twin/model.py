"""
Digital Twin Model: orchestrates interconnected infrastructure subsystems.

Creates a small "nation in a box": power nodes, water nodes, and telecom nodes
coupled through physical dependencies. Runs discrete-time simulation and
produces ground-truth dependency graphs and cascade timelines.

Usage:
    from engine.digital_twin.model import DigitalTwinModel, NationConfig
    model = DigitalTwinModel(NationConfig())
    df, cascade = model.run(duration_hours=48, fault_schedule={...})
"""
from __future__ import annotations

import json
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from digital_twin.subsystems import (
    PowerNode, WaterNode, TelecomNode,
    SubsystemStatus,
)


@dataclass
class FaultEvent:
    """A scheduled fault injection."""
    time_hours: float
    node_id: str
    fault_type: str
    description: str = ""


@dataclass
class NationConfig:
    """Configuration for a small national infrastructure grid."""
    seed: int = 42
    dt_seconds: float = 60.0  # simulation timestep

    # Power nodes
    power_nodes: List[Dict] = field(default_factory=lambda: [
        {"node_id": "substation_north", "region": "north", "capacity_mw": 60.0},
        {"node_id": "substation_south", "region": "south", "capacity_mw": 45.0},
    ])

    # Water nodes
    water_nodes: List[Dict] = field(default_factory=lambda: [
        {"node_id": "pump_station_7", "region": "north", "node_type": "pump"},
        {"node_id": "pump_station_12", "region": "south", "node_type": "pump"},
        {"node_id": "reservoir_west", "region": "west", "node_type": "reservoir"},
        {"node_id": "treatment_plant", "region": "central", "node_type": "treatment"},
    ])

    # Telecom nodes
    telecom_nodes: List[Dict] = field(default_factory=lambda: [
        {"node_id": "tower_alpha", "region": "north"},
        {"node_id": "tower_beta", "region": "south"},
    ])

    # Physical coupling rules: which power node feeds which water/telecom nodes
    power_dependencies: Dict[str, List[str]] = field(default_factory=lambda: {
        "substation_north": ["pump_station_7", "tower_alpha", "treatment_plant"],
        "substation_south": ["pump_station_12", "tower_beta"],
    })

    # Water dependencies: which pump feeds which reservoir
    water_dependencies: Dict[str, List[str]] = field(default_factory=lambda: {
        "pump_station_7": ["reservoir_west"],
    })

    # Simulated rainfall profile (mm/h at each hour; 0 = clear)
    rainfall_profile: Optional[List[float]] = None  # if None, generate synthetic storm


class CascadeEvent:
    """Records a cascade event during simulation."""
    def __init__(self, time_s: float, source_id: str, target_id: str,
                 effect: str, source_status: str, target_status: str):
        self.time_s = time_s
        self.source_id = source_id
        self.target_id = target_id
        self.effect = effect
        self.source_status = source_status
        self.target_status = target_status

    def to_dict(self) -> Dict:
        return {
            "time_s": self.time_s,
            "source": self.source_id,
            "target": self.target_id,
            "effect": self.effect,
            "source_status": self.source_status,
            "target_status": self.target_status,
        }


class DigitalTwinModel:
    """
    Orchestrator for a multi-sector infrastructure digital twin.

    Couples power, water, and telecom subsystems through physical dependencies.
    Tracks cascade propagation and produces ground-truth data.
    """

    def __init__(self, config: NationConfig):
        self.config = config
        self.rng = np.random.RandomState(config.seed)
        np.random.seed(config.seed)

        # Instantiate subsystems
        self.power_nodes: Dict[str, PowerNode] = {}
        for p in config.power_nodes:
            self.power_nodes[p["node_id"]] = PowerNode(**p)

        self.water_nodes: Dict[str, WaterNode] = {}
        for w in config.water_nodes:
            self.water_nodes[w["node_id"]] = WaterNode(**w)

        self.telecom_nodes: Dict[str, TelecomNode] = {}
        for t in config.telecom_nodes:
            self.telecom_nodes[t["node_id"]] = TelecomNode(**t)

        self.cascade_log: List[CascadeEvent] = []

    def _get_power_for_node(self, node_id: str) -> bool:
        """Check if a node has power available from its upstream substation."""
        for power_id, dependents in self.config.power_dependencies.items():
            if node_id in dependents:
                power_node = self.power_nodes.get(power_id)
                if power_node and power_node.status == SubsystemStatus.FAILED:
                    return False
                if power_node and power_node.frequency_hz < 48.0:
                    return False
        return True

    def _get_rainfall(self, hour: float) -> float:
        """Get rainfall at a given hour."""
        if self.config.rainfall_profile:
            idx = int(hour) % len(self.config.rainfall_profile)
            return self.config.rainfall_profile[idx]
        # Default: synthetic storm peaking at hour ~36
        return max(0, 20.0 * np.exp(-0.5 * ((hour - 36) / 6) ** 2))

    def inject_fault(self, node_id: str, fault_type: str) -> None:
        """Inject a fault into a specific node."""
        if node_id in self.power_nodes:
            self.power_nodes[node_id].inject_fault(fault_type)
        elif node_id in self.water_nodes:
            self.water_nodes[node_id].inject_fault(fault_type)
        elif node_id in self.telecom_nodes:
            self.telecom_nodes[node_id].inject_fault(fault_type)

    def step(self, current_time_s: float) -> Dict[str, float]:
        """Advance all subsystems by one timestep. Returns combined telemetry."""
        dt = self.config.dt_seconds
        hour = current_time_s / 3600.0
        rainfall = self._get_rainfall(hour)

        telemetry = {}

        # Power demand varies diurnally
        base_demand = 30.0 + 15.0 * np.sin(2 * np.pi * hour / 24 - np.pi / 2)

        # Step power nodes
        for pid, pnode in self.power_nodes.items():
            t = pnode.step(dt, base_demand + self.rng.normal(0, 2))
            telemetry.update(t)

        # Step water nodes with power dependency
        for wid, wnode in self.water_nodes.items():
            power_ok = self._get_power_for_node(wid)
            old_status = wnode.status

            t = wnode.step(dt, power_ok, rainfall)
            telemetry.update(t)

            # Log cascade if power loss caused water failure
            if not power_ok and old_status == SubsystemStatus.OPERATIONAL and wnode.status != SubsystemStatus.OPERATIONAL:
                # Find which power node caused this
                for power_id, deps in self.config.power_dependencies.items():
                    if wid in deps and self.power_nodes[power_id].status == SubsystemStatus.FAILED:
                        self.cascade_log.append(CascadeEvent(
                            current_time_s, power_id, wid,
                            "power_loss_causes_pump_failure",
                            self.power_nodes[power_id].status.value,
                            wnode.status.value,
                        ))

        # Step telecom nodes with power dependency
        for tid, tnode in self.telecom_nodes.items():
            power_ok = self._get_power_for_node(tid)
            old_status = tnode.status

            t = tnode.step(dt, power_ok)
            telemetry.update(t)

            if not power_ok and old_status == SubsystemStatus.OPERATIONAL and tnode.status != SubsystemStatus.OPERATIONAL:
                for power_id, deps in self.config.power_dependencies.items():
                    if tid in deps and self.power_nodes[power_id].status == SubsystemStatus.FAILED:
                        self.cascade_log.append(CascadeEvent(
                            current_time_s, power_id, tid,
                            "power_loss_degrades_telecom",
                            self.power_nodes[power_id].status.value,
                            tnode.status.value,
                        ))

        # Water cascade: pump failure → reservoir level rise
        for pump_id, reservoir_ids in self.config.water_dependencies.items():
            pump = self.water_nodes.get(pump_id)
            if pump and pump.status == SubsystemStatus.FAILED:
                for rid in reservoir_ids:
                    reservoir = self.water_nodes.get(rid)
                    if reservoir and reservoir.status == SubsystemStatus.OPERATIONAL:
                        # Reservoir loses outflow capacity
                        reservoir.status = SubsystemStatus.DEGRADED
                        self.cascade_log.append(CascadeEvent(
                            current_time_s, pump_id, rid,
                            "pump_failure_reduces_outflow",
                            pump.status.value, reservoir.status.value,
                        ))

        return telemetry

    def run(
        self,
        duration_hours: float = 48.0,
        fault_schedule: Optional[List[FaultEvent]] = None,
    ) -> Tuple[pd.DataFrame, Dict]:
        """
        Run the full simulation.

        Args:
            duration_hours: simulation duration
            fault_schedule: list of scheduled fault injections

        Returns:
            (telemetry DataFrame, metadata dict with ground truth)
        """
        dt = self.config.dt_seconds
        n_steps = int(duration_hours * 3600 / dt)
        start_time = datetime(2015, 12, 5, 0, 0, 0)

        timestamps = []
        rows = []

        fault_schedule = fault_schedule or []
        fault_times = {f.time_hours: f for f in fault_schedule}

        for step_i in range(n_steps):
            current_time_s = step_i * dt
            current_hour = current_time_s / 3600.0

            # Check for scheduled faults
            # Use 0.5 * dt/3600 tolerance to catch faults at the right step
            for fh, fault in list(fault_times.items()):
                if abs(current_hour - fh) < 0.5 * dt / 3600.0:
                    self.inject_fault(fault.node_id, fault.fault_type)
                    del fault_times[fh]

            telemetry = self.step(current_time_s)
            timestamps.append(start_time + timedelta(seconds=current_time_s))
            rows.append(telemetry)

        df = pd.DataFrame(rows, index=pd.DatetimeIndex(timestamps, name="timestamp"))

        # Build ground truth
        ground_truth = self._build_ground_truth(fault_schedule)

        return df, ground_truth

    def _build_ground_truth(self, fault_schedule: List[FaultEvent]) -> Dict:
        """Build ground-truth metadata from the simulation."""
        # Ground truth edges (physical dependencies)
        edges = []
        for power_id, deps in self.config.power_dependencies.items():
            for dep_id in deps:
                sector = "water" if dep_id in self.water_nodes else "telecom"
                edges.append({
                    "source": power_id,
                    "target": dep_id,
                    "type": "power_dependency",
                    "is_cross_sector": True,
                    "lag_seconds": 30 if sector == "telecom" else 45,
                })
        for pump_id, res_ids in self.config.water_dependencies.items():
            for rid in res_ids:
                edges.append({
                    "source": pump_id,
                    "target": rid,
                    "type": "water_flow",
                    "is_cross_sector": False,
                    "lag_seconds": 120,
                })

        # All nodes
        nodes = []
        for nid in list(self.power_nodes) + list(self.water_nodes) + list(self.telecom_nodes):
            if nid in self.power_nodes:
                sector = "power"
            elif nid in self.water_nodes:
                sector = "water"
            else:
                sector = "telecom"
            nodes.append({"id": nid, "sector": sector})

        return {
            "ground_truth_graph": {"nodes": nodes, "edges": edges},
            "cascade_events": [e.to_dict() for e in self.cascade_log],
            "fault_schedule": [
                {"time_hours": f.time_hours, "node_id": f.node_id,
                 "fault_type": f.fault_type, "description": f.description}
                for f in fault_schedule
            ],
            "config": {
                "seed": self.config.seed,
                "dt_seconds": self.config.dt_seconds,
            },
        }


def save_twin_outputs(
    df: pd.DataFrame,
    ground_truth: Dict,
    output_dir: Path,
) -> None:
    """Save digital twin outputs."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save telemetry as CSV (compatible with engine ingest)
    df.to_csv(output_dir / "telemetry.csv")

    # Save ground truth
    with open(output_dir / "ground_truth.json", "w") as f:
        json.dump(ground_truth, f, indent=2)

    # Save cascade timeline
    cascade = ground_truth.get("cascade_events", [])
    with open(output_dir / "cascade_timeline.json", "w") as f:
        json.dump({"events": cascade, "total": len(cascade)}, f, indent=2)

    print(f"Digital twin outputs saved to {output_dir}")
    print(f"  Telemetry: {len(df)} timesteps, {len(df.columns)} channels")
    print(f"  Cascade events: {len(cascade)}")
    print(f"  Ground truth edges: {len(ground_truth['ground_truth_graph']['edges'])}")


if __name__ == "__main__":
    config = NationConfig()
    model = DigitalTwinModel(config)

    # Scenario: substation trips at hour 12, causing cascade
    faults = [
        FaultEvent(12.0, "substation_north", "trip", "Substation North trips due to overload"),
    ]

    df, ground_truth = model.run(duration_hours=48, fault_schedule=faults)
    save_twin_outputs(df, ground_truth, Path("engine/out/digital_twin"))
