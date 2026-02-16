"""Property-based tests for infer_graph.py to ensure graph invariants."""
import pandas as pd
import numpy as np
from pathlib import Path
import pytest
from hypothesis import given, strategies as st, settings
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from infer_graph import infer_edges, create_nodes_from_data, build_graph
from config import GraphInferenceConfig


def create_synthetic_dataframe(n_nodes: int, n_samples: int, seed: int = 42) -> pd.DataFrame:
    """Create synthetic time-series DataFrame for testing."""
    np.random.seed(seed)
    timestamps = pd.date_range('2026-01-01', periods=n_samples, freq='1min')
    
    data = {}
    for i in range(n_nodes):
        # Create correlated series
        base = np.random.randn(n_samples)
        if i > 0:
            # Add correlation with previous node
            base = 0.7 * base + 0.3 * data[f'node_{i-1:02d}']
        data[f'node_{i:02d}'] = base
    
    return pd.DataFrame(data, index=timestamps)


class TestGraphInvariants:
    """Property-based tests for graph inference invariants."""
    
    @given(
        n_nodes=st.integers(min_value=2, max_value=20),
        n_samples=st.integers(min_value=50, max_value=500),
        seed=st.integers(min_value=0, max_value=1000)
    )
    @settings(max_examples=20, deadline=5000)
    def test_no_self_loops(self, n_nodes, n_samples, seed):
        """Property: Graph should never have self-loops (node -> node)."""
        df = create_synthetic_dataframe(n_nodes, n_samples, seed)
        edges = infer_edges(df, min_confidence=0.3, max_edges_per_node=10)
        
        for edge in edges:
            assert edge['source'] != edge['target'], \
                f"Self-loop detected: {edge['source']} -> {edge['target']}"
    
    @given(
        n_nodes=st.integers(min_value=2, max_value=15),
        n_samples=st.integers(min_value=50, max_value=300),
        max_edges=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=15, deadline=5000)
    def test_max_edges_per_node(self, n_nodes, n_samples, max_edges):
        """Property: Each node should have at most max_edges_per_node outgoing edges."""
        df = create_synthetic_dataframe(n_nodes, n_samples)
        edges = infer_edges(df, min_confidence=0.3, max_edges_per_node=max_edges)
        
        # Count outgoing edges per node
        outgoing_count = {}
        for edge in edges:
            source = edge['source']
            outgoing_count[source] = outgoing_count.get(source, 0) + 1
        
        for source, count in outgoing_count.items():
            assert count <= max_edges, \
                f"Node {source} has {count} edges, exceeds max {max_edges}"
    
    @given(
        n_nodes=st.integers(min_value=2, max_value=10),
        n_samples=st.integers(min_value=100, max_value=500)
    )
    @settings(max_examples=10, deadline=5000)
    def test_lag_bounds(self, n_nodes, n_samples):
        """Property: All inferred lags should be within max_lag_seconds."""
        config = GraphInferenceConfig(max_lag_seconds=300)
        df = create_synthetic_dataframe(n_nodes, n_samples)
        edges = infer_edges(df, config=config, min_confidence=0.3)
        
        for edge in edges:
            lag = edge['inferredLagSeconds']
            assert 0 <= lag <= config.max_lag_seconds, \
                f"Lag {lag}s exceeds max {config.max_lag_seconds}s"
    
    @given(
        n_nodes=st.integers(min_value=2, max_value=10),
        n_samples=st.integers(min_value=100, max_value=500)
    )
    @settings(max_examples=10, deadline=5000)
    def test_confidence_bounds(self, n_nodes, n_samples):
        """Property: All edge confidence scores should be in [0, 1]."""
        df = create_synthetic_dataframe(n_nodes, n_samples)
        edges = infer_edges(df, min_confidence=0.3)
        
        for edge in edges:
            confidence = edge['confidenceScore']
            assert 0.0 <= confidence <= 1.0, \
                f"Confidence {confidence} outside [0, 1]"
    
    @given(
        n_nodes=st.integers(min_value=2, max_value=10),
        n_samples=st.integers(min_value=100, max_value=500)
    )
    @settings(max_examples=10, deadline=5000)
    def test_stability_bounds(self, n_nodes, n_samples):
        """Property: All stability scores should be in [0, 1]."""
        df = create_synthetic_dataframe(n_nodes, n_samples)
        edges = infer_edges(df, min_confidence=0.3)
        
        for edge in edges:
            stability = edge['stabilityScore']
            assert 0.0 <= stability <= 1.0, \
                f"Stability {stability} outside [0, 1]"
    
    @given(
        n_nodes=st.integers(min_value=2, max_value=10),
        min_confidence=st.floats(min_value=0.0, max_value=1.0)
    )
    @settings(max_examples=10, deadline=5000)
    def test_min_confidence_filter(self, n_nodes, min_confidence):
        """Property: All edges should meet minimum confidence threshold."""
        df = create_synthetic_dataframe(n_nodes, 200)
        edges = infer_edges(df, min_confidence=min_confidence, max_edges_per_node=10)
        
        for edge in edges:
            assert edge['confidenceScore'] >= min_confidence, \
                f"Edge {edge['id']} has confidence {edge['confidenceScore']} < {min_confidence}"
    
    def test_deterministic_output(self):
        """Property: Same input + seed should produce same output."""
        df1 = create_synthetic_dataframe(5, 100, seed=42)
        df2 = create_synthetic_dataframe(5, 100, seed=42)
        
        edges1 = infer_edges(df1, min_confidence=0.3)
        edges2 = infer_edges(df2, min_confidence=0.3)
        
        # Should have same number of edges
        assert len(edges1) == len(edges2)
        
        # Edge IDs should match (if deterministic)
        edge_ids1 = {e['id'] for e in edges1}
        edge_ids2 = {e['id'] for e in edges2}
        assert edge_ids1 == edge_ids2


class TestNodeCreation:
    """Tests for node creation invariants."""
    
    def test_node_count_matches_columns(self):
        """Property: Number of nodes should match DataFrame columns."""
        df = create_synthetic_dataframe(10, 100)
        nodes = create_nodes_from_data(df)
        
        assert len(nodes) == len(df.columns)
    
    def test_unique_node_ids(self):
        """Property: All node IDs should be unique."""
        df = create_synthetic_dataframe(10, 100)
        nodes = create_nodes_from_data(df)
        
        node_ids = [n['id'] for n in nodes]
        assert len(node_ids) == len(set(node_ids)), "Duplicate node IDs found"
    
    def test_required_node_fields(self):
        """Property: All nodes should have required fields."""
        df = create_synthetic_dataframe(5, 100)
        nodes = create_nodes_from_data(df)
        
        required_fields = ['id', 'sector', 'label', 'kind', 'region']
        for node in nodes:
            for field in required_fields:
                assert field in node, f"Node {node['id']} missing field {field}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
