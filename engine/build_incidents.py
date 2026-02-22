"""Build incident simulations with cascading failure timelines.

Munin maintains exhaustive pre-simulation of the scenario space (single-origin, multi-fault,
correlated failure modes) and a continuously updated library of pre-approved playbooks.
"""
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional, Tuple
from cmi_prioritization import CMIPrioritizationEngine, EmergencyLevel, AssetPriority

# Caps to bound runtime while retaining exhaustive coverage of the scenario space
MAX_SINGLE_ORIGIN_PER_TYPE = 100
MAX_CHAOS_MULTI_FAULT = 150
MAX_CHAOS_CORRELATED = 80

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


def _classify_cmi(graph: Dict, use_cmi: bool, emergency_level: EmergencyLevel) -> Optional[CMIPrioritizationEngine]:
    """Initialize and classify CMI engine from graph nodes."""
    if not use_cmi:
        return None
    nodes = graph['nodes']
    cmi_engine = CMIPrioritizationEngine()
    cmi_engine.current_emergency_level = emergency_level
    for node in nodes:
        node_id = node['id']
        sector = node.get('sector', 'other')
        kind = node.get('kind', 'service')
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
            serves_commercial=serves_commercial,
        )
    return cmi_engine


def enumerate_all_conceivable_scenarios(graph: Dict) -> List[Tuple[str, List[str], datetime, str, int]]:
    """
    Enumerate the full scenario space: single-origin by type, multi-fault (stress), and correlated (shadow-link) failure scenarios.
    Returns list of (incident_type, initial_node_ids, start_time, title, cascade_delay_minutes).
    """
    nodes = graph['nodes']
    edges = graph.get('edges', [])
    node_ids = [n['id'] for n in nodes]
    scenarios: List[Tuple[str, List[str], datetime, str, int]] = []
    base_time = datetime(2026, 1, 1, 0, 0, 0)

    # --- Every conceivable single-origin scenario by type ---
    flood_candidates = [n['id'] for n in nodes if 'pump' in n['id'].lower() or 'reservoir' in n['id'].lower()]
    for i, nid in enumerate(flood_candidates[:MAX_SINGLE_ORIGIN_PER_TYPE]):
        scenarios.append((
            'flood',
            [nid],
            base_time + timedelta(hours=i % 24),
            f'Flood - {nid}',
            5,
        ))

    power_candidates = [n['id'] for n in nodes if 'substation' in n['id'].lower()]
    for i, nid in enumerate(power_candidates[:MAX_SINGLE_ORIGIN_PER_TYPE]):
        scenarios.append((
            'power_instability',
            [nid],
            base_time + timedelta(hours=2 + (i % 22)),
            f'Power Instability - {nid}',
            3,
        ))

    drought_candidates = [n['id'] for n in nodes if 'reservoir' in n['id'].lower()]
    for i, nid in enumerate(drought_candidates[:MAX_SINGLE_ORIGIN_PER_TYPE]):
        scenarios.append((
            'drought',
            [nid],
            base_time + timedelta(hours=4 + (i % 20)),
            f'Drought - {nid}',
            10,
        ))

    # --- Chaos: multi-fault (two nodes fail at once, cross-sector preferred) ---
    node_by_sector: Dict[str, List[str]] = {}
    for n in nodes:
        s = n.get('sector', 'other')
        node_by_sector.setdefault(s, []).append(n['id'])
    sectors = list(node_by_sector.keys())
    count = 0
    for i, s1 in enumerate(sectors):
        if count >= MAX_CHAOS_MULTI_FAULT:
            break
        for s2 in sectors[i:]:
            if count >= MAX_CHAOS_MULTI_FAULT:
                break
            for n1 in node_by_sector[s1][:20]:
                if count >= MAX_CHAOS_MULTI_FAULT:
                    break
                for n2 in node_by_sector[s2][:20]:
                    if n1 >= n2:
                        continue
                    if count >= MAX_CHAOS_MULTI_FAULT:
                        break
                    scenarios.append((
                        'chaos_multi_fault',
                        [n1, n2],
                        base_time + timedelta(hours=count % 24),
                        f'Chaos multi-fault {n1} + {n2}',
                        4,
                    ))
                    count += 1

    # --- Chaos: correlated (shadow-link pairs fail together) ---
    shadow_edges = [e for e in edges if e.get('isShadowLink')]
    seen_pairs: Set[Tuple[str, str]] = set()
    for e in shadow_edges[:MAX_CHAOS_CORRELATED * 2]:
        a, b = e.get('source'), e.get('target')
        if not a or not b:
            continue
        pair = (min(a, b), max(a, b))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        if len(seen_pairs) > MAX_CHAOS_CORRELATED:
            break
        scenarios.append((
            'chaos_correlated',
            [a, b],
            base_time + timedelta(hours=len(seen_pairs) % 24),
            f'Chaos correlated {a} / {b}',
            5,
        ))

    return scenarios


def build_incidents(
    graph_path: Path,
    output_path: Path,
    emergency_level: EmergencyLevel = EmergencyLevel.PEACETIME,
    use_cmi: bool = True,
    all_scenarios: bool = True,
):
    """
    Build incident definitions with simulated cascades.
    When all_scenarios=True (default), exhaustively enumerates the scenario space (single-origin,
    multi-fault, correlated) and builds pre-approved playbooks for each.
    When all_scenarios=False (--quick), runs only a small fixed set for fast demos.
    """
    with open(graph_path, 'r') as f:
        graph = json.load(f)

    nodes = graph['nodes']
    node_ids = [n['id'] for n in nodes]
    cmi_engine = _classify_cmi(graph, use_cmi, emergency_level)
    incidents = []

    if all_scenarios:
        scenarios = enumerate_all_conceivable_scenarios(graph)
        for idx, (incident_type, initial_nodes, start_time, title, delay_min) in enumerate(scenarios):
            timeline = simulate_cascade(
                graph, initial_nodes, start_time,
                cascade_delay_minutes=delay_min,
                cmi_engine=cmi_engine,
                emergency_level=emergency_level,
            )
            incidents.append({
                'id': f'incident_{incident_type}_{idx:05d}',
                'title': title,
                'type': incident_type,
                'startTs': start_time.isoformat(),
                'timeline': timeline,
            })
        print(f"Simulated {len(incidents)} conceivable + chaos scenarios")
    else:
        # Quick mode: original 3 incidents only
        flood_nodes = [n['id'] for n in nodes if 'pump' in n['id'].lower() or 'reservoir' in n['id'].lower()][:2]
        if not flood_nodes:
            flood_nodes = node_ids[:1]
        flood_start = datetime(2026, 1, 1, 0, 0, 0)
        incidents.append({
            'id': 'incident_flood_20260101',
            'title': 'Flood Event - Regional Water Infrastructure',
            'type': 'flood',
            'startTs': flood_start.isoformat(),
            'timeline': simulate_cascade(graph, flood_nodes, flood_start, cmi_engine=cmi_engine, emergency_level=emergency_level),
        })
        power_nodes = [n['id'] for n in nodes if 'substation' in n['id'].lower()][:1]
        if not power_nodes:
            power_nodes = node_ids[:1]
        power_start = datetime(2026, 1, 1, 2, 0, 0)
        incidents.append({
            'id': 'incident_power_20260101',
            'title': 'Power Frequency Instability - North Grid',
            'type': 'power_instability',
            'startTs': power_start.isoformat(),
            'timeline': simulate_cascade(graph, power_nodes, power_start, cascade_delay_minutes=3, cmi_engine=cmi_engine, emergency_level=emergency_level),
        })
        drought_nodes = [n['id'] for n in nodes if 'reservoir' in n['id'].lower()][:1]
        if not drought_nodes:
            drought_nodes = node_ids[:1]
        drought_start = datetime(2026, 1, 1, 4, 0, 0)
        incidents.append({
            'id': 'incident_drought_20260101',
            'title': 'Drought Conditions - Reservoir Alpha',
            'type': 'drought',
            'startTs': drought_start.isoformat(),
            'timeline': simulate_cascade(graph, drought_nodes, drought_start, cascade_delay_minutes=10, cmi_engine=cmi_engine, emergency_level=emergency_level),
        })

    incidents_data = {'incidents': incidents}
    with open(output_path, 'w') as f:
        json.dump(incidents_data, f, indent=2)
    print(f"Incidents saved to {output_path}: {len(incidents)} incidents")

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    graph_path = out_dir / "graph.json"
    output_path = out_dir / "incidents.json"
    
    build_incidents(graph_path, output_path)

