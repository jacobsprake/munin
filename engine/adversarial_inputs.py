"""Adversarial input injection for red-team testing of Munin.

Provides a library of attack dataclasses that modify sensor time-series
data in ways that mimic real-world adversarial manipulation of SCADA
systems.  Each attack implements an ``inject()`` method that returns the
modified DataFrame and metadata describing the injection.

The ``run_adversarial_test`` entry point loads data, applies one or more
attacks, re-runs graph inference and sensor health checks, and reports
whether the injection was detected.

Attack taxonomy:
    SpoofedSensor          -- replace values with plausible but false readings
    StuckAt                -- hold a sensor at a constant value for a duration
    TimestampManipulation  -- shift timestamps to create false lag correlations
    ReplayAttack           -- replay an earlier segment of data
    CorrelationInjection   -- inject artificial correlation between two
                              unrelated sensors
"""
from __future__ import annotations

import json
import sys
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------

ENGINE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ENGINE_DIR))


# ---------------------------------------------------------------------------
# Attack type enum
# ---------------------------------------------------------------------------

class AttackType(Enum):
    """Supported adversarial attack types."""
    SPOOFED_SENSOR = "spoofed_sensor"
    STUCK_AT = "stuck_at"
    TIMESTAMP_MANIPULATION = "timestamp_manipulation"
    REPLAY = "replay"
    CORRELATION_INJECTION = "correlation_injection"


# ---------------------------------------------------------------------------
# Attack dataclasses
# ---------------------------------------------------------------------------

@dataclass
class SpoofedSensor:
    """Replace sensor readings with plausible but false values.

    The injected values are drawn from a normal distribution centred on
    the sensor's historical mean but shifted by ``bias_factor`` standard
    deviations.  This mimics an attacker who understands the expected
    operating range and injects values that look *almost* right.
    """
    bias_factor: float = 1.5
    noise_scale: float = 0.1
    seed: int = 42

    def inject(
        self,
        df: pd.DataFrame,
        node_id: str,
        *,
        start_idx: Optional[int] = None,
        end_idx: Optional[int] = None,
    ) -> Tuple[pd.DataFrame, Dict]:
        """Inject spoofed readings into *node_id* column.

        Args:
            df:        Input DataFrame (not mutated).
            node_id:   Column to attack.
            start_idx: First row index of injection window (default: 0).
            end_idx:   Last row index of injection window (default: len).

        Returns:
            (modified_df, metadata) where metadata records injection params.
        """
        rng = np.random.RandomState(self.seed)
        modified = df.copy()

        series = modified[node_id]
        mean = series.mean()
        std = series.std()

        start = start_idx if start_idx is not None else 0
        end = end_idx if end_idx is not None else len(series)

        spoofed = mean + self.bias_factor * std + rng.normal(
            0, self.noise_scale * std, size=(end - start,)
        )
        modified.iloc[start:end, modified.columns.get_loc(node_id)] = spoofed

        metadata = {
            "attack": AttackType.SPOOFED_SENSOR.value,
            "node_id": node_id,
            "bias_factor": self.bias_factor,
            "noise_scale": self.noise_scale,
            "window": [start, end],
            "original_mean": float(mean),
            "spoofed_mean": float(np.mean(spoofed)),
        }
        return modified, metadata


@dataclass
class StuckAt:
    """Hold a sensor at a constant value for a specified duration.

    Simulates a sensor that has frozen (e.g. due to firmware bug, comms
    failure, or deliberate manipulation).
    """
    stuck_value: Optional[float] = None
    duration_rows: int = 50
    seed: int = 42

    def inject(
        self,
        df: pd.DataFrame,
        node_id: str,
        *,
        start_idx: Optional[int] = None,
    ) -> Tuple[pd.DataFrame, Dict]:
        """Inject stuck-at condition.

        If ``stuck_value`` is None the sensor's mean is used.
        """
        modified = df.copy()
        series = modified[node_id]

        start = start_idx if start_idx is not None else len(series) // 4
        end = min(start + self.duration_rows, len(series))

        value = self.stuck_value if self.stuck_value is not None else float(series.mean())
        modified.iloc[start:end, modified.columns.get_loc(node_id)] = value

        metadata = {
            "attack": AttackType.STUCK_AT.value,
            "node_id": node_id,
            "stuck_value": value,
            "window": [start, end],
            "duration_rows": end - start,
        }
        return modified, metadata


@dataclass
class TimestampManipulation:
    """Shift timestamps to create false lag correlations.

    Offsets the DatetimeIndex of the entire DataFrame by ``offset_seconds``
    before the injection window, creating the illusion that one sensor
    leads or lags another.
    """
    offset_seconds: int = 120
    seed: int = 42

    def inject(
        self,
        df: pd.DataFrame,
        node_id: str,  # node_id unused but kept for uniform API
    ) -> Tuple[pd.DataFrame, Dict]:
        """Shift timestamps by ``offset_seconds``."""
        modified = df.copy()
        modified.index = modified.index + pd.Timedelta(seconds=self.offset_seconds)

        metadata = {
            "attack": AttackType.TIMESTAMP_MANIPULATION.value,
            "node_id": node_id,
            "offset_seconds": self.offset_seconds,
        }
        return modified, metadata


@dataclass
class ReplayAttack:
    """Replay an earlier segment of data over a later window.

    Copies rows ``[replay_source_start, replay_source_end)`` and
    overwrites ``[replay_target_start, ...)`` with them, simulating an
    attacker who records legitimate traffic and replays it later to mask
    anomalous behaviour.
    """
    replay_source_start: int = 0
    replay_length: int = 50
    replay_target_start: Optional[int] = None
    seed: int = 42

    def inject(
        self,
        df: pd.DataFrame,
        node_id: str,
    ) -> Tuple[pd.DataFrame, Dict]:
        """Inject replay of earlier data."""
        modified = df.copy()
        series = modified[node_id]

        src_start = self.replay_source_start
        src_end = min(src_start + self.replay_length, len(series))
        segment = series.iloc[src_start:src_end].values.copy()

        tgt_start = (
            self.replay_target_start
            if self.replay_target_start is not None
            else len(series) - len(segment)
        )
        tgt_end = min(tgt_start + len(segment), len(series))
        actual_len = tgt_end - tgt_start

        modified.iloc[tgt_start:tgt_end, modified.columns.get_loc(node_id)] = segment[:actual_len]

        metadata = {
            "attack": AttackType.REPLAY.value,
            "node_id": node_id,
            "source_window": [src_start, src_end],
            "target_window": [tgt_start, tgt_end],
        }
        return modified, metadata


@dataclass
class CorrelationInjection:
    """Inject artificial correlation between two unrelated sensors.

    Replaces the target sensor's data with a linear combination of the
    source sensor and Gaussian noise, creating a false dependency edge
    in the inferred graph.
    """
    correlation_strength: float = 0.9
    seed: int = 42

    def inject(
        self,
        df: pd.DataFrame,
        node_id: str,
        *,
        target_node_id: Optional[str] = None,
    ) -> Tuple[pd.DataFrame, Dict]:
        """Inject correlation between *node_id* (source) and *target_node_id*.

        If ``target_node_id`` is None the last column that is not
        *node_id* is chosen.
        """
        rng = np.random.RandomState(self.seed)
        modified = df.copy()

        if target_node_id is None:
            other_cols = [c for c in df.columns if c != node_id]
            if not other_cols:
                raise ValueError("DataFrame must have at least two columns")
            target_node_id = other_cols[-1]

        source = modified[node_id].values.astype(float)
        noise = rng.normal(0, 1, size=len(source))

        alpha = self.correlation_strength
        injected = alpha * source + (1 - alpha) * noise * np.std(source)
        modified[target_node_id] = injected

        metadata = {
            "attack": AttackType.CORRELATION_INJECTION.value,
            "source_node": node_id,
            "target_node": target_node_id,
            "correlation_strength": self.correlation_strength,
        }
        return modified, metadata


# ---------------------------------------------------------------------------
# Attack registry
# ---------------------------------------------------------------------------

ATTACK_CLASSES: Dict[str, type] = {
    AttackType.SPOOFED_SENSOR.value: SpoofedSensor,
    AttackType.STUCK_AT.value: StuckAt,
    AttackType.TIMESTAMP_MANIPULATION.value: TimestampManipulation,
    AttackType.REPLAY.value: ReplayAttack,
    AttackType.CORRELATION_INJECTION.value: CorrelationInjection,
}


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

def run_adversarial_test(
    data_dir: Path,
    attack_type: str = "all",
    *,
    seed: int = 42,
) -> int:
    """Load data, inject attacks, run inference, and report detection.

    Args:
        data_dir:    Directory containing CSV historian data.
        attack_type: One of the ``AttackType`` values or ``"all"``.
        seed:        RNG seed.

    Returns:
        Exit code (0 = all attacks detected, 1 = at least one undetected).
    """
    from ingest import ingest_historian_data, normalize_timeseries
    from infer_graph import build_graph
    from sensor_health import assess_sensor_health

    # Ingest baseline data
    df_raw = ingest_historian_data(data_dir)
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        normalize_timeseries(df_raw, tmp / "baseline.csv")
        df_baseline = pd.read_csv(tmp / "baseline.csv", index_col=0, parse_dates=True)

        # Determine which attacks to run
        if attack_type == "all":
            attacks_to_run = list(ATTACK_CLASSES.keys())
        else:
            if attack_type not in ATTACK_CLASSES:
                print(f"Unknown attack type: {attack_type}")
                print(f"Available: {', '.join(ATTACK_CLASSES.keys())} | all")
                return 1
            attacks_to_run = [attack_type]

        node_ids = list(df_baseline.columns)
        if not node_ids:
            print("No sensor columns found in data")
            return 1

        target_node = node_ids[0]
        results: List[Dict] = []
        all_detected = True

        print("\n--- Adversarial Red-Team Test Results ---\n")

        for atk_name in attacks_to_run:
            atk_cls = ATTACK_CLASSES[atk_name]
            attacker = atk_cls(seed=seed) if "seed" in atk_cls.__dataclass_fields__ else atk_cls()

            # Inject
            if atk_name == AttackType.CORRELATION_INJECTION.value and len(node_ids) >= 2:
                df_attacked, meta = attacker.inject(
                    df_baseline, target_node, target_node_id=node_ids[1]
                )
            else:
                df_attacked, meta = attacker.inject(df_baseline, target_node)

            # Write attacked data and run pipeline
            attacked_csv = tmp / f"attacked_{atk_name}.csv"
            df_attacked.to_csv(attacked_csv)

            graph_path = tmp / f"graph_{atk_name}.json"
            try:
                build_graph(attacked_csv, graph_path)
            except Exception as exc:
                print(f"  [{atk_name}] Graph inference failed: {exc}")
                results.append({"attack": atk_name, "detected": False, "error": str(exc)})
                all_detected = False
                continue

            # Run sensor health on attacked data
            health = assess_sensor_health(df_attacked)

            # Check whether sensor_health flagged the attacked node
            node_health = health.get(target_node, {})
            issues = node_health.get("issues", [])
            detected = len(issues) > 0

            status = "DETECTED" if detected else "UNDETECTED"
            print(f"  [{status}] {atk_name}: issues={issues}  meta={meta}")

            results.append({
                "attack": atk_name,
                "detected": detected,
                "issues": issues,
                "metadata": meta,
            })

            if not detected:
                all_detected = False

        # Summary
        detected_count = sum(1 for r in results if r.get("detected"))
        total = len(results)
        print(f"\n  Summary: {detected_count}/{total} attacks detected")
        print(f"  Overall: {'PASS' if all_detected else 'FAIL'}\n")

        return 0 if all_detected else 1
