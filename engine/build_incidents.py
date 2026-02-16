"""Build incident simulations with cascading failure timelines."""
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional
from cmi_prioritization import CMIPrioritizationEngine, EmergencyLevel, AssetPriority

def simulate_cascade(
    graph: Dict,
    initial_node_ids: List[str],
    start_time: datetime,
    cascade_delay_minutes: int = 5,
    cmi_engine: Optional[CMIPrioritizationEngine] = None,
    emergency_level: EmergencyLevel = EmergencyLevel.PEACETIME
) -> List[Dict]:
    """
    Simulate cascading failures from initial nodes.
    
    If CMI engine provided, respects emergency levels and asset priorities:
    - Tier 1 (CRITICAL_LIFE_SUPPORT, MILITARY_ESSENTIAL): Preserved, cascade blocked
    - Tier 2 (CRITICAL_INFRASTRUCTURE, ESSENTIAL_SERVICES): Maintained, cascade slowed
    - Tier 3 (COMMERCIAL, INDUSTRIAL_NON_ESSENTIAL): Shed, cascade allowed
    """
    timeline = []
    impacted = set(initial_node_ids)
    current_time = start_time
    
    # Set emergency level if CMI engine provided
    if cmi_engine:
        cmi_engine.current_emergency_level = emergency_level
    
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
                target_node_id = edge['target']
                
                # Check CMI prioritization if engine provided
                if cmi_engine:
                    try:
                        prioritization = cmi_engine.prioritize_asset(target_node_id)
                        
                        # Block cascade to Tier 1 assets (life-support, military)
                        if prioritization.should_preserve and \
                           prioritization.adjusted_priority in [AssetPriority.CRITICAL_LIFE_SUPPORT, AssetPriority.MILITARY_ESSENTIAL]:
                            continue  # Skip - preserve this asset
                        
                        # Slow cascade to Tier 2 assets (critical infrastructure)
                        if prioritization.should_preserve and \
                           prioritization.adjusted_priority == AssetPriority.CRITICAL_INFRASTRUCTURE:
                            # Reduce confidence significantly
                            confidence = edge['confidenceScore'] * (0.5 ** iteration)
                        else:
                            # Normal cascade for Tier 3 (sheddable assets)
                            confidence = edge['confidenceScore'] * (0.9 ** iteration)
                    except ValueError:
                        # Asset not classified, use default behavior
                        confidence = edge['confidenceScore'] * (0.9 ** iteration)
                else:
                    # No CMI - default behavior
                    confidence = edge['confidenceScore'] * (0.9 ** iteration)
                
                if confidence > 0.3:  # Only cascade if confidence is reasonable
                    new_impacted.add(target_node_id)
        
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

def build_incidents(
    graph_path: Path,
    output_path: Path,
    emergency_level: EmergencyLevel = EmergencyLevel.PEACETIME,
    use_cmi: bool = True
):
    """
    Build incident definitions with simulated cascades.
    
    Args:
        graph_path: Path to dependency graph JSON
        output_path: Path to save incidents JSON
        emergency_level: Current emergency level for CMI prioritization
        use_cmi: Whether to apply CMI prioritization to cascades
    """
    with open(graph_path, 'r') as f:
        graph = json.load(f)
    
    nodes = graph['nodes']
    incidents = []
    
    # Initialize CMI engine if requested
    cmi_engine = None
    if use_cmi:
        cmi_engine = CMIPrioritizationEngine()
        cmi_engine.current_emergency_level = emergency_level
        
        # Classify all nodes
        for node in nodes:
            node_id = node['id']
            sector = node.get('sector', 'other')
            kind = node.get('kind', 'service')
            
            # Heuristic classification
            is_life_support = 'hospital' in node_id.lower() or 'emergency' in node_id.lower()
            is_military = 'military' in node_id.lower() or 'defense' in node_id.lower()
            is_critical = sector in ['power', 'water'] and kind in ['substation', 'pump', 'reservoir']
            serves_hospitals = 'hospital' in node_id.lower()
            serves_military = 'military' in node_id.lower() or 'base' in node_id.lower()
            serves_residential = 'residential' in node_id.lower() or 'residential' in sector
            serves_commercial = 'commercial' in node_id.lower() or 'commercial' in sector
            
            cmi_engine.classify_asset(
                asset_id=node_id,
                sector=sector,
                asset_type=kind,
                is_life_support=is_life_support,
                is_military=is_military,
                is_critical_infrastructure=is_critical,
                serves_hospitals=serves_hospitals,
                serves_military_bases=serves_military,
                serves_residential=serves_residential,
                serves_commercial=serves_commercial
            )
    
    # Flood Event
    flood_nodes = [n['id'] for n in nodes if 'pump' in n['id'].lower() or 'reservoir' in n['id'].lower()][:2]
    flood_start = datetime(2026, 1, 1, 0, 0, 0)
    flood_timeline = simulate_cascade(
        graph, flood_nodes, flood_start,
        cmi_engine=cmi_engine,
        emergency_level=emergency_level
    )
    
    incidents.append({
        'id': 'incident_flood_20260101',
        'title': 'Flood Event - Regional Water Infrastructure',
        'type': 'flood',
        'startTs': flood_start.isoformat(),
        'timeline': flood_timeline
    })
    
    # Power Instability
    power_nodes = [n['id'] for n in nodes if 'substation' in n['id'].lower()][:1]
    power_start = datetime(2026, 1, 1, 2, 0, 0)
    power_timeline = simulate_cascade(
        graph, power_nodes, power_start,
        cascade_delay_minutes=3,
        cmi_engine=cmi_engine,
        emergency_level=emergency_level
    )
    
    incidents.append({
        'id': 'incident_power_20260101',
        'title': 'Power Frequency Instability - North Grid',
        'type': 'power_instability',
        'startTs': power_start.isoformat(),
        'timeline': power_timeline
    })
    
    # Drought Event
    drought_nodes = [n['id'] for n in nodes if 'reservoir' in n['id'].lower()][:1]
    drought_start = datetime(2026, 1, 1, 4, 0, 0)
    drought_timeline = simulate_cascade(
        graph, drought_nodes, drought_start,
        cascade_delay_minutes=10,
        cmi_engine=cmi_engine,
        emergency_level=emergency_level
    )
    
    incidents.append({
        'id': 'incident_drought_20260101',
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

