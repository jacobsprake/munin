"""
Water domain-specific heuristics for floods, droughts, and water infrastructure.
"""
from typing import Dict, List, Optional
from datetime import datetime


class WaterDomainHandler:
    """Handler for water domain-specific logic."""
    
    def __init__(self):
        self.domain = "water"
        self.subsectors = ["reservoirs", "pumps", "treatment", "distribution"]
    
    def classify_incident_type(self, node_id: str, value: float, threshold: float) -> Optional[str]:
        """Classify water incident type based on node and value."""
        node_lower = node_id.lower()
        
        if 'reservoir' in node_lower or 'level' in node_lower:
            if value > threshold * 1.5:
                return "flood"
            elif value < threshold * 0.3:
                return "drought"
        elif 'pump' in node_lower:
            if value == 0:
                return "pump_failure"
        elif 'treatment' in node_lower:
            if value < threshold * 0.8:
                return "treatment_degradation"
        
        return None
    
    def compute_damage_cost(
        self,
        incident_type: str,
        affected_nodes: List[str],
        duration_hours: float
    ) -> Dict[str, float]:
        """Compute domain-specific damage costs."""
        base_costs = {
            "flood": 10000.0,  # per hour per node
            "drought": 5000.0,
            "pump_failure": 2000.0,
            "treatment_degradation": 15000.0  # public health risk
        }
        
        base_cost = base_costs.get(incident_type, 1000.0)
        total_cost = base_cost * len(affected_nodes) * duration_hours
        
        return {
            'economic': total_cost * 0.7,
            'social': total_cost * 0.2,  # Disruption to communities
            'environmental': total_cost * 0.1  # Water quality impacts
        }
    
    def get_playbook_recommendations(self, incident_type: str) -> List[str]:
        """Get recommended playbooks for water incidents."""
        playbook_map = {
            "flood": ["flood_event_pump_isolation", "reservoir_level_management"],
            "drought": ["drought_management", "water_conservation"],
            "pump_failure": ["pump_station_failure_response"],
            "treatment_degradation": ["water_quality_incident"]
        }
        return playbook_map.get(incident_type, ["generic_water_incident"])
