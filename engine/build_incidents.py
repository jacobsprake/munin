"""Build incident simulations with cascading failure timelines."""
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Set

def simulate_cascade(
    graph: Dict,
    initial_node_ids: List[str],
    start_time: datetime,
    cascade_delay_minutes: int = 5
) -> List[Dict]:
    """Simulate cascading failures from initial nodes."""
    timeline = []
    impacted = set(initial_node_ids)
    current_time = start_time
    
    # First impact
    timeline.append({
        'ts': current_time.isoformat(),
        'impactedNodeIds': list(impacted),
        'confidence': 0.95
    })
    
    # Simulate cascade through edges
    edges = graph['edges']
    max_iterations = 10
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        current_time += timedelta(minutes=cascade_delay_minutes)
        
        # Find nodes that depend on currently impacted nodes
        new_impacted = set()
        for edge in edges:
            if edge['source'] in impacted and edge['target'] not in impacted:
                # Confidence decreases with each hop
                confidence = edge['confidenceScore'] * (0.9 ** iteration)
                if confidence > 0.3:  # Only cascade if confidence is reasonable
                    new_impacted.add(edge['target'])
        
        if not new_impacted:
            break
        
        impacted.update(new_impacted)
        
        # Confidence decreases over time/distance
        avg_confidence = sum(e['confidenceScore'] for e in edges 
                            if e['target'] in new_impacted) / max(len(new_impacted), 1)
        cascade_confidence = avg_confidence * (0.85 ** iteration)
        
        timeline.append({
            'ts': current_time.isoformat(),
            'impactedNodeIds': list(new_impacted),
            'confidence': max(0.3, cascade_confidence)
        })
    
    return timeline

def build_incidents(graph_path: Path, output_path: Path):
    """Build incident definitions with simulated cascades."""
    with open(graph_path, 'r') as f:
        graph = json.load(f)
    
    nodes = graph['nodes']
    incidents = []
    
    # Flood Event
    flood_nodes = [n['id'] for n in nodes if 'pump' in n['id'].lower() or 'reservoir' in n['id'].lower()][:2]
    flood_start = datetime(2024, 1, 1, 0, 0, 0)
    flood_timeline = simulate_cascade(graph, flood_nodes, flood_start)
    
    incidents.append({
        'id': 'incident_flood_20240101',
        'title': 'Flood Event - Regional Water Infrastructure',
        'type': 'flood',
        'startTs': flood_start.isoformat(),
        'timeline': flood_timeline
    })
    
    # Power Instability
    power_nodes = [n['id'] for n in nodes if 'substation' in n['id'].lower()][:1]
    power_start = datetime(2024, 1, 1, 2, 0, 0)
    power_timeline = simulate_cascade(graph, power_nodes, power_start, cascade_delay_minutes=3)
    
    incidents.append({
        'id': 'incident_power_20240101',
        'title': 'Power Frequency Instability - North Grid',
        'type': 'power_instability',
        'startTs': power_start.isoformat(),
        'timeline': power_timeline
    })
    
    # Drought Event
    drought_nodes = [n['id'] for n in nodes if 'reservoir' in n['id'].lower()][:1]
    drought_start = datetime(2024, 1, 1, 4, 0, 0)
    drought_timeline = simulate_cascade(graph, drought_nodes, drought_start, cascade_delay_minutes=10)
    
    incidents.append({
        'id': 'incident_drought_20240101',
        'title': 'Drought Conditions - Reservoir Alpha',
        'type': 'drought',
        'startTs': drought_start.isoformat(),
        'timeline': drought_timeline
    })
    
    incidents_data = {
        'incidents': incidents
    }
    
    with open(output_path, 'w') as f:
        json.dump(incidents_data, f, indent=2)
    
    print(f"Incidents saved to {output_path}: {len(incidents)} incidents")

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    graph_path = out_dir / "graph.json"
    output_path = out_dir / "incidents.json"
    
    build_incidents(graph_path, output_path)

