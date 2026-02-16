"""
Power domain-specific heuristics for grid stability, frequency, voltage, and N-1 contingencies.
"""
from typing import Dict, List, Optional


class PowerDomainHandler:
    """Handler for power domain-specific logic."""
    
    def __init__(self):
        self.domain = "power"
        self.subsectors = ["generation", "transmission", "distribution", "substations"]
    
    def classify_incident_type(
        self,
        node_id: str,
        voltage: Optional[float] = None,
        frequency: Optional[float] = None,
        status: Optional[str] = None
    ) -> Optional[str]:
        """Classify power incident type."""
        node_lower = node_id.lower()
        
        if frequency is not None:
            if frequency < 49.5 or frequency > 50.5:
                return "frequency_instability"
        if voltage is not None:
            if voltage < 0.9 or voltage > 1.1:
                return "voltage_instability"
        if status == "offline" or status == "tripped":
            if 'substation' in node_lower:
                return "substation_outage"
            elif 'line' in node_lower:
                return "line_trip"
        
        return None
    
    def compute_damage_cost(
        self,
        incident_type: str,
        affected_nodes: List[str],
        duration_hours: float,
        load_shed_mw: Optional[float] = None
    ) -> Dict[str, float]:
        """Compute domain-specific damage costs."""
        # Economic cost per MWh of load shed
        cost_per_mwh = 100.0
        
        if load_shed_mw:
            economic_cost = load_shed_mw * duration_hours * cost_per_mwh
        else:
            # Estimate based on node count
            base_cost_per_node = 5000.0
            economic_cost = base_cost_per_node * len(affected_nodes) * duration_hours
        
        return {
            'economic': economic_cost,
            'social': economic_cost * 0.3,  # Disruption to businesses/homes
            'environmental': economic_cost * 0.05  # Backup generation emissions
        }
    
    def check_n_minus_1_contingency(
        self,
        graph: Dict,
        failed_node: str
    ) -> bool:
        """Check if system can handle N-1 contingency (single component failure)."""
        # Simplified: check if removing this node creates isolated components
        nodes = {n['id'] for n in graph.get('nodes', [])}
        edges = graph.get('edges', [])
        
        # Find nodes connected to failed node
        connected = {failed_node}
        for edge in edges:
            if edge['source'] == failed_node:
                connected.add(edge['target'])
            elif edge['target'] == failed_node:
                connected.add(edge['source'])
        
        # Check if any nodes become isolated
        remaining = nodes - {failed_node}
        if len(remaining) == 0:
            return False
        
        # Check connectivity of remaining nodes
        remaining_edges = [e for e in edges 
                          if e['source'] != failed_node and e['target'] != failed_node]
        
        # Simple check: if we have fewer edges than nodes-1, some nodes are isolated
        if len(remaining_edges) < len(remaining) - 1:
            return False
        
        return True
    
    def get_playbook_recommendations(self, incident_type: str) -> List[str]:
        """Get recommended playbooks for power incidents."""
        playbook_map = {
            "frequency_instability": ["frequency_response", "load_shedding"],
            "voltage_instability": ["voltage_control", "reactive_power"],
            "substation_outage": ["substation_restoration", "load_transfer"],
            "line_trip": ["line_restoration", "rerouting"]
        }
        return playbook_map.get(incident_type, ["generic_power_incident"])
