"""Main pipeline runner: ingest -> infer -> health -> incidents -> packets."""
import json
import random
import shutil
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from multiprocessing import cpu_count

import numpy as np

# Add engine directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from ingest import ingest_historian_data, normalize_timeseries
from infer_graph import build_graph
from sensor_health import assess_sensor_health, build_evidence_windows
from build_incidents import build_incidents
from packetize import packetize_incidents
from config import get_config, EngineConfig, ENGINE_CONFIG_VERSION
from structured_logging import get_logger
from safety_guard import assert_read_only

# region agent log
def _agent_log(run_id: str, hypothesis_id: str, location: str, message: str, data: dict):
    """Lightweight debug logger writing NDJSON to .cursor/debug.log."""
    try:
        import json
        import time

        root = Path(__file__).parent.parent
        log_path = root / ".cursor" / "debug.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)

        entry = {
            "id": f"log_{int(time.time() * 1000)}",
            "timestamp": int(time.time() * 1000),
            "runId": run_id,
            "hypothesisId": hypothesis_id,
            "location": location,
            "message": message,
            "data": data,
        }
        with log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        # Never let logging break the pipeline
        pass
# endregion agent log


def main(
    data_dir: Path = None,
    out_dir: Path = None,
    playbooks_dir: Path = None,
    config_path: Path = None,
    seed: int = 42,
    all_scenarios: bool = True,
    max_scenarios: int = None,
    n_jobs: int = 1,
):
    """Run the complete pipeline with deterministic execution.
    
    By default exhaustively enumerates the scenario space (single-origin, multi-fault, correlated)
    and builds pre-approved playbooks for each. Use all_scenarios=False (--quick) for a small fixed set.
    
    Args:
        data_dir: Directory containing sample CSV files (default: engine/sample_data)
        out_dir: Output directory (default: engine/out)
        playbooks_dir: Directory containing playbook YAML files (default: playbooks/)
        config_path: Path to engine config JSON (default: use defaults)
        seed: Random seed for deterministic execution (default: 42)
        all_scenarios: If True, enumerate and simulate all conceivable + chaos scenarios; if False, run quick 3-incident set.
        max_scenarios: If set, cap at N scenarios (sample when over). Enables targeting e.g. 10,000.
        n_jobs: Parallel workers for cascade simulation (1=sequential). Use 0 for auto (cpu_count-1).
    """
    # Safety guard: Munin v1 is read-only
    assert_read_only()

    # Load configuration and initialize RNG streams
    config = get_config(config_path)
    
    # Override base seed if provided
    if seed != 42:
        config.rng.base_seed = seed
    
    # Initialize all RNG streams with documented seed derivation
    config.rng.initialize_rng_streams()
    
    # Set seeds for deterministic execution (backward compatibility)
    random.seed(config.rng.base_seed)
    np.random.seed(config.rng.base_seed)
    
    print("=" * 60)
    print("SOVEREIGN ORCHESTRATION PROTOTYPE - ENGINE PIPELINE")
    print(f"Engine Config Version: {ENGINE_CONFIG_VERSION}")
    print(f"Random Seed: {config.rng.base_seed}")
    print("=" * 60)
    
    script_dir = Path(__file__).parent
    if data_dir is None:
        data_dir = script_dir / "sample_data"
    if out_dir is None:
        out_dir = script_dir / "out"
    if playbooks_dir is None:
        playbooks_dir = script_dir.parent / "playbooks"
    
    # Create run-specific output directory with timestamp and seed
    run_id = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}_seed{config.rng.base_seed}"
    run_out_dir = out_dir / run_id
    run_out_dir.mkdir(parents=True, exist_ok=True)
    
    # Snapshot config version into run directory
    config_version_path = run_out_dir / "config_version.json"
    config_metadata = {
        'engine_config_version': ENGINE_CONFIG_VERSION,
        'seed': config.rng.base_seed,
        'rng_config': config.rng.to_dict() if hasattr(config.rng, 'to_dict') else asdict(config.rng),
        'config': config.to_dict(),
        'run_id': run_id,
        'timestamp': datetime.now().isoformat()
    }
    with open(config_version_path, 'w') as f:
        json.dump(config_metadata, f, indent=2)
    
    # Use run-specific output directory
    out_dir = run_out_dir
    
    _agent_log(run_id, "H1", "engine/run.py:paths", "Resolved core paths", {
        "dataDir": str(data_dir),
        "outDir": str(out_dir),
        "playbooksDir": str(playbooks_dir),
    })
    
    # Initialize structured logger
    logger = get_logger(run_id, out_dir)

    print("\n[1/8] Ingesting historian data...")
    logger.start_phase("ingest", {'data_dir': str(data_dir)})
    _agent_log(run_id, "H2", "engine/run.py:ingest:start", "Starting ingest_historian_data", {})
    # DB path for sensor_readings (when app has pushed data via POST /api/sensors/data)
    db_path = script_dir.parent / 'data' / 'munin.db'
    df = ingest_historian_data(data_dir, db_path=db_path if db_path.exists() else None, recursive=True)
    logger.end_phase("ingest", {
        'rows': len(df),
        'columns': len(df.columns),
        'nodes': list(df['node_id'].unique()) if 'node_id' in df.columns else []
    })
    _agent_log(run_id, "H2", "engine/run.py:ingest:end", "Completed ingest_historian_data", {
        "rows": len(df),
        "columns": list(df.columns),
    })
    normalize_timeseries(df, out_dir / "normalized_timeseries.csv")
    _agent_log(run_id, "H2", "engine/run.py:normalize", "Normalized timeseries written", {
        "normalizedPath": str(out_dir / "normalized_timeseries.csv"),
    })

    # Playbook trigger evaluation (live data -> which playbooks are triggered)
    try:
        import pandas as pd
        from live_match import evaluate_playbook_triggers, write_triggered_playbooks
        df_norm = pd.read_csv(out_dir / "normalized_timeseries.csv", index_col=0, parse_dates=True)
        triggered = evaluate_playbook_triggers(df_norm)
        write_triggered_playbooks(triggered, out_dir / "triggered_playbooks.json")
    except Exception:
        pass  # Optional: carlisle_config may not be available

    print("\n[2/8] Inferring dependency graph...")
    logger.start_phase("graph_inference")
    _agent_log(run_id, "H3", "engine/run.py:graph:start", "Starting build_graph", {})
    build_graph(out_dir / "normalized_timeseries.csv", out_dir / "graph.json", config=config.graph)
    
    # Load graph to get metrics
    with open(out_dir / "graph.json", 'r') as f:
        graph_data = json.load(f)
    
    logger.end_phase("graph_inference", {
        'nodes': len(graph_data.get('nodes', [])),
        'edges': len(graph_data.get('edges', [])),
        'shadow_links': sum(1 for e in graph_data.get('edges', []) if e.get('isShadowLink', False))
    })
    _agent_log(run_id, "H3", "engine/run.py:graph:end", "Completed build_graph", {
        "graphPath": str(out_dir / "graph.json"),
    })

    print("\n[3/8] Assessing sensor health and building evidence...")
    logger.start_phase("sensor_health")
    import pandas as pd
    _agent_log(run_id, "H1", "engine/run.py:pandas_import", "Imported pandas for health stage", {})
    df_normalized = pd.read_csv(out_dir / "normalized_timeseries.csv", index_col=0, parse_dates=True)
    _agent_log(run_id, "H4", "engine/run.py:health:input", "Loaded normalized_timeseries.csv", {
        "rows": len(df_normalized),
        "columns": list(df_normalized.columns),
    })
    health = assess_sensor_health(df_normalized)
    _agent_log(run_id, "H4", "engine/run.py:health:summary", "Computed sensor health", {
        "numSensors": len(health) if hasattr(health, "__len__") else None,
    })
    with open(out_dir / "graph.json", 'r') as f:
        graph = json.load(f)
    evidence_windows = build_evidence_windows(df_normalized, graph['edges'])
    evidence_data = {'windows': evidence_windows}
    with open(out_dir / "evidence.json", 'w') as f:
        json.dump(evidence_data, f, indent=2)
    
    logger.end_phase("sensor_health", {
        'health_assessments': len(health) if hasattr(health, '__len__') else 0,
        'evidence_windows': len(evidence_windows)
    })
    _agent_log(run_id, "H4", "engine/run.py:evidence", "Evidence windows built", {
        "numEvidenceWindows": len(evidence_windows),
        "evidencePath": str(out_dir / "evidence.json"),
    })
    print(f"Evidence saved: {len(evidence_windows)} windows")

    print("\n[4/8] Building incident simulations (exhaustive scenario space)...")
    logger.start_phase("incident_simulation")
    _n_jobs = max(1, (cpu_count() or 4) - 1) if n_jobs == 0 else n_jobs
    _agent_log(run_id, "H5", "engine/run.py:incidents:start", "Starting build_incidents", {
        "all_scenarios": all_scenarios,
        "max_scenarios": max_scenarios,
        "n_jobs": _n_jobs,
    })
    build_incidents(
        out_dir / "graph.json",
        out_dir / "incidents.json",
        all_scenarios=all_scenarios,
        max_scenarios=max_scenarios,
        n_jobs=_n_jobs,
        seed=config.rng.base_seed,
    )
    
    with open(out_dir / "incidents.json", 'r') as f:
        incidents_data = json.load(f)
    
    logger.end_phase("incident_simulation", {
        'incidents': len(incidents_data.get('incidents', []))
    })
    _agent_log(run_id, "H5", "engine/run.py:incidents:end", "Completed build_incidents", {
        "incidentsPath": str(out_dir / "incidents.json"),
    })

    # Match live situation to nearest pre-simulated scenario (crisis-time lookup)
    try:
        from live_match import match_live_to_scenario
        df_norm = pd.read_csv(out_dir / "normalized_timeseries.csv", index_col=0, parse_dates=True)
        live_state = df_norm.iloc[-1].to_dict() if len(df_norm) > 0 else {}
        incidents_list = incidents_data.get('incidents', [])
        matched = match_live_to_scenario(live_state, incidents_list)
        with open(out_dir / "live_matched_scenario.json", 'w') as f:
            json.dump({'matched_incident': matched, 'live_state_keys': list(live_state.keys())}, f, indent=2)
    except Exception:
        pass  # Optional: live_match may not have carlisle_config

    print("\n[5/8] Generating authoritative handshake packets...")
    logger.start_phase("packet_generation")
    packetize_incidents(
        out_dir / "incidents.json",
        out_dir / "graph.json",
        out_dir / "evidence.json",
        playbooks_dir,
        out_dir / "packets"
    )
    
    # Count generated packets
    packet_files = list((out_dir / "packets").glob("*.json"))
    
    logger.end_phase("packet_generation", {
        'packets_generated': len(packet_files)
    })
    _agent_log(run_id, "H5", "engine/run.py:packets", "Completed packetize_incidents", {
        "packetsDir": str(out_dir / "packets"),
    })

    # === INTELLIGENCE LAYERS (6-8) ===
    # Layer 2: Anomaly Detection
    print("\n[6/8] Running anomaly detection (Layer 2)...")
    logger.start_phase("anomaly_detection")
    anomaly_results = None
    try:
        from intelligence.anomaly.trainer import AnomalyTrainer, AnomalyConfig
        anomaly_cfg = AnomalyConfig(
            hidden_dim=config.anomaly.hidden_dim,
            latent_dim=config.anomaly.latent_dim,
            n_layers=config.anomaly.n_layers,
            dropout=config.anomaly.dropout,
            window_size=config.anomaly.window_size,
            physics_lambda=config.anomaly.physics_lambda,
            svm_nu=config.anomaly.svm_nu,
            anomaly_percentile=config.anomaly.anomaly_percentile,
        )
        n_sensors = len(df_normalized.columns)
        trainer = AnomalyTrainer(n_sensors=n_sensors, config=anomaly_cfg)
        data_array = df_normalized.values.astype('float32')
        # Quick training for pipeline integration (full training via CLI)
        trainer.train(data_array, data_array, epochs=min(config.anomaly.epochs, 10))
        anomaly_results = trainer.detect_anomalies(data_array)
        with open(out_dir / "anomaly_report.json", 'w') as f:
            json.dump(anomaly_results, f, indent=2, default=str)
        logger.end_phase("anomaly_detection", {
            'anomalies_detected': anomaly_results.get('total_anomalies', 0)
        })
        print(f"  Anomalies detected: {anomaly_results.get('total_anomalies', 0)}")
    except ImportError:
        print("  [SKIP] torch not installed — run: pip install torch scikit-learn")
        logger.end_phase("anomaly_detection", {'skipped': True})
    except Exception as e:
        print(f"  [WARN] Anomaly detection failed: {e}")
        logger.end_phase("anomaly_detection", {'error': str(e)})

    # Layer 3: GNN Cascade Prediction
    print("\n[7/8] Running GNN cascade prediction (Layer 3)...")
    logger.start_phase("cascade_prediction")
    try:
        from intelligence.cascade.predictor import CascadePredictor, CascadeConfig, GraphData
        import torch
        cascade_cfg = CascadeConfig(
            node_dim=config.cascade.node_dim,
            edge_dim=config.cascade.edge_dim,
            hidden_dim=config.cascade.hidden_dim,
            gnn_layers=config.cascade.gnn_layers,
            ode_hidden_dim=config.cascade.ode_hidden_dim,
            dropout=config.cascade.dropout,
        )
        # Build graph data from loaded graph
        nodes_list = graph_data.get('nodes', [])
        edges_list = graph_data.get('edges', [])
        if nodes_list and edges_list:
            node_id_to_idx = {n['id']: i for i, n in enumerate(nodes_list)}
            n_nodes = len(nodes_list)
            # Node features: health score + sector one-hot (4 sectors)
            sector_map = {'power': 0, 'water': 1, 'telecom': 2, 'other': 3}
            node_feats = []
            for n in nodes_list:
                health = n.get('health', {}).get('score', 0.5)
                sector_idx = sector_map.get(n.get('sector', 'other'), 3)
                feat = [health] + [1.0 if i == sector_idx else 0.0 for i in range(4)]
                node_feats.append(feat)
            # Pad to node_dim
            for i in range(len(node_feats)):
                while len(node_feats[i]) < cascade_cfg.node_dim:
                    node_feats[i].append(0.0)
                node_feats[i] = node_feats[i][:cascade_cfg.node_dim]

            edge_src, edge_dst, edge_feats = [], [], []
            phys_types = {'hydraulic': 0, 'electrical': 1, 'thermal': 2, 'communications': 3}
            for e in edges_list:
                src_idx = node_id_to_idx.get(e.get('source'))
                tgt_idx = node_id_to_idx.get(e.get('target'))
                if src_idx is not None and tgt_idx is not None:
                    edge_src.append(src_idx)
                    edge_dst.append(tgt_idx)
                    lag = e.get('inferredLagSeconds', 0) / 300.0
                    conf = e.get('confidenceScore', 0.5)
                    ptype = [0.0] * 4
                    edge_feats.append([lag, conf] + ptype + [0.0, 0.0])

            if edge_src:
                gd = GraphData(
                    node_features=torch.tensor(node_feats, dtype=torch.float32),
                    edge_index=torch.tensor([edge_src, edge_dst], dtype=torch.long),
                    edge_features=torch.tensor(edge_feats, dtype=torch.float32)[:, :cascade_cfg.edge_dim],
                    node_ids=[n['id'] for n in nodes_list],
                    capacities=torch.ones(n_nodes)
                )
                predictor = CascadePredictor(cascade_cfg)
                # Run prediction on first node as demo
                pred = predictor.predict_cascade(gd, failure_node_indices=[0], t_horizon=2.0)
                cascade_output = {
                    'affected_nodes': {k: v.tolist() if hasattr(v, 'tolist') else v for k, v in pred.affected_nodes.items()},
                    'time_to_impact': pred.time_to_impact,
                    'cascade_paths': pred.cascade_paths,
                }
                with open(out_dir / "cascade_prediction.json", 'w') as f:
                    json.dump(cascade_output, f, indent=2, default=str)
                print(f"  Cascade paths predicted: {len(pred.cascade_paths)}")
            else:
                print("  [SKIP] No valid edges for GNN")
        logger.end_phase("cascade_prediction", {'completed': True})
    except ImportError:
        print("  [SKIP] torch not installed — run: pip install torch")
        logger.end_phase("cascade_prediction", {'skipped': True})
    except Exception as e:
        print(f"  [WARN] Cascade prediction failed: {e}")
        logger.end_phase("cascade_prediction", {'error': str(e)})

    # Layer 7: Model Governance (audit trail for this run)
    print("\n[8/8] Recording model governance audit...")
    logger.start_phase("governance")
    try:
        from intelligence.governance.audit_trail import MLAuditTrail
        audit = MLAuditTrail(out_dir / "ml_audit")
        audit.log_training(
            model_name="munin-pipeline",
            version=ENGINE_CONFIG_VERSION,
            config=config.to_dict(),
            data_sources=[str(data_dir)],
            metrics={
                'nodes': len(graph_data.get('nodes', [])),
                'edges': len(graph_data.get('edges', [])),
                'incidents': len(incidents_data.get('incidents', [])),
                'anomalies': anomaly_results.get('total_anomalies', 0) if anomaly_results else 0,
            }
        )
        print(f"  Audit trail: {out_dir / 'ml_audit'}")
        logger.end_phase("governance", {'completed': True})
    except Exception as e:
        print(f"  [WARN] Governance audit failed: {e}")
        logger.end_phase("governance", {'error': str(e)})

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE (Layers 1-7)")
    print("=" * 60)
    print(f"Output directory: {out_dir}")
    print(f"Run ID: {run_id}")
    print(f"  - graph.json            (Layer 1: Shadow Links)")
    print(f"  - evidence.json         (Layer 1: Evidence Windows)")
    print(f"  - incidents.json        (Layer 1: Cascade Simulation)")
    print(f"  - packets/              (Layer 1: Authorization Packets)")
    print(f"  - anomaly_report.json   (Layer 2: Anomaly Detection)")
    print(f"  - cascade_prediction.json (Layer 3: GNN Cascade)")
    print(f"  - ml_audit/             (Layer 7: Governance Audit)")
    print(f"  - audit.jsonl")

    # Copy key outputs to engine/out for app compatibility (app and sync read engine/out/graph.json, incidents.json, etc.)
    parent_out = out_dir.parent
    if parent_out != out_dir:
        for name in ["normalized_timeseries.csv", "graph.json", "evidence.json", "incidents.json", "live_matched_scenario.json", "triggered_playbooks.json"]:
            src = out_dir / name
            if src.exists():
                shutil.copy2(src, parent_out / name)
        packets_src = out_dir / "packets"
        packets_dst = parent_out / "packets"
        if packets_src.exists():
            if packets_dst.exists():
                shutil.rmtree(packets_dst)
            shutil.copytree(packets_src, packets_dst)
        _agent_log(run_id, "H5", "engine/run.py:copy_out", "Copied outputs to engine/out for app", {
            "parentOut": str(parent_out),
        })

    _agent_log(run_id, "H5", "engine/run.py:done", "Pipeline complete", {
        "outDir": str(out_dir),
    })

if __name__ == "__main__":
    import argparse
    import time
    parser = argparse.ArgumentParser(description='Run Munin engine pipeline. By default exhaustively enumerates the scenario space (single-origin, multi-fault, correlated).')
    parser.add_argument('--data-dir', type=Path, help='Input data directory')
    parser.add_argument('--out-dir', type=Path, help='Output directory')
    parser.add_argument('--playbooks-dir', type=Path, help='Playbooks directory')
    parser.add_argument('--config', type=Path, help='Config JSON file')
    parser.add_argument('--seed', type=int, default=42, help='Random seed (default: 42)')
    parser.add_argument('--resume-from', type=str, help='Resume from checkpoint stage (ingest, graph, incidents, packets)')
    parser.add_argument('--check', action='store_true', help='Run sanity checks on outputs')
    parser.add_argument('--quick', action='store_true', help='Run only 3 fixed incidents (fast demo); default is all conceivable + chaos scenarios')
    parser.add_argument('--scenarios', type=int, default=None, metavar='N', help='Cap at N scenarios (sample when over). Enables targeting e.g. 10000.')
    parser.add_argument('--parallel', type=int, default=1, metavar='N', help='Parallel workers for cascade simulation (1=sequential, 0=auto).')
    parser.add_argument('--continuous', action='store_true', help='Re-run pipeline at all times (every --interval seconds)')
    parser.add_argument('--interval', type=int, default=300, help='Seconds between runs when --continuous (default: 300 for wedge)')
    args = parser.parse_args()
    
    if args.check:
        from engine.tools.sanity_check_outputs import sanity_check_all
        sanity_check_all(args.out_dir or Path("engine/out"))
    elif args.continuous:
        while True:
            main(
                data_dir=args.data_dir,
                out_dir=args.out_dir,
                playbooks_dir=args.playbooks_dir,
                config_path=args.config,
                seed=args.seed,
                all_scenarios=not args.quick,
                max_scenarios=args.scenarios,
                n_jobs=args.parallel if args.parallel > 0 else 0,
            )
            print(f"\nContinuous mode: sleeping {args.interval}s until next run...")
            time.sleep(args.interval)
    else:
        main(
            data_dir=args.data_dir,
            out_dir=args.out_dir,
            playbooks_dir=args.playbooks_dir,
            config_path=args.config,
            seed=args.seed,
            all_scenarios=not args.quick,
            max_scenarios=args.scenarios,
            n_jobs=args.parallel if args.parallel > 0 else 0,
        )

