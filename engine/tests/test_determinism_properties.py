"""
Property-based tests for deterministic execution guarantees.

Ensures that small floating-point drift does not affect incident ordering
or graph structure.
"""
import pytest
from hypothesis import given, strategies as st, settings, example
import pandas as pd
import numpy as np
from pathlib import Path
import sys
import json
import tempfile

# Add engine directory to path
engine_dir = Path(__file__).parent.parent
sys.path.insert(0, str(engine_dir))

from infer_graph import build_graph
from build_incidents import build_incidents
from config import RNGConfig


def generate_synthetic_timeseries(n_nodes: int = 10, n_samples: int = 100, seed: int = 42):
    """Generate synthetic time-series data."""
    np.random.seed(seed)
    timestamps = pd.date_range('2026-01-01', periods=n_samples, freq='1min')
    
    data = {}
    for i in range(n_nodes):
        node_id = f"node_{i:02d}"
        # Create correlated series
        base = np.random.randn(n_samples) * 10 + 100
        if i > 0:
            # Correlate with previous node
            base = base * 0.7 + data[f"node_{i-1:02d}"] * 0.3
        data[node_id] = base
    
    df = pd.DataFrame(data, index=timestamps)
    return df


@given(
    seed1=st.integers(min_value=0, max_value=1000),
    seed2=st.integers(min_value=0, max_value=1000)
)
@settings(max_examples=20)
def test_deterministic_graph_structure(seed1, seed2):
    """Test that same seed produces identical graph structure."""
    if seed1 != seed2:
        pytest.skip("Testing same seed only")
    
    # Generate data with same seed
    df1 = generate_synthetic_timeseries(seed=seed1)
    df2 = generate_synthetic_timeseries(seed=seed2)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        
        # Save to CSV
        csv1 = tmp_path / "data1.csv"
        csv2 = tmp_path / "data2.csv"
        df1.to_csv(csv1)
        df2.to_csv(csv2)
        
        # Build graphs with same seed
        graph1_path = tmp_path / "graph1.json"
        graph2_path = tmp_path / "graph2.json"
        
        # Initialize RNG with same seed
        rng_config = RNGConfig(base_seed=seed1)
        rng_config.initialize_rng_streams()
        
        build_graph(csv1, graph1_path)
        
        rng_config = RNGConfig(base_seed=seed2)
        rng_config.initialize_rng_streams()
        
        build_graph(csv2, graph2_path)
        
        # Load graphs
        with open(graph1_path) as f:
            graph1 = json.load(f)
        with open(graph2_path) as f:
            graph2 = json.load(f)
        
        # Check structure matches
        assert len(graph1['nodes']) == len(graph2['nodes'])
        assert len(graph1['edges']) == len(graph2['edges'])
        
        # Check node IDs match
        node_ids1 = {n['id'] for n in graph1['nodes']}
        node_ids2 = {n['id'] for n in graph2['nodes']}
        assert node_ids1 == node_ids2
        
        # Check edge structure matches (within tolerance)
        edges1 = {(e['source'], e['target']) for e in graph1['edges']}
        edges2 = {(e['source'], e['target']) for e in graph2['edges']}
        assert edges1 == edges2


@given(
    noise_level=st.floats(min_value=1e-10, max_value=1e-6)
)
@settings(max_examples=10)
def test_floating_point_drift_does_not_affect_incident_ordering(noise_level):
    """Test that small floating-point drift does not affect incident ordering."""
    # Generate base data
    df = generate_synthetic_timeseries(n_nodes=5, n_samples=50, seed=42)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        
        # Create two versions: base and with small noise
        csv_base = tmp_path / "base.csv"
        csv_noisy = tmp_path / "noisy.csv"
        
        df.to_csv(csv_base)
        
        # Add tiny noise
        df_noisy = df.copy()
        noise = np.random.randn(*df_noisy.shape) * noise_level
        df_noisy += noise
        df_noisy.to_csv(csv_noisy)
        
        # Build graphs
        graph_base_path = tmp_path / "graph_base.json"
        graph_noisy_path = tmp_path / "graph_noisy.json"
        
        rng_config = RNGConfig(base_seed=42)
        rng_config.initialize_rng_streams()
        build_graph(csv_base, graph_base_path)
        
        rng_config = RNGConfig(base_seed=42)
        rng_config.initialize_rng_streams()
        build_graph(csv_noisy, graph_noisy_path)
        
        # Build incidents
        incidents_base_path = tmp_path / "incidents_base.json"
        incidents_noisy_path = tmp_path / "incidents_noisy.json"
        
        rng_config = RNGConfig(base_seed=42)
        rng_config.initialize_rng_streams()
        build_incidents(graph_base_path, incidents_base_path)
        
        rng_config = RNGConfig(base_seed=42)
        rng_config.initialize_rng_streams()
        build_incidents(graph_noisy_path, incidents_noisy_path)
        
        # Load incidents
        with open(incidents_base_path) as f:
            incidents_base = json.load(f)
        with open(incidents_noisy_path) as f:
            incidents_noisy = json.load(f)
        
        # Check incident ordering is preserved
        assert len(incidents_base['incidents']) == len(incidents_noisy['incidents'])
        
        # Check incident IDs match (ordering preserved)
        ids_base = [inc['id'] for inc in incidents_base['incidents']]
        ids_noisy = [inc['id'] for inc in incidents_noisy['incidents']]
        assert ids_base == ids_noisy, "Incident ordering changed due to floating-point drift"


@given(
    seed=st.integers(min_value=0, max_value=1000)
)
@settings(max_examples=10, deadline=2000)
def test_deterministic_incident_timeline_structure(seed):
    """Test that incident timelines have deterministic structure."""
    df = generate_synthetic_timeseries(seed=seed)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        
        csv_path = tmp_path / "data.csv"
        df.to_csv(csv_path)
        
        graph_path = tmp_path / "graph.json"
        
        rng_config = RNGConfig(base_seed=seed)
        rng_config.initialize_rng_streams()
        build_graph(csv_path, graph_path)
        
        # Build incidents twice with same seed
        incidents1_path = tmp_path / "incidents1.json"
        incidents2_path = tmp_path / "incidents2.json"
        
        rng_config = RNGConfig(base_seed=seed)
        rng_config.initialize_rng_streams()
        build_incidents(graph_path, incidents1_path)
        
        rng_config = RNGConfig(base_seed=seed)
        rng_config.initialize_rng_streams()
        build_incidents(graph_path, incidents2_path)
        
        # Load incidents
        with open(incidents1_path) as f:
            incidents1 = json.load(f)
        with open(incidents2_path) as f:
            incidents2 = json.load(f)
        
        # Check structure matches
        assert len(incidents1['incidents']) == len(incidents2['incidents'])
        
        for inc1, inc2 in zip(incidents1['incidents'], incidents2['incidents']):
            assert inc1['id'] == inc2['id']
            assert len(inc1['timeline']) == len(inc2['timeline'])
            
            # Check timeline structure (node counts per step)
            for step1, step2 in zip(inc1['timeline'], inc2['timeline']):
                assert len(step1['impactedNodeIds']) == len(step2['impactedNodeIds'])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
