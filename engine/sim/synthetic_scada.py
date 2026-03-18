"""
Synthetic SCADA Data Generator

Generates realistic Modbus/DNP3-style time series for testing and evaluation.
Encodes realistic ICS patterns: normal load ranges, maintenance schedules,
alarm rates, seasonal variation, and injected faults.

Usage:
    from engine.sim.synthetic_scada import SCADAConfig, generate_synthetic_plant
    config = SCADAConfig(duration_hours=72, sample_interval_s=60)
    df, metadata = generate_synthetic_plant(config)
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta


class SensorType(Enum):
    """ICS sensor types with realistic value ranges."""
    PUMP_FLOW = "pump_flow"           # m^3/h, 0-500
    PUMP_PRESSURE = "pump_pressure"   # bar, 0-10
    RESERVOIR_LEVEL = "reservoir_level"  # metres, 0-15
    POWER_FREQUENCY = "power_frequency"  # Hz, 49.5-50.5
    POWER_VOLTAGE = "power_voltage"    # kV, 10.5-11.5
    SUBSTATION_LOAD = "substation_load"  # MW, 0-100
    TOWER_UPTIME = "tower_uptime"      # %, 95-100
    RIVER_LEVEL = "river_level"        # metres, 0-6
    TREATMENT_PH = "treatment_ph"      # pH, 6.5-8.5
    VALVE_POSITION = "valve_position"  # %, 0-100


# Realistic operating ranges per sensor type
SENSOR_RANGES: Dict[SensorType, Tuple[float, float, float]] = {
    # (nominal_center, nominal_range, noise_std)
    SensorType.PUMP_FLOW:        (250.0, 100.0, 5.0),
    SensorType.PUMP_PRESSURE:    (5.0,   2.0,   0.1),
    SensorType.RESERVOIR_LEVEL:  (8.0,   3.0,   0.05),
    SensorType.POWER_FREQUENCY:  (50.0,  0.3,   0.02),
    SensorType.POWER_VOLTAGE:    (11.0,  0.3,   0.05),
    SensorType.SUBSTATION_LOAD:  (45.0,  20.0,  1.5),
    SensorType.TOWER_UPTIME:     (99.0,  2.0,   0.1),
    SensorType.RIVER_LEVEL:      (2.5,   1.5,   0.02),
    SensorType.TREATMENT_PH:     (7.2,   0.5,   0.05),
    SensorType.VALVE_POSITION:   (50.0,  30.0,  0.5),
}


class FaultType(Enum):
    """Fault injection types for adversarial testing."""
    STUCK_AT = "stuck_at"
    DRIFT = "drift"
    SPIKE = "spike"
    DROPOUT = "dropout"
    REPLAY = "replay"


@dataclass
class FaultSpec:
    """Specification for a fault injection."""
    fault_type: FaultType
    node_id: str
    start_fraction: float  # 0.0-1.0, when in the time series the fault begins
    duration_fraction: float  # 0.0-1.0, how long the fault lasts
    magnitude: float = 1.0  # fault severity multiplier


@dataclass
class SensorSpec:
    """Specification for a single sensor node."""
    node_id: str
    sensor_type: SensorType
    sector: str  # power, water, telecom
    region: str = "north"


@dataclass
class CrossSectorLink:
    """A known cross-sector dependency for ground-truth evaluation."""
    source_id: str
    target_id: str
    lag_seconds: int
    correlation_strength: float  # 0.0-1.0


@dataclass
class SCADAConfig:
    """Configuration for synthetic SCADA data generation."""
    duration_hours: int = 72
    sample_interval_s: int = 60
    seed: int = 42

    # Default plant topology
    sensors: List[SensorSpec] = field(default_factory=lambda: [
        SensorSpec("substation_north", SensorType.SUBSTATION_LOAD, "power", "north"),
        SensorSpec("substation_south", SensorType.SUBSTATION_LOAD, "power", "south"),
        SensorSpec("power_frequency", SensorType.POWER_FREQUENCY, "power", "central"),
        SensorSpec("pump_station_7", SensorType.PUMP_FLOW, "water", "north"),
        SensorSpec("pump_station_12", SensorType.PUMP_FLOW, "water", "south"),
        SensorSpec("reservoir_west", SensorType.RESERVOIR_LEVEL, "water", "west"),
        SensorSpec("treatment_plant", SensorType.TREATMENT_PH, "water", "central"),
        SensorSpec("tower_alpha", SensorType.TOWER_UPTIME, "telecom", "north"),
        SensorSpec("tower_beta", SensorType.TOWER_UPTIME, "telecom", "south"),
        SensorSpec("river_eden_level", SensorType.RIVER_LEVEL, "water", "north"),
    ])

    # Cross-sector dependencies (ground truth for evaluation)
    cross_sector_links: List[CrossSectorLink] = field(default_factory=lambda: [
        CrossSectorLink("substation_north", "pump_station_7", lag_seconds=45, correlation_strength=0.92),
        CrossSectorLink("substation_south", "pump_station_12", lag_seconds=60, correlation_strength=0.88),
        CrossSectorLink("power_frequency", "tower_alpha", lag_seconds=30, correlation_strength=0.85),
        CrossSectorLink("pump_station_7", "reservoir_west", lag_seconds=120, correlation_strength=0.78),
    ])

    # Fault injection
    faults: List[FaultSpec] = field(default_factory=list)

    # Seasonal / diurnal patterns
    enable_diurnal: bool = True
    enable_weather: bool = True  # simulated rainfall effect on river level


def _generate_base_signal(
    rng: np.random.RandomState,
    sensor_type: SensorType,
    n_samples: int,
    sample_interval_s: int,
    enable_diurnal: bool,
) -> np.ndarray:
    """Generate a realistic base signal for a sensor type."""
    center, amplitude, noise_std = SENSOR_RANGES[sensor_type]

    # Base: constant + Gaussian noise
    signal = np.full(n_samples, center) + rng.normal(0, noise_std, n_samples)

    if enable_diurnal:
        # Add diurnal cycle (24-hour sinusoid)
        hours = np.arange(n_samples) * sample_interval_s / 3600.0
        diurnal = amplitude * 0.3 * np.sin(2 * np.pi * hours / 24.0 - np.pi / 2)
        signal += diurnal

    # Add slow random walk (process drift)
    walk = np.cumsum(rng.normal(0, noise_std * 0.1, n_samples))
    # Mean-revert the walk to prevent runaway
    walk -= walk * 0.001 * np.arange(n_samples) / n_samples
    signal += walk

    return signal


def _inject_cross_sector_correlation(
    signals: Dict[str, np.ndarray],
    link: CrossSectorLink,
    sample_interval_s: int,
    rng: np.random.RandomState,
) -> None:
    """Inject correlation between two signals to simulate physical dependency."""
    if link.source_id not in signals or link.target_id not in signals:
        return

    source = signals[link.source_id]
    target = signals[link.target_id]

    lag_samples = max(1, link.lag_seconds // sample_interval_s)

    # Extract variations from source signal
    source_variation = source - np.mean(source)

    # Create lagged, scaled copy of source variation
    correlated_component = np.zeros_like(target)
    if lag_samples < len(source_variation):
        correlated_component[lag_samples:] = source_variation[:-lag_samples]

    # Scale by correlation strength and target signal scale
    target_std = np.std(target)
    source_std = np.std(source_variation)
    if source_std > 0:
        scale = link.correlation_strength * target_std / source_std
        signals[link.target_id] = target + scale * correlated_component


def _inject_fault(
    signal: np.ndarray,
    fault: FaultSpec,
    rng: np.random.RandomState,
) -> Tuple[np.ndarray, Dict]:
    """Inject a fault into a signal. Returns (modified_signal, fault_metadata)."""
    n = len(signal)
    start = int(fault.start_fraction * n)
    duration = max(1, int(fault.duration_fraction * n))
    end = min(start + duration, n)

    modified = signal.copy()
    metadata = {
        "fault_type": fault.fault_type.value,
        "start_idx": start,
        "end_idx": end,
        "magnitude": fault.magnitude,
    }

    if fault.fault_type == FaultType.STUCK_AT:
        stuck_value = signal[start]
        modified[start:end] = stuck_value
    elif fault.fault_type == FaultType.DRIFT:
        drift_ramp = np.linspace(0, fault.magnitude * np.std(signal) * 5, end - start)
        modified[start:end] += drift_ramp
    elif fault.fault_type == FaultType.SPIKE:
        spike_idx = start + (end - start) // 2
        modified[spike_idx] += fault.magnitude * np.std(signal) * 10
    elif fault.fault_type == FaultType.DROPOUT:
        modified[start:end] = np.nan
    elif fault.fault_type == FaultType.REPLAY:
        # Replay an earlier segment
        replay_len = end - start
        replay_start = max(0, start - replay_len)
        replay_segment = signal[replay_start:replay_start + replay_len]
        actual_len = min(len(replay_segment), end - start)
        modified[start:start + actual_len] = replay_segment[:actual_len]

    return modified, metadata


def _inject_weather_event(
    signals: Dict[str, np.ndarray],
    sensor_specs: Dict[str, SensorSpec],
    rng: np.random.RandomState,
    n_samples: int,
    sample_interval_s: int,
) -> None:
    """Inject a simulated rainfall event affecting river levels and pump flows."""
    # Place rainfall event at ~60% through the time series
    event_center = int(0.6 * n_samples)
    event_width = int(6 * 3600 / sample_interval_s)  # 6-hour storm

    rainfall = np.zeros(n_samples)
    storm_x = np.arange(n_samples) - event_center
    rainfall = 15.0 * np.exp(-0.5 * (storm_x / (event_width / 4)) ** 2)
    rainfall = np.maximum(rainfall, 0)

    for node_id, spec in sensor_specs.items():
        if spec.sensor_type == SensorType.RIVER_LEVEL:
            # River responds to rainfall with ~2 hour lag
            lag = int(2 * 3600 / sample_interval_s)
            response = np.zeros(n_samples)
            if lag < n_samples:
                response[lag:] = rainfall[:-lag] * 0.15
            signals[node_id] += response
        elif spec.sensor_type == SensorType.PUMP_FLOW:
            # Pumps increase flow in response to rising water
            lag = int(3 * 3600 / sample_interval_s)
            response = np.zeros(n_samples)
            if lag < n_samples:
                response[lag:] = rainfall[:-lag] * 8.0
            signals[node_id] += response


def generate_synthetic_plant(
    config: SCADAConfig,
) -> Tuple[pd.DataFrame, Dict]:
    """
    Generate a complete synthetic SCADA dataset for a multi-sector plant.

    Returns:
        (DataFrame with datetime index and node_id columns, metadata dict)
    """
    rng = np.random.RandomState(config.seed)
    n_samples = config.duration_hours * 3600 // config.sample_interval_s

    # Generate timestamps
    start_time = datetime(2015, 12, 5, 0, 0, 0)  # Storm Desmond timeframe
    timestamps = pd.date_range(
        start=start_time,
        periods=n_samples,
        freq=f"{config.sample_interval_s}s",
    )

    # Build sensor spec lookup
    sensor_specs = {s.node_id: s for s in config.sensors}

    # Generate base signals
    signals: Dict[str, np.ndarray] = {}
    for spec in config.sensors:
        signals[spec.node_id] = _generate_base_signal(
            rng, spec.sensor_type, n_samples,
            config.sample_interval_s, config.enable_diurnal,
        )

    # Inject cross-sector correlations (ground truth dependencies)
    for link in config.cross_sector_links:
        _inject_cross_sector_correlation(signals, link, config.sample_interval_s, rng)

    # Inject weather event if enabled
    if config.enable_weather:
        _inject_weather_event(signals, sensor_specs, rng, n_samples, config.sample_interval_s)

    # Inject faults
    fault_metadata = []
    for fault in config.faults:
        if fault.node_id in signals:
            signals[fault.node_id], meta = _inject_fault(signals[fault.node_id], fault, rng)
            fault_metadata.append(meta)

    # Build DataFrame
    df = pd.DataFrame(signals, index=timestamps)
    df.index.name = "timestamp"

    # Build ground truth graph
    ground_truth_edges = []
    for link in config.cross_sector_links:
        ground_truth_edges.append({
            "source": link.source_id,
            "target": link.target_id,
            "lag_seconds": link.lag_seconds,
            "correlation_strength": link.correlation_strength,
            "is_shadow_link": sensor_specs[link.source_id].sector != sensor_specs[link.target_id].sector
            if link.source_id in sensor_specs and link.target_id in sensor_specs else False,
        })

    ground_truth_nodes = []
    for spec in config.sensors:
        ground_truth_nodes.append({
            "id": spec.node_id,
            "sector": spec.sector,
            "sensor_type": spec.sensor_type.value,
            "region": spec.region,
        })

    metadata = {
        "config": {
            "duration_hours": config.duration_hours,
            "sample_interval_s": config.sample_interval_s,
            "seed": config.seed,
            "n_samples": n_samples,
            "n_sensors": len(config.sensors),
        },
        "ground_truth_graph": {
            "nodes": ground_truth_nodes,
            "edges": ground_truth_edges,
        },
        "faults_injected": fault_metadata,
        "generated_at": datetime.now().isoformat(),
    }

    return df, metadata


def save_synthetic_plant(
    df: pd.DataFrame,
    metadata: Dict,
    output_dir: Path,
) -> None:
    """Save synthetic plant data to CSV and metadata to JSON."""
    import json
    output_dir.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_dir / "synthetic_scada.csv")
    with open(output_dir / "ground_truth.json", "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Synthetic plant saved: {len(df)} samples, {len(df.columns)} sensors -> {output_dir}")


if __name__ == "__main__":
    config = SCADAConfig(
        duration_hours=72,
        faults=[
            FaultSpec(FaultType.STUCK_AT, "pump_station_7", 0.4, 0.05),
            FaultSpec(FaultType.DRIFT, "substation_north", 0.6, 0.2, magnitude=2.0),
        ],
    )
    df, meta = generate_synthetic_plant(config)
    save_synthetic_plant(df, meta, Path("engine/out/synthetic"))
