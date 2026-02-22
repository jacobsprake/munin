"""
Sovereign Chaos Simulator - Red-Team-as-a-Service
Systematic scenario testing across the full scenario space (single-origin, multi-fault, correlated failure modes).
Extends core incident simulation with comprehensive threat library.
"""
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional, Tuple
from enum import Enum


class ChaosScenarioType(Enum):
    """Comprehensive threat library for chaos simulation."""
    # Natural Disasters
    FLOOD_500_YEAR = "flood_500_year"
    FLOOD_1000_YEAR = "flood_1000_year"
    STORM_HURRICANE = "storm_hurricane"
    STORM_TORNADO = "storm_tornado"
    EARTHQUAKE_7_0 = "earthquake_7_0"
    EARTHQUAKE_8_0 = "earthquake_8_0"
    SOLAR_FLARE = "solar_flare"
    DROUGHT_EXTREME = "drought_extreme"
    
    # Cyber Attacks
    RANSOMWARE_GRID = "ransomware_grid"
    DDOS_SCADA = "ddos_scada"
    SUPPLY_CHAIN_COMPROMISE = "supply_chain_compromise"
    INSIDER_THREAT = "insider_threat"
    APT_LONG_TERM = "apt_long_term"
    
    # Infrastructure Failures
    SUBSTATION_LOSS_CRITICAL = "substation_loss_critical"
    SUBSTATION_LOSS_REGIONAL = "substation_loss_regional"
    DAM_BREACH = "dam_breach"
    PIPELINE_RUPTURE = "pipeline_rupture"
    PUMP_CASCADE_FAILURE = "pump_cascade_failure"
    GENERATOR_FUEL_SHORTAGE = "generator_fuel_shortage"
    
    # Cascading Failures
    POWER_WATER_CASCADE = "power_water_cascade"
    WATER_TELECOM_CASCADE = "water_telecom_cascade"
    MULTI_SECTOR_CASCADE = "multi_sector_cascade"
    
    # Economic/Logistics
    FUEL_SHORTAGE = "fuel_shortage"
    SUPPLY_CHAIN_DISRUPTION = "supply_chain_disruption"
    TRANSPORTATION_FAILURE = "transportation_failure"


class ImpactMetrics:
    """Impact metrics for chaos scenarios."""
    def __init__(
        self,
        lives_at_risk: int = 0,
        gdp_at_risk_millions: float = 0.0,
        time_to_recovery_hours: float = 0.0,
        critical_path_nodes: List[str] = None,
        sectors_affected: List[str] = None
    ):
        self.lives_at_risk = lives_at_risk
        self.gdp_at_risk_millions = gdp_at_risk_millions
        self.time_to_recovery_hours = time_to_recovery_hours
        self.critical_path_nodes = critical_path_nodes or []
        self.sectors_affected = sectors_affected or []


def generate_chaos_scenario(
    scenario_type: ChaosScenarioType,
    graph: Dict,
    start_time: datetime,
    severity: float = 1.0
) -> Dict:
    """Generate a chaos scenario with impact metrics."""
    nodes = graph['nodes']
    edges = graph['edges']
    
    # Select initial failure nodes based on scenario type
    initial_nodes = _select_initial_nodes(scenario_type, nodes, severity)
    
    # Simulate cascade
    timeline = _simulate_chaos_cascade(graph, initial_nodes, start_time, scenario_type, severity)
    
    # Calculate impact metrics
    impacted_node_ids = set()
    for event in timeline:
        impacted_node_ids.update(event['impactedNodeIds'])
    
    impacted_nodes = [n for n in nodes if n['id'] in impacted_node_ids]
    metrics = _calculate_impact_metrics(impacted_nodes, timeline, scenario_type)
    
    return {
        'id': f'chaos_{scenario_type.value}_{start_time.strftime("%Y%m%d_%H%M%S")}',
        'scenario_type': scenario_type.value,
        'title': _get_scenario_title(scenario_type),
        'type': _get_incident_type(scenario_type),
        'startTs': start_time.isoformat(),
        'severity': severity,
        'timeline': timeline,
        'impact_metrics': {
            'lives_at_risk': metrics.lives_at_risk,
            'gdp_at_risk_millions': metrics.gdp_at_risk_millions,
            'time_to_recovery_hours': metrics.time_to_recovery_hours,
            'critical_path_nodes': metrics.critical_path_nodes,
            'sectors_affected': metrics.sectors_affected,
            'total_nodes_impacted': len(impacted_node_ids)
        }
    }


def _select_initial_nodes(
    scenario_type: ChaosScenarioType,
    nodes: List[Dict],
    severity: float
) -> List[str]:
    """Select initial failure nodes based on scenario type."""
    node_ids = []
    
    if 'flood' in scenario_type.value:
        node_ids = [n['id'] for n in nodes if 'pump' in n['id'].lower() or 'reservoir' in n['id'].lower()]
        count = max(1, int(len(node_ids) * severity))
        return node_ids[:count]
    
    elif 'storm' in scenario_type.value or 'hurricane' in scenario_type.value:
        # Regional impact
        node_ids = [n['id'] for n in nodes if n.get('region') == 'Region 07']
        return node_ids[:max(1, int(len(node_ids) * severity))]
    
    elif 'earthquake' in scenario_type.value:
        # Geographic clustering
        node_ids = [n['id'] for n in nodes if n.get('lat') and n.get('lon')]
        return node_ids[:max(1, int(len(node_ids) * severity * 0.3))]
    
    elif 'ransomware' in scenario_type.value or 'cyber' in scenario_type.value:
        # Critical infrastructure
        node_ids = [n['id'] for n in nodes if 'substation' in n['id'].lower() or 'control' in n['id'].lower()]
        return node_ids[:max(1, int(len(node_ids) * severity * 0.5))]
    
    elif 'substation' in scenario_type.value:
        node_ids = [n['id'] for n in nodes if 'substation' in n['id'].lower()]
        return node_ids[:max(1, int(len(node_ids) * severity))]
    
    elif 'dam' in scenario_type.value:
        node_ids = [n['id'] for n in nodes if 'dam' in n['id'].lower() or 'reservoir' in n['id'].lower()]
        return node_ids[:1]
    
    elif 'pump' in scenario_type.value:
        node_ids = [n['id'] for n in nodes if 'pump' in n['id'].lower()]
        count = max(2, int(len(node_ids) * severity * 0.4))
        return node_ids[:count]
    
    elif 'fuel' in scenario_type.value:
        node_ids = [n['id'] for n in nodes if 'generator' in n['id'].lower() or 'fuel' in n['id'].lower()]
        return node_ids[:max(1, int(len(node_ids) * severity))]
    
    else:
        # Default: random critical nodes
        critical = [n['id'] for n in nodes if n.get('sector') in ['power', 'water']]
        return critical[:max(1, int(len(critical) * severity))]


def _simulate_chaos_cascade(
    graph: Dict,
    initial_nodes: List[str],
    start_time: datetime,
    scenario_type: ChaosScenarioType,
    severity: float
) -> List[Dict]:
    """Simulate cascade with scenario-specific parameters."""
    timeline = []
    impacted = set(initial_nodes)
    current_time = start_time
    
    # Scenario-specific cascade delay
    cascade_delay = _get_cascade_delay(scenario_type)
    
    # First impact
    timeline.append({
        'ts': current_time.isoformat(),
        'impactedNodeIds': list(impacted),
        'confidence': 0.95,
        'event_type': 'initial_failure'
    })
    
    edges = graph['edges']
    max_iterations = 15 if severity > 0.7 else 10
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        current_time += timedelta(minutes=cascade_delay)
        
        new_impacted = set()
        for edge in edges:
            if edge['source'] in impacted and edge['target'] not in impacted:
                confidence = edge['confidenceScore'] * (0.9 ** iteration) * severity
                if confidence > 0.25:
                    new_impacted.add(edge['target'])
        
        if not new_impacted:
            break
        
        impacted.update(new_impacted)
        
        avg_confidence = sum(e['confidenceScore'] for e in edges 
                            if e['target'] in new_impacted) / max(len(new_impacted), 1)
        cascade_confidence = avg_confidence * (0.85 ** iteration) * severity
        
        timeline.append({
            'ts': current_time.isoformat(),
            'impactedNodeIds': list(new_impacted),
            'confidence': max(0.25, cascade_confidence),
            'event_type': 'cascade_propagation',
            'iteration': iteration
        })
    
    return timeline


def _get_cascade_delay(scenario_type: ChaosScenarioType) -> int:
    """Get cascade delay in minutes based on scenario type."""
    if 'cyber' in scenario_type.value or 'ransomware' in scenario_type.value:
        return 1  # Fast propagation
    elif 'earthquake' in scenario_type.value:
        return 2  # Very fast
    elif 'substation' in scenario_type.value or 'power' in scenario_type.value:
        return 3  # Fast
    elif 'flood' in scenario_type.value:
        return 5  # Medium
    elif 'drought' in scenario_type.value:
        return 60  # Slow
    else:
        return 5  # Default


def _calculate_impact_metrics(
    impacted_nodes: List[Dict],
    timeline: List[Dict],
    scenario_type: ChaosScenarioType
) -> ImpactMetrics:
    """Calculate impact metrics from scenario."""
    sectors = set()
    critical_nodes = []
    
    for node in impacted_nodes:
        if node.get('sector'):
            sectors.add(node['sector'])
        if node.get('health', {}).get('status') == 'critical' or 'hospital' in node.get('label', '').lower():
            critical_nodes.append(node['id'])
    
    # Estimate lives at risk (hospitals, emergency services)
    lives_at_risk = sum(1 for n in impacted_nodes if 'hospital' in n.get('label', '').lower() or 'emergency' in n.get('label', '').lower()) * 100
    
    # Estimate GDP at risk (rough calculation)
    gdp_at_risk = len(impacted_nodes) * 0.5  # $0.5M per node affected
    
    # Estimate recovery time (based on scenario type and nodes affected)
    recovery_hours = _estimate_recovery_time(scenario_type, len(impacted_nodes))
    
    return ImpactMetrics(
        lives_at_risk=lives_at_risk,
        gdp_at_risk_millions=gdp_at_risk,
        time_to_recovery_hours=recovery_hours,
        critical_path_nodes=critical_nodes[:10],  # Top 10 critical
        sectors_affected=list(sectors)
    )


def _estimate_recovery_time(scenario_type: ChaosScenarioType, nodes_affected: int) -> float:
    """Estimate recovery time in hours."""
    base_hours = {
        'cyber': 24.0,
        'ransomware': 48.0,
        'earthquake': 72.0,
        'flood': 36.0,
        'substation': 12.0,
        'dam': 168.0,  # 1 week
        'drought': 720.0,  # 1 month
    }
    
    scenario_str = scenario_type.value
    base = 24.0
    for key, hours in base_hours.items():
        if key in scenario_str:
            base = hours
            break
    
    # Scale with number of nodes
    return base * (1 + nodes_affected / 100)


def _get_scenario_title(scenario_type: ChaosScenarioType) -> str:
    """Get human-readable scenario title."""
    titles = {
        ChaosScenarioType.FLOOD_500_YEAR: "500-Year Flood Event",
        ChaosScenarioType.FLOOD_1000_YEAR: "1000-Year Flood Event",
        ChaosScenarioType.STORM_HURRICANE: "Hurricane Force Storm",
        ChaosScenarioType.EARTHQUAKE_7_0: "7.0 Magnitude Earthquake",
        ChaosScenarioType.EARTHQUAKE_8_0: "8.0 Magnitude Earthquake",
        ChaosScenarioType.RANSOMWARE_GRID: "Ransomware Attack on Grid",
        ChaosScenarioType.DDOS_SCADA: "DDoS Attack on SCADA Systems",
        ChaosScenarioType.SUBSTATION_LOSS_CRITICAL: "Critical Substation Loss",
        ChaosScenarioType.DAM_BREACH: "Dam Breach Event",
        ChaosScenarioType.PUMP_CASCADE_FAILURE: "Cascade Pump Failure",
    }
    return titles.get(scenario_type, scenario_type.value.replace('_', ' ').title())


def _get_incident_type(scenario_type: ChaosScenarioType) -> str:
    """Map scenario type to incident type."""
    if 'flood' in scenario_type.value:
        return 'flood'
    elif 'storm' in scenario_type.value or 'hurricane' in scenario_type.value:
        return 'storm'
    elif 'earthquake' in scenario_type.value:
        return 'earthquake'
    elif 'cyber' in scenario_type.value or 'ransomware' in scenario_type.value or 'ddos' in scenario_type.value:
        return 'cyber_attack'
    elif 'substation' in scenario_type.value or 'power' in scenario_type.value:
        return 'power_instability'
    elif 'drought' in scenario_type.value:
        return 'drought'
    else:
        return 'infrastructure_failure'


def generate_all_chaos_scenarios(
    graph_path: Path,
    output_path: Path,
    start_time: Optional[datetime] = None
) -> List[Dict]:
    """Generate all chaos scenarios for comprehensive testing."""
    with open(graph_path, 'r') as f:
        graph = json.load(f)
    
    if start_time is None:
        start_time = datetime.now()
    
    scenarios = []
    
    # Generate scenarios for each type
    for scenario_type in ChaosScenarioType:
        # Generate at different severity levels
        for severity in [0.5, 0.7, 1.0]:
            scenario = generate_chaos_scenario(
                scenario_type,
                graph,
                start_time + timedelta(minutes=len(scenarios) * 5),
                severity
            )
            scenarios.append(scenario)
    
    scenarios_data = {
        'scenarios': scenarios,
        'generated_at': datetime.now().isoformat(),
        'total_scenarios': len(scenarios)
    }
    
    with open(output_path, 'w') as f:
        json.dump(scenarios_data, f, indent=2)
    
    print(f"Generated {len(scenarios)} chaos scenarios to {output_path}")
    return scenarios


if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    graph_path = out_dir / "graph.json"
    output_path = out_dir / "chaos_scenarios.json"
    
    generate_all_chaos_scenarios(graph_path, output_path)
