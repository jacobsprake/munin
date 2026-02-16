"""
Sanity check script for engine outputs.

Validates graph.json, evidence.json, incidents.json against schemas.
"""
import json
import sys
from pathlib import Path
from typing import Dict, List

# Add engine directory to path
script_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(script_dir))


def validate_graph(graph: Dict) -> List[str]:
    """Validate graph.json structure."""
    errors = []
    
    if 'nodes' not in graph:
        errors.append("Missing 'nodes' field")
    else:
        if not isinstance(graph['nodes'], list):
            errors.append("'nodes' must be a list")
        else:
            for i, node in enumerate(graph['nodes']):
                if not isinstance(node, dict):
                    errors.append(f"Node {i} is not a dict")
                    continue
                if 'id' not in node:
                    errors.append(f"Node {i} missing 'id' field")
    
    if 'edges' not in graph:
        errors.append("Missing 'edges' field")
    else:
        if not isinstance(graph['edges'], list):
            errors.append("'edges' must be a list")
        else:
            for i, edge in enumerate(graph['edges']):
                if not isinstance(edge, dict):
                    errors.append(f"Edge {i} is not a dict")
                    continue
                required_fields = ['id', 'source', 'target', 'confidenceScore']
                for field in required_fields:
                    if field not in edge:
                        errors.append(f"Edge {i} missing '{field}' field")
    
    return errors


def validate_evidence(evidence: Dict) -> List[str]:
    """Validate evidence.json structure."""
    errors = []
    
    if 'windows' not in evidence:
        errors.append("Missing 'windows' field")
    else:
        if not isinstance(evidence['windows'], list):
            errors.append("'windows' must be a list")
    
    return errors


def validate_incidents(incidents: Dict) -> List[str]:
    """Validate incidents.json structure."""
    errors = []
    
    if 'incidents' not in incidents:
        errors.append("Missing 'incidents' field")
    else:
        if not isinstance(incidents['incidents'], list):
            errors.append("'incidents' must be a list")
        else:
            for i, incident in enumerate(incidents['incidents']):
                if not isinstance(incident, dict):
                    errors.append(f"Incident {i} is not a dict")
                    continue
                required_fields = ['id', 'type', 'startTs', 'timeline']
                for field in required_fields:
                    if field not in incident:
                        errors.append(f"Incident {i} missing '{field}' field")
    
    return errors


def sanity_check_all(output_dir: Path) -> bool:
    """Run all sanity checks on engine outputs."""
    print("Running sanity checks on engine outputs...")
    print(f"Output directory: {output_dir}")
    print()
    
    all_errors = []
    
    # Check graph.json
    graph_path = output_dir / "graph.json"
    if graph_path.exists():
        print(f"Checking {graph_path}...")
        try:
            with open(graph_path, 'r') as f:
                graph = json.load(f)
            errors = validate_graph(graph)
            if errors:
                print(f"  ✗ Found {len(errors)} errors:")
                for error in errors:
                    print(f"    - {error}")
                all_errors.extend([f"graph.json: {e}" for e in errors])
            else:
                print(f"  ✓ Valid ({len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges)")
        except Exception as e:
            print(f"  ✗ Failed to load: {e}")
            all_errors.append(f"graph.json: Failed to load - {e}")
    else:
        print(f"  ⚠ {graph_path} not found")
    
    # Check evidence.json
    evidence_path = output_dir / "evidence.json"
    if evidence_path.exists():
        print(f"Checking {evidence_path}...")
        try:
            with open(evidence_path, 'r') as f:
                evidence = json.load(f)
            errors = validate_evidence(evidence)
            if errors:
                print(f"  ✗ Found {len(errors)} errors:")
                for error in errors:
                    print(f"    - {error}")
                all_errors.extend([f"evidence.json: {e}" for e in errors])
            else:
                print(f"  ✓ Valid ({len(evidence.get('windows', []))} windows)")
        except Exception as e:
            print(f"  ✗ Failed to load: {e}")
            all_errors.append(f"evidence.json: Failed to load - {e}")
    else:
        print(f"  ⚠ {evidence_path} not found")
    
    # Check incidents.json
    incidents_path = output_dir / "incidents.json"
    if incidents_path.exists():
        print(f"Checking {incidents_path}...")
        try:
            with open(incidents_path, 'r') as f:
                incidents = json.load(f)
            errors = validate_incidents(incidents)
            if errors:
                print(f"  ✗ Found {len(errors)} errors:")
                for error in errors:
                    print(f"    - {error}")
                all_errors.extend([f"incidents.json: {e}" for e in errors])
            else:
                print(f"  ✓ Valid ({len(incidents.get('incidents', []))} incidents)")
        except Exception as e:
            print(f"  ✗ Failed to load: {e}")
            all_errors.append(f"incidents.json: Failed to load - {e}")
    else:
        print(f"  ⚠ {incidents_path} not found")
    
    print()
    if all_errors:
        print(f"✗ Sanity checks failed: {len(all_errors)} errors found")
        return False
    else:
        print("✓ All sanity checks passed")
        return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Sanity check engine outputs')
    parser.add_argument('output_dir', type=Path, help='Output directory to check')
    
    args = parser.parse_args()
    
    success = sanity_check_all(args.output_dir)
    sys.exit(0 if success else 1)
