"""
Transport domain-specific heuristics for traffic, network disruptions, and infrastructure.
"""
from typing import Dict, List, Optional


class TransportDomainHandler:
    """Handler for transport domain-specific logic."""
    
    def __init__(self):
        self.domain = "transport"
        self.subsectors = ["roads", "rail", "airports", "ports", "traffic"]
    
    def classify_incident_type(
        self,
        node_id: str,
        traffic_volume: Optional[float] = None,
        speed: Optional[float] = None,
        status: Optional[str] = None
    ) -> Optional[str]:
        """Classify transport incident type."""
        node_lower = node_id.lower()
        
        if 'traffic' in node_lower or 'road' in node_lower:
            if speed is not None and speed < 10:
                return "traffic_gridlock"
            if traffic_volume is not None and traffic_volume > 0.9:
                return "congestion"
        if status == "closed" or status == "blocked":
            if 'bridge' in node_lower:
                return "bridge_closure"
            elif 'tunnel' in node_lower:
                return "tunnel_closure"
            elif 'road' in node_lower:
                return "road_closure"
        
        return None
    
    def compute_damage_cost(
        self,
        incident_type: str,
        affected_nodes: List[str],
        duration_hours: float,
        vehicles_per_hour: Optional[float] = None
    ) -> Dict[str, float]:
        """Compute domain-specific damage costs."""
        # Cost per vehicle-hour of delay
        cost_per_vehicle_hour = 25.0
        
        if vehicles_per_hour:
            economic_cost = vehicles_per_hour * duration_hours * cost_per_vehicle_hour
        else:
            # Estimate based on node type
            base_cost_per_node = 2000.0
            economic_cost = base_cost_per_node * len(affected_nodes) * duration_hours
        
        return {
            'economic': economic_cost,
            'social': economic_cost * 0.4,  # Time lost, frustration
            'environmental': economic_cost * 0.1  # Additional emissions from delays
        }
    
    def get_playbook_recommendations(self, incident_type: str) -> List[str]:
        """Get recommended playbooks for transport incidents."""
        playbook_map = {
            "traffic_gridlock": ["traffic_management", "diversion"],
            "congestion": ["traffic_flow_optimization"],
            "bridge_closure": ["bridge_closure_response", "alternative_routes"],
            "tunnel_closure": ["tunnel_closure_response", "rerouting"],
            "road_closure": ["road_closure_management"]
        }
        return playbook_map.get(incident_type, ["generic_transport_incident"])
