"""Regression tests using golden fixtures for Carlisle Storm Desmond data."""
import json
from pathlib import Path
import pytest

# Paths
ENGINE_DIR = Path(__file__).parent.parent
FIXTURES_DIR = ENGINE_DIR / "fixtures" / "carlisle_storm_desmond"
OUT_DIR = ENGINE_DIR / "out"


def load_json(path: Path) -> dict:
    """Load JSON file."""
    with open(path, 'r') as f:
        return json.load(f)


def compare_graphs(actual: dict, expected: dict, tolerance: float = 0.01):
    """Compare graph outputs with tolerance for floating-point differences."""
    assert 'nodes' in actual
    assert 'edges' in actual
    
    # Check node count
    assert len(actual['nodes']) == len(expected['nodes']), \
        f"Node count mismatch: {len(actual['nodes'])} vs {len(expected['nodes'])}"
    
    # Check edge count
    assert len(actual['edges']) == len(expected['edges']), \
        f"Edge count mismatch: {len(actual['edges'])} vs {len(expected['edges'])}"
    
    # Check node IDs match
    actual_node_ids = {n['id'] for n in actual['nodes']}
    expected_node_ids = {n['id'] for n in expected['nodes']}
    assert actual_node_ids == expected_node_ids, \
        f"Node IDs mismatch: {actual_node_ids.symmetric_difference(expected_node_ids)}"
    
    # Check edge structure (allow small tolerance for correlation scores)
    actual_edges_by_id = {e['id']: e for e in actual['edges']}
    expected_edges_by_id = {e['id']: e for e in expected['edges']}
    
    assert set(actual_edges_by_id.keys()) == set(expected_edges_by_id.keys()), \
        f"Edge IDs mismatch"
    
    for edge_id, expected_edge in expected_edges_by_id.items():
        actual_edge = actual_edges_by_id[edge_id]
        assert actual_edge['source'] == expected_edge['source']
        assert actual_edge['target'] == expected_edge['target']
        assert abs(actual_edge['confidenceScore'] - expected_edge['confidenceScore']) < tolerance
        assert actual_edge['isShadowLink'] == expected_edge['isShadowLink']


def compare_evidence(actual: dict, expected: dict):
    """Compare evidence windows."""
    assert 'windows' in actual
    assert len(actual['windows']) == len(expected['windows']), \
        f"Evidence window count mismatch: {len(actual['windows'])} vs {len(expected['windows'])}"


def compare_incidents(actual: dict, expected: dict):
    """Compare incident simulations."""
    assert 'incidents' in actual
    assert len(actual['incidents']) == len(expected['incidents']), \
        f"Incident count mismatch: {len(actual['incidents'])} vs {len(expected['incidents'])}"


@pytest.mark.skipif(not FIXTURES_DIR.exists(), reason="Golden fixtures not generated yet")
def test_carlisle_graph_matches_fixture():
    """Test that graph inference matches golden fixture."""
    actual_path = OUT_DIR / "graph.json"
    expected_path = FIXTURES_DIR / "graph.json"
    
    if not actual_path.exists():
        pytest.skip("Engine output not found - run engine first")
    if not expected_path.exists():
        pytest.skip("Golden fixture not found - generate fixtures first")
    
    actual = load_json(actual_path)
    expected = load_json(expected_path)
    
    compare_graphs(actual, expected)


@pytest.mark.skipif(not FIXTURES_DIR.exists(), reason="Golden fixtures not generated yet")
def test_carlisle_evidence_matches_fixture():
    """Test that evidence windows match golden fixture."""
    actual_path = OUT_DIR / "evidence.json"
    expected_path = FIXTURES_DIR / "evidence.json"
    
    if not actual_path.exists():
        pytest.skip("Engine output not found - run engine first")
    if not expected_path.exists():
        pytest.skip("Golden fixture not found - generate fixtures first")
    
    actual = load_json(actual_path)
    expected = load_json(expected_path)
    
    compare_evidence(actual, expected)


@pytest.mark.skipif(not FIXTURES_DIR.exists(), reason="Golden fixtures not generated yet")
def test_carlisle_incidents_match_fixture():
    """Test that incident simulations match golden fixture."""
    actual_path = OUT_DIR / "incidents.json"
    expected_path = FIXTURES_DIR / "incidents.json"
    
    if not actual_path.exists():
        pytest.skip("Engine output not found - run engine first")
    if not expected_path.exists():
        pytest.skip("Golden fixture not found - generate fixtures first")
    
    actual = load_json(actual_path)
    expected = load_json(expected_path)
    
    compare_incidents(actual, expected)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
