"""Synthetic scenario generators for stress-testing counterfactual and shadow pipelines."""
import random
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List
from datetime import datetime, timedelta
import json


def generate_random_substation_failure(
    graph: Dict,
    num_failures: int = 1,
    seed: int = None
) -> List[Dict]:
    """
    Generate random substation failure scenarios.
    
    Args:
        graph: Dependency graph with nodes
        num_failures: Number of random failures to generate
        seed: Random seed for reproducibility
    
    Returns:
        List of incident dictionaries
    """
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)
    
    # Find all substation nodes
    substations = [
        node['id'] for node in graph.get('nodes', [])
        if 'substation' in node['id'].lower() or node.get('kind') == 'substation'
    ]
    
    if not substations:
        # Fallback: use any power sector nodes
        substations = [
            node['id'] for node in graph.get('nodes', [])
            if node.get('sector') == 'power'
        ]
    
    if not substations:
        # Last resort: use first N nodes
        substations = [node['id'] for node in graph.get('nodes', [])[:10]]
    
    incidents = []
    for i in range(num_failures):
        initial_failure = random.choice(substations)
        incident_id = f"incident_power_failure_{i+1:03d}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        incidents.append({
            'id': incident_id,
            'type': 'power_instability',
            'initialFailure': initial_failure,
            'impacted_nodes': [initial_failure],
            'severity': random.choice(['low', 'medium', 'high']),
            'timestamp': datetime.now().isoformat()
        })
    
    return incidents


def generate_random_pump_failure(
    graph: Dict,
    num_failures: int = 1,
    seed: int = None
) -> List[Dict]:
    """Generate random pump failure scenarios."""
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)
    
    # Find all pump nodes
    pumps = [
        node['id'] for node in graph.get('nodes', [])
        if 'pump' in node['id'].lower() or node.get('kind') == 'pump'
    ]
    
    if not pumps:
        pumps = [
            node['id'] for node in graph.get('nodes', [])
            if node.get('sector') == 'water'
        ]
    
    if not pumps:
        pumps = [node['id'] for node in graph.get('nodes', [])[:10]]
    
    incidents = []
    for i in range(num_failures):
        initial_failure = random.choice(pumps)
        incident_id = f"incident_pump_failure_{i+1:03d}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        incidents.append({
            'id': incident_id,
            'type': 'flood',
            'initialFailure': initial_failure,
            'impacted_nodes': [initial_failure],
            'severity': random.choice(['low', 'medium', 'high']),
            'timestamp': datetime.now().isoformat()
        })
    
    return incidents


def generate_cascade_scenario(
    graph: Dict,
    initial_node: str,
    max_depth: int = 5,
    seed: int = None
) -> Dict:
    """
    Generate a cascade scenario starting from a given node.
    
    Args:
        graph: Dependency graph
        initial_node: Starting node ID
        max_depth: Maximum cascade depth
        seed: Random seed
    
    Returns:
        Incident dictionary with cascade timeline
    """
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)
    
    impacted_nodes = {initial_node}
    timeline = [{
        'timeSeconds': 0,
        'impactedNodeIds': [initial_node]
    }]
    
    # Build cascade through graph edges
    edges_by_source = {}
    for edge in graph.get('edges', []):
        source = edge.get('source')
        if source not in edges_by_source:
            edges_by_source[source] = []
        edges_by_source[source].append(edge)
    
    current_time = 0
    current_level = {initial_node}
    
    for depth in range(max_depth):
        next_level = set()
        
        for node in current_level:
            if node in edges_by_source:
                # Select random outgoing edge (or all if few)
                outgoing_edges = edges_by_source[node]
                if len(outgoing_edges) <= 3:
                    selected_edges = outgoing_edges
                else:
                    selected_edges = random.sample(outgoing_edges, min(3, len(outgoing_edges)))
                
                for edge in selected_edges:
                    target = edge.get('target')
                    if target not in impacted_nodes:
                        lag = edge.get('inferredLagSeconds', 60)
                        current_time += lag
                        next_level.add(target)
                        impacted_nodes.add(target)
        
        if next_level:
            timeline.append({
                'timeSeconds': current_time,
                'impactedNodeIds': list(next_level)
            })
            current_level = next_level
        else:
            break
    
    return {
        'id': f"incident_cascade_{initial_node}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        'type': 'cascade',
        'initialFailure': initial_node,
        'impacted_nodes': list(impacted_nodes),
        'timeline': timeline,
        'timestamp': datetime.now().isoformat()
    }


def generate_stress_test_suite(
    graph_path: Path,
    output_path: Path,
    num_scenarios: int = 100,
    seed: int = 42
) -> Dict:
    """
    Generate a comprehensive stress test suite.
    
    Args:
        graph_path: Path to graph JSON file
        output_path: Path to save scenarios
        num_scenarios: Number of scenarios to generate
        seed: Random seed
    
    Returns:
        Dictionary with scenarios and metadata
    """
    with open(graph_path, 'r') as f:
        graph = json.load(f)
    
    scenarios = []
    
    # Generate mix of failure types
    num_substation = num_scenarios // 3
    num_pump = num_scenarios // 3
    num_cascade = num_scenarios - num_substation - num_pump
    
    # Substation failures
    substation_incidents = generate_random_substation_failure(graph, num_substation, seed)
    scenarios.extend(substation_incidents)
    
    # Pump failures
    pump_incidents = generate_random_pump_failure(graph, num_pump, seed + 1000)
    scenarios.extend(pump_incidents)
    
    # Cascade scenarios
    all_nodes = [node['id'] for node in graph.get('nodes', [])]
    cascade_nodes = random.sample(all_nodes, min(num_cascade, len(all_nodes)))
    
    for i, node in enumerate(cascade_nodes):
        cascade_incident = generate_cascade_scenario(graph, node, max_depth=5, seed=seed + 2000 + i)
        scenarios.append(cascade_incident)
    
    suite = {
        'metadata': {
            'generated': datetime.now().isoformat(),
            'num_scenarios': len(scenarios),
            'seed': seed,
            'graph_path': str(graph_path)
        },
        'scenarios': scenarios
    }
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(suite, f, indent=2)
    
    return suite


if __name__ == "__main__":
    # Example usage
    script_dir = Path(__file__).parent
    graph_path = script_dir / "out" / "graph.json"
    output_path = script_dir / "out" / "synthetic_scenarios.json"
    
    if graph_path.exists():
        suite = generate_stress_test_suite(graph_path, output_path, num_scenarios=50)
        print(f"Generated {len(suite['scenarios'])} synthetic scenarios")
        print(f"Saved to {output_path}")
    else:
        print(f"Graph file not found: {graph_path}")
        print("Run engine pipeline first to generate graph.json")
