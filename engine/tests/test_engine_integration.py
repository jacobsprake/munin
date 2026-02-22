"""
Engine integration test: graph -> incidents -> packets.
Minimal pipeline test without protocol translator or shadow mode.
"""
import pytest
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from ingest import normalize_timeseries
from infer_graph import build_graph
from sensor_health import build_evidence_windows
from build_incidents import build_incidents
from packetize import packetize_incidents


def test_graph_to_packets_pipeline(tmp_path):
    """Test full pipeline: normalized CSV -> graph -> evidence -> incidents -> packets."""
    # Minimal normalized time-series (3 nodes, few rows)
    import pandas as pd
    import numpy as np
    ts = pd.date_range('2026-01-01', periods=50, freq='1h')
    df = pd.DataFrame(
        {
            'reservoir_alpha': np.random.randn(50).cumsum() + 40,
            'pump_01': np.random.randn(50).cumsum() + 30,
            'substation_01': np.random.randn(50).cumsum() + 50,
        },
        index=ts,
    )
    csv_path = tmp_path / "normalized.csv"
    df.to_csv(csv_path)

    # Graph
    build_graph(csv_path, tmp_path / "graph.json")
    with open(tmp_path / "graph.json") as f:
        graph = json.load(f)
    assert 'nodes' in graph
    assert 'edges' in graph

    # Evidence
    edges = graph['edges']
    evidence_windows = build_evidence_windows(df, edges)
    with open(tmp_path / "evidence.json", 'w') as f:
        json.dump({'windows': evidence_windows}, f, indent=2)

    # Incidents (quick mode for speed)
    build_incidents(tmp_path / "graph.json", tmp_path / "incidents.json", all_scenarios=False)
    with open(tmp_path / "incidents.json") as f:
        incidents_data = json.load(f)
    incidents = incidents_data.get('incidents', [])
    assert len(incidents) >= 1

    # Packets
    playbooks_dir = Path(__file__).parent.parent.parent / "playbooks"
    (tmp_path / "packets").mkdir(exist_ok=True)
    packetize_incidents(
        tmp_path / "incidents.json",
        tmp_path / "graph.json",
        tmp_path / "evidence.json",
        playbooks_dir,
        tmp_path / "packets",
    )
    packet_files = list((tmp_path / "packets").glob("*.json"))
    assert len(packet_files) >= 1
    with open(packet_files[0]) as f:
        packet = json.load(f)
    assert packet.get('id')
    assert packet.get('playbookId')
    assert packet.get('status') == 'ready'
    assert 'timeToAuthorizeSeconds' in packet or 'timeToAuthorize' in packet
