"""Main pipeline runner: ingest -> infer -> health -> incidents -> packets."""
import sys
from pathlib import Path

# Add engine directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from ingest import ingest_historian_data, normalize_timeseries
from infer_graph import build_graph
from sensor_health import assess_sensor_health, build_evidence_windows
from build_incidents import build_incidents
from packetize import packetize_incidents

def main():
    """Run the complete pipeline."""
    print("=" * 60)
    print("SOVEREIGN ORCHESTRATION PROTOTYPE - ENGINE PIPELINE")
    print("=" * 60)
    
    script_dir = Path(__file__).parent
    data_dir = script_dir / "sample_data"
    out_dir = script_dir / "out"
    playbooks_dir = script_dir.parent / "playbooks"
    
    out_dir.mkdir(exist_ok=True)
    (out_dir / "packets").mkdir(exist_ok=True)
    
    print("\n[1/5] Ingesting historian data...")
    df = ingest_historian_data(data_dir)
    normalize_timeseries(df, out_dir / "normalized_timeseries.csv")
    
    print("\n[2/5] Inferring dependency graph...")
    build_graph(out_dir / "normalized_timeseries.csv", out_dir / "graph.json")
    
    print("\n[3/5] Assessing sensor health and building evidence...")
    import pandas as pd
    import json
    df_normalized = pd.read_csv(out_dir / "normalized_timeseries.csv", index_col=0, parse_dates=True)
    health = assess_sensor_health(df_normalized)
    with open(out_dir / "graph.json", 'r') as f:
        graph = json.load(f)
    evidence_windows = build_evidence_windows(df_normalized, graph['edges'])
    evidence_data = {'windows': evidence_windows}
    with open(out_dir / "evidence.json", 'w') as f:
        json.dump(evidence_data, f, indent=2)
    print(f"Evidence saved: {len(evidence_windows)} windows")
    
    print("\n[4/5] Building incident simulations...")
    build_incidents(out_dir / "graph.json", out_dir / "incidents.json")
    
    print("\n[5/5] Generating authoritative handshake packets...")
    packetize_incidents(
        out_dir / "incidents.json",
        out_dir / "graph.json",
        out_dir / "evidence.json",
        playbooks_dir,
        out_dir / "packets"
    )
    
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print(f"Output directory: {out_dir}")
    print(f"  - graph.json")
    print(f"  - evidence.json")
    print(f"  - incidents.json")
    print(f"  - packets/")
    print(f"  - audit.jsonl")

if __name__ == "__main__":
    main()

