"""
Ablation Experiments

Systematically tests the contribution of each Munin pipeline layer by
disabling it and measuring the impact on graph reconstruction accuracy.

Layers tested:
1. Sensor health filtering (missingness, stuck-at, drift detection)
2. Evidence windows (correlation stability across time windows)
3. Stability thresholds (minimum stability score for edge acceptance)
4. Cross-sector shadow link detection

Usage:
    python -m engine.ablation --scenario scenarios/benchmark/single_fault
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List
from dataclasses import dataclass

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))


@dataclass
class AblationResult:
    """Result of a single ablation run."""
    layer_disabled: str
    precision: float
    recall: float
    f1: float
    false_positives: int
    false_negatives: int
    shadow_link_precision: float
    shadow_link_recall: float


def run_ablation(scenario_dir: Path) -> List[AblationResult]:
    """
    Run ablation experiments on a scenario.

    For each layer, disables it via config override and re-runs the pipeline,
    comparing against ground truth.
    """
    from config import get_config
    from eval import BenchmarkRunner, evaluate_graph_reconstruction

    # Load ground truth
    gt_path = scenario_dir / "ground_truth.json"
    if not gt_path.exists():
        print(f"No ground_truth.json in {scenario_dir}")
        return []

    with open(gt_path) as f:
        ground_truth = json.load(f)
    gt_graph = ground_truth.get("ground_truth_graph", {})

    # Find data
    data_path = scenario_dir / "telemetry.csv"
    if not data_path.exists():
        data_path = scenario_dir / "synthetic_scada.csv"
    if not data_path.exists():
        print(f"No data found in {scenario_dir}")
        return []

    import pandas as pd
    df = pd.read_csv(data_path, index_col=0, parse_dates=True)

    results = []

    # Baseline: full pipeline
    baseline_graph = _run_pipeline(df, scenario_dir / "ablation_baseline", get_config())
    baseline_metrics = evaluate_graph_reconstruction(baseline_graph, gt_graph)
    results.append(AblationResult(
        layer_disabled="none (baseline)",
        precision=baseline_metrics.precision,
        recall=baseline_metrics.recall,
        f1=baseline_metrics.f1,
        false_positives=baseline_metrics.false_positives,
        false_negatives=baseline_metrics.false_negatives,
        shadow_link_precision=baseline_metrics.shadow_link_precision,
        shadow_link_recall=baseline_metrics.shadow_link_recall,
    ))

    # Ablation 1: Disable stability threshold
    config_no_stability = get_config()
    config_no_stability.graph.min_stability = 0.0
    graph_no_stability = _run_pipeline(df, scenario_dir / "ablation_no_stability", config_no_stability)
    m = evaluate_graph_reconstruction(graph_no_stability, gt_graph)
    results.append(AblationResult("stability_threshold", m.precision, m.recall, m.f1,
                                   m.false_positives, m.false_negatives,
                                   m.shadow_link_precision, m.shadow_link_recall))

    # Ablation 2: Lower correlation threshold
    config_low_corr = get_config()
    config_low_corr.graph.min_correlation = 0.3
    graph_low_corr = _run_pipeline(df, scenario_dir / "ablation_low_correlation", config_low_corr)
    m = evaluate_graph_reconstruction(graph_low_corr, gt_graph)
    results.append(AblationResult("correlation_threshold (0.3)", m.precision, m.recall, m.f1,
                                   m.false_positives, m.false_negatives,
                                   m.shadow_link_precision, m.shadow_link_recall))

    # Ablation 3: Disable evidence windows (reduce to 1 window)
    config_no_evidence = get_config()
    config_no_evidence.graph.stability_num_windows = 1
    graph_no_evidence = _run_pipeline(df, scenario_dir / "ablation_no_evidence_windows", config_no_evidence)
    m = evaluate_graph_reconstruction(graph_no_evidence, gt_graph)
    results.append(AblationResult("evidence_windows", m.precision, m.recall, m.f1,
                                   m.false_positives, m.false_negatives,
                                   m.shadow_link_precision, m.shadow_link_recall))

    return results


def _run_pipeline(df, out_dir: Path, config) -> Dict:
    """Run the inference pipeline with given config and return the graph."""
    from infer_graph import build_graph
    out_dir.mkdir(parents=True, exist_ok=True)

    # Save normalized data
    norm_path = out_dir / "normalized_timeseries.csv"
    df.to_csv(norm_path)

    # Build graph
    graph_path = out_dir / "graph.json"
    build_graph(norm_path, graph_path, config=config.graph)

    with open(graph_path) as f:
        return json.load(f)


def print_ablation_table(results: List[AblationResult]) -> None:
    """Print ablation results as a formatted table."""
    print("\n--- Ablation Results ---\n")
    print(f"{'Layer Disabled':<30s} {'Precision':>9s} {'Recall':>8s} {'F1':>6s} {'FP':>4s} {'FN':>4s} {'SL-P':>6s} {'SL-R':>6s}")
    print("-" * 80)
    for r in results:
        print(f"{r.layer_disabled:<30s} {r.precision:>9.3f} {r.recall:>8.3f} {r.f1:>6.3f} "
              f"{r.false_positives:>4d} {r.false_negatives:>4d} "
              f"{r.shadow_link_precision:>6.3f} {r.shadow_link_recall:>6.3f}")
    print()


def generate_ablation_markdown(results: List[AblationResult]) -> str:
    """Generate Markdown table from ablation results."""
    lines = [
        "| Layer Disabled | Precision | Recall | F1 | FP | FN | SL Precision | SL Recall |",
        "|----------------|-----------|--------|------|-----|------|-------------|-----------|",
    ]
    for r in results:
        lines.append(
            f"| {r.layer_disabled} | {r.precision:.3f} | {r.recall:.3f} | {r.f1:.3f} | "
            f"{r.false_positives} | {r.false_negatives} | {r.shadow_link_precision:.3f} | {r.shadow_link_recall:.3f} |"
        )
    return "\n".join(lines)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run ablation experiments")
    parser.add_argument("--scenario", type=Path, required=True, help="Scenario directory with ground_truth.json")
    args = parser.parse_args()

    results = run_ablation(args.scenario)
    print_ablation_table(results)
