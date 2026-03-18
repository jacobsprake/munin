"""
Physical subsystem models for the digital twin.

Each subsystem is a discrete-time state machine with:
- state variables (e.g. reservoir level, power frequency)
- update equations driven by physics
- coupling interfaces (inputs from other subsystems)
- fault injection support

All models are intentionally simplified but physically plausible.
"""
from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional


class SubsystemStatus(Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    FAILED = "failed"


@dataclass
class PowerNode:
    """Model of a power substation / generator node."""
    node_id: str
    region: str
    capacity_mw: float = 50.0
    load_mw: float = 30.0
    frequency_hz: float = 50.0
    voltage_kv: float = 11.0
    status: SubsystemStatus = SubsystemStatus.OPERATIONAL

    # Physics parameters
    inertia_constant: float = 5.0  # seconds (typical for thermal plant)
    droop: float = 0.04  # governor droop coefficient

    def step(self, dt: float, demand_mw: float) -> Dict[str, float]:
        """Advance one timestep. Returns telemetry dict."""
        if self.status == SubsystemStatus.FAILED:
            self.frequency_hz = 0.0
            self.voltage_kv = 0.0
            self.load_mw = 0.0
            return self._telemetry()

        # Frequency response to load-generation imbalance
        imbalance = self.capacity_mw - demand_mw
        # df/dt = (imbalance / capacity) * (1 / 2H) * f_nominal
        df = (imbalance / max(self.capacity_mw, 1)) * (dt / (2 * self.inertia_constant)) * 50.0
        self.frequency_hz = np.clip(self.frequency_hz + df, 47.0, 52.0)

        # Voltage sag under overload
        load_ratio = demand_mw / max(self.capacity_mw, 1)
        self.voltage_kv = 11.0 * (1.0 - 0.1 * max(0, load_ratio - 0.8))
        self.voltage_kv = max(self.voltage_kv, 0.0)

        self.load_mw = min(demand_mw, self.capacity_mw)

        # Degrade if frequency out of band
        if self.frequency_hz < 49.0 or self.frequency_hz > 51.0:
            self.status = SubsystemStatus.DEGRADED
        elif self.status == SubsystemStatus.DEGRADED and 49.5 < self.frequency_hz < 50.5:
            self.status = SubsystemStatus.OPERATIONAL

        return self._telemetry()

    def inject_fault(self, fault_type: str) -> None:
        """Inject a fault into this power node."""
        if fault_type == "trip":
            self.status = SubsystemStatus.FAILED
        elif fault_type == "overload":
            self.load_mw = self.capacity_mw * 1.2
        elif fault_type == "degrade":
            self.capacity_mw *= 0.5
            self.status = SubsystemStatus.DEGRADED

    def _telemetry(self) -> Dict[str, float]:
        return {
            f"{self.node_id}_load": self.load_mw,
            f"{self.node_id}_freq": self.frequency_hz,
            f"{self.node_id}_voltage": self.voltage_kv,
        }


@dataclass
class WaterNode:
    """Model of a water infrastructure node (pump, reservoir, or treatment plant)."""
    node_id: str
    region: str
    node_type: str = "pump"  # pump, reservoir, treatment

    # Pump state
    flow_rate_m3h: float = 250.0
    pressure_bar: float = 5.0
    power_draw_kw: float = 100.0

    # Reservoir state
    level_m: float = 8.0
    max_level_m: float = 15.0
    min_level_m: float = 1.0
    inflow_m3h: float = 50.0

    # Treatment
    ph: float = 7.2

    status: SubsystemStatus = SubsystemStatus.OPERATIONAL

    # Dependencies
    power_available: bool = True

    def step(self, dt: float, power_available: bool, rainfall_mm_h: float = 0.0) -> Dict[str, float]:
        """Advance one timestep."""
        self.power_available = power_available
        dt_hours = dt / 3600.0

        if self.node_type == "pump":
            return self._step_pump(dt_hours)
        elif self.node_type == "reservoir":
            return self._step_reservoir(dt_hours, rainfall_mm_h)
        elif self.node_type == "treatment":
            return self._step_treatment(dt_hours)
        return {}

    def _step_pump(self, dt_hours: float) -> Dict[str, float]:
        if not self.power_available or self.status == SubsystemStatus.FAILED:
            self.flow_rate_m3h = 0.0
            self.pressure_bar = 0.0
            self.status = SubsystemStatus.FAILED if not self.power_available else self.status
            return self._telemetry()

        # Normal pump operation with slight variation
        self.flow_rate_m3h = max(0, self.flow_rate_m3h + np.random.normal(0, 2))
        self.pressure_bar = 5.0 * (self.flow_rate_m3h / 250.0)

        if self.status == SubsystemStatus.DEGRADED:
            self.flow_rate_m3h *= 0.5

        return self._telemetry()

    def _step_reservoir(self, dt_hours: float, rainfall_mm_h: float) -> Dict[str, float]:
        # Inflow = base + rainfall contribution
        effective_inflow = self.inflow_m3h + rainfall_mm_h * 10.0  # simplified catchment

        # Outflow depends on pump status (simplified: constant if operational)
        outflow = 200.0 if self.status == SubsystemStatus.OPERATIONAL else 50.0

        # Level change
        net_flow = (effective_inflow - outflow) * dt_hours
        # Convert m^3 to level change (assume 10000 m^2 surface area)
        self.level_m += net_flow / 10000.0
        self.level_m = np.clip(self.level_m, 0.0, self.max_level_m)

        if self.level_m > self.max_level_m * 0.9:
            self.status = SubsystemStatus.DEGRADED

        return self._telemetry()

    def _step_treatment(self, dt_hours: float) -> Dict[str, float]:
        if not self.power_available:
            # pH drifts without active treatment
            self.ph += np.random.normal(0.01, 0.02)
            self.status = SubsystemStatus.DEGRADED
        else:
            # Normal operation: pH maintained
            self.ph += np.random.normal(0, 0.01)
            self.ph = np.clip(self.ph, 6.0, 9.0)
            if 6.8 < self.ph < 7.6:
                self.status = SubsystemStatus.OPERATIONAL

        return self._telemetry()

    def inject_fault(self, fault_type: str) -> None:
        if fault_type == "pump_failure":
            self.status = SubsystemStatus.FAILED
            self.flow_rate_m3h = 0
        elif fault_type == "pipe_burst":
            self.pressure_bar *= 0.3
            self.status = SubsystemStatus.DEGRADED
        elif fault_type == "contamination":
            self.ph = 5.0
            self.status = SubsystemStatus.DEGRADED

    def _telemetry(self) -> Dict[str, float]:
        if self.node_type == "pump":
            return {
                f"{self.node_id}_flow": self.flow_rate_m3h,
                f"{self.node_id}_pressure": self.pressure_bar,
            }
        elif self.node_type == "reservoir":
            return {f"{self.node_id}_level": self.level_m}
        elif self.node_type == "treatment":
            return {f"{self.node_id}_ph": self.ph}
        return {}


@dataclass
class TelecomNode:
    """Model of a telecom tower / communications node."""
    node_id: str
    region: str
    uptime_pct: float = 99.5
    latency_ms: float = 15.0
    status: SubsystemStatus = SubsystemStatus.OPERATIONAL
    battery_hours: float = 4.0  # backup battery duration
    _time_without_power: float = 0.0

    def step(self, dt: float, power_available: bool) -> Dict[str, float]:
        """Advance one timestep."""
        dt_hours = dt / 3600.0

        if not power_available:
            self._time_without_power += dt_hours
            if self._time_without_power > self.battery_hours:
                self.status = SubsystemStatus.FAILED
                self.uptime_pct = 0.0
                self.latency_ms = float("inf")
            else:
                self.status = SubsystemStatus.DEGRADED
                # Battery drain increases latency
                drain_ratio = self._time_without_power / self.battery_hours
                self.latency_ms = 15.0 + 200.0 * drain_ratio
                self.uptime_pct = 99.5 * (1.0 - drain_ratio * 0.3)
        else:
            self._time_without_power = 0.0
            self.uptime_pct = min(100.0, self.uptime_pct + 0.1)
            self.latency_ms = max(10.0, self.latency_ms - 1.0)
            if self.uptime_pct > 98.0:
                self.status = SubsystemStatus.OPERATIONAL

        return self._telemetry()

    def inject_fault(self, fault_type: str) -> None:
        if fault_type == "equipment_failure":
            self.status = SubsystemStatus.FAILED
            self.uptime_pct = 0
        elif fault_type == "congestion":
            self.latency_ms = 500.0
            self.status = SubsystemStatus.DEGRADED

    def _telemetry(self) -> Dict[str, float]:
        return {
            f"{self.node_id}_uptime": self.uptime_pct,
            f"{self.node_id}_latency": self.latency_ms,
        }
