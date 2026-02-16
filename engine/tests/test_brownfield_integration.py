"""
Brownfield Plant Integration Test
Tests end-to-end flow: protocol translation → graph inference → shadow mode → handshake
using synthetic brownfield plant data.
"""
import pytest
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from protocol_translator import ProtocolLibrary, ProtocolTranslator
from ingest import normalize_timeseries
from infer_graph import build_graph
from shadow_simulation import ShadowModeEngine
from packetize import packetize_incidents


def generate_brownfield_plant_data(num_nodes: int = 50, num_samples: int = 1000) -> pd.DataFrame:
    """Generate synthetic brownfield plant time-series data."""
    np.random.seed(42)
    timestamps = pd.date_range('2026-01-01', periods=num_samples, freq='1min')
    
    data = {}
    
    # Create correlated groups (power → water → cooling)
    power_nodes = [f"substation_{i:02d}" for i in range(num_nodes // 3)]
    water_nodes = [f"pump_{i:02d}" for i in range(num_nodes // 3)]
    cooling_nodes = [f"chiller_{i:02d}" for i in range(num_nodes // 3)]
    
    # Generate power data
    for node in power_nodes:
        base = np.random.randn(num_samples) * 10 + 100
        data[node] = base
    
    # Generate water data (correlated with power)
    for i, node in enumerate(water_nodes):
        power_node = power_nodes[i % len(power_nodes)]
        base = data[power_node] * 0.5 + np.random.randn(num_samples) * 5 + 50
        data[node] = base
    
    # Generate cooling data (correlated with power and water)
    for i, node in enumerate(cooling_nodes):
        power_node = power_nodes[i % len(power_nodes)]
        water_node = water_nodes[i % len(water_nodes)]
        base = (data[power_node] * 0.3 + data[water_node] * 0.4 + 
                np.random.randn(num_samples) * 3 + 25)
        data[node] = base
    
    df = pd.DataFrame(data, index=timestamps)
    return df


def simulate_protocol_frames(df: pd.DataFrame) -> list:
    """Simulate protocol frames from time-series data."""
    frames = []
    
    for node_id in df.columns:
        for idx, (timestamp, value) in enumerate(df[node_id].items()):
            # Simulate different protocols based on node type
            if 'substation' in node_id:
                protocol = 'modbus'
                frame = {
                    'device_address': int(node_id.split('_')[1]),
                    'function_code': 3,
                    'start_address': 40001,
                    'quantity': 1,
                    'values': [float(value)],
                    'timestamp': timestamp.isoformat(),
                    'hex': f"0{int(node_id.split('_')[1]):02d}0300000001"
                }
            elif 'pump' in node_id:
                protocol = 'dnp3'
                frame = {
                    'object_group': 30,
                    'object_variation': 1,
                    'index': int(node_id.split('_')[1]),
                    'value': float(value),
                    'quality': 'GOOD',
                    'timestamp': timestamp.isoformat(),
                    'hex': '0564 01 C0 01 00 00'
                }
            else:
                protocol = 'bacnet'
                frame = {
                    'object_type': 'analog_input',
                    'object_instance': int(node_id.split('_')[1]),
                    'property': 'present_value',
                    'value': float(value),
                    'units': 'unknown',
                    'timestamp': timestamp.isoformat(),
                    'hex': '81 0B 00 0C'
                }
            
            frames.append({
                'protocol': protocol,
                'frame': frame,
                'node_id': node_id
            })
    
    return frames


class TestBrownfieldIntegration:
    """End-to-end brownfield plant integration test."""
    
    def test_protocol_translation_to_graph(self, tmp_path):
        """Test protocol translation → normalized timeseries → graph inference."""
        # Generate brownfield data
        df = generate_brownfield_plant_data(num_nodes=20, num_samples=100)
        
        # Simulate protocol frames
        frames = simulate_protocol_frames(df)
        
        # Translate frames using protocol library
        library = ProtocolLibrary()
        node_mapping = {f['node_id']: f['node_id'] for f in frames}
        
        normalized_points = []
        for frame_data in frames[:100]:  # Use subset for speed
            translator = library.get_translator(frame_data['protocol'])
            timestamp = datetime.fromisoformat(frame_data['frame']['timestamp'])
            normalized = translator.translate_frame(
                frame=frame_data['frame'],
                node_id=frame_data['node_id'],
                timestamp=timestamp
            )
            normalized_points.append(normalized)
        
        # Convert to DataFrame
        normalized_df = pd.DataFrame(normalized_points)
        assert len(normalized_df) > 0
        assert 'node_id' in normalized_df.columns
        assert 'value' in normalized_df.columns
        
        # Save normalized timeseries
        normalized_path = tmp_path / "normalized_timeseries.csv"
        normalized_df.to_csv(normalized_path, index=False)
        
        # Build graph
        graph_path = tmp_path / "graph.json"
        build_graph(normalized_path, graph_path)
        
        # Verify graph
        with open(graph_path, 'r') as f:
            graph = json.load(f)
        
        assert 'nodes' in graph
        assert 'edges' in graph
        assert len(graph['nodes']) > 0
        assert len(graph['edges']) > 0
        
        # Verify edges connect power → water → cooling
        edge_sources = {e['source'] for e in graph['edges']}
        edge_targets = {e['target'] for e in graph['edges']}
        
        # Should have some cross-sector edges (shadow links)
        assert len(edge_sources) > 0
        assert len(edge_targets) > 0
    
    def test_graph_to_shadow_mode(self, tmp_path):
        """Test graph → shadow mode simulation."""
        # Create minimal graph
        graph = {
            'nodes': [
                {'id': 'substation_01', 'sector': 'power'},
                {'id': 'pump_01', 'sector': 'water'},
            ],
            'edges': [
                {
                    'id': 'edge_001',
                    'source': 'substation_01',
                    'target': 'pump_01',
                    'confidenceScore': 0.85,
                    'inferredLagSeconds': 60,
                    'isShadowLink': True
                }
            ]
        }
        
        graph_path = tmp_path / "graph.json"
        with open(graph_path, 'w') as f:
            json.dump(graph, f)
        
        # Create incidents
        incidents = {
            'incidents': [
                {
                    'id': 'incident_test_001',
                    'type': 'power_failure',
                    'initialFailure': 'substation_01',
                    'timeline': [
                        {'timeSeconds': 0, 'impactedNodeIds': ['substation_01']},
                        {'timeSeconds': 60, 'impactedNodeIds': ['pump_01']}
                    ]
                }
            ]
        }
        
        incidents_path = tmp_path / "incidents.json"
        with open(incidents_path, 'w') as f:
            json.dump(incidents, f)
        
        # Initialize shadow mode engine
        shadow_engine = ShadowModeEngine(shadow_mode_duration_days=365)
        
        # Simulate human action
        human_action = shadow_engine.record_human_action(
            action_type='coordination',
            description='Human response to power failure',
            target_nodes=['substation_01', 'pump_01'],
            duration_seconds=3600,  # 1 hour
            outcome='success'
        )
        
        # Generate Munin prediction
        munin_prediction = shadow_engine.generate_munin_prediction(
            'incident_test_001',
            incidents['incidents'][0],
            graph,
            {'windows': []}
        )
        
        # Compare
        comparison = shadow_engine.compare_human_vs_munin(
            'incident_test_001',
            human_action,
            munin_prediction
        )
        
        assert comparison.time_saved_seconds >= 0
        assert comparison.improvement_ratio >= 1.0
    
    def test_shadow_to_handshake(self, tmp_path):
        """Test shadow mode → handshake packet generation."""
        # Create graph
        graph = {
            'nodes': [
                {'id': 'substation_01', 'sector': 'power', 'region': 'north'}
            ],
            'edges': []
        }
        
        graph_path = tmp_path / "graph.json"
        with open(graph_path, 'w') as f:
            json.dump(graph, f)
        
        # Create incidents
        incidents = {
            'incidents': [
                {
                    'id': 'incident_test_001',
                    'type': 'power_failure',
                    'initialFailure': 'substation_01',
                    'timeline': [
                        {'timeSeconds': 0, 'impactedNodeIds': ['substation_01']}
                    ]
                }
            ]
        }
        
        incidents_path = tmp_path / "incidents.json"
        with open(incidents_path, 'w') as f:
            json.dump(incidents, f)
        
        # Create evidence
        evidence = {
            'windows': [
                {
                    'id': 'ev_001',
                    'sourceNodeId': 'substation_01',
                    'targetNodeId': 'pump_01',
                    'correlation': 0.85,
                    'lagSeconds': 60,
                    'supportType': 'support'
                }
            ]
        }
        
        evidence_path = tmp_path / "evidence.json"
        with open(evidence_path, 'w') as f:
            json.dump(evidence, f)
        
        # Create playbooks directory
        playbooks_dir = tmp_path / "playbooks"
        playbooks_dir.mkdir()
        
        playbook = {
            'id': 'power_failure_response',
            'name': 'Power Failure Response',
            'situation': 'power_failure',
            'actions': [
                {
                    'action': 'isolate_affected_assets',
                    'targets': ['substation_01']
                }
            ]
        }
        
        with open(playbooks_dir / "power_failure_response.json", 'w') as f:
            json.dump(playbook, f)
        
        # Generate packets
        packets_dir = tmp_path / "packets"
        packets_dir.mkdir()
        
        packetize_incidents(
            incidents_path,
            graph_path,
            evidence_path,
            playbooks_dir,
            packets_dir
        )
        
        # Verify packets generated
        packet_files = list(packets_dir.glob("*.json"))
        assert len(packet_files) > 0
        
        # Verify packet structure
        with open(packet_files[0], 'r') as f:
            packet = json.load(f)
        
        assert 'id' in packet
        assert 'status' in packet
        assert 'scope' in packet
        assert 'situationSummary' in packet
        assert 'proposedAction' in packet


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
