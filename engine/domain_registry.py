"""
Domain registry for multi-domain support.

Maps domains to handlers, cost models, and playbooks.
"""
from typing import Dict, List, Optional, Type
try:
    from engine.domains.water import WaterDomainHandler
    from engine.domains.power import PowerDomainHandler
    from engine.domains.transport import TransportDomainHandler
except ImportError:
    from domains.water import WaterDomainHandler
    from domains.power import PowerDomainHandler
    from domains.transport import TransportDomainHandler


class DomainRegistry:
    """Registry for domain-specific handlers."""
    
    def __init__(self):
        self._handlers: Dict[str, any] = {}
        self._register_default_domains()
    
    def _register_default_domains(self):
        """Register default domain handlers."""
        self.register("water", WaterDomainHandler())
        self.register("power", PowerDomainHandler())
        self.register("transport", TransportDomainHandler())
    
    def register(self, domain: str, handler: any):
        """Register a domain handler."""
        self._handlers[domain] = handler
    
    def get_handler(self, domain: str) -> Optional[any]:
        """Get handler for a domain."""
        return self._handlers.get(domain)
    
    def list_domains(self) -> List[str]:
        """List all registered domains."""
        return list(self._handlers.keys())
    
    def classify_node_domain(self, node_id: str, sector: Optional[str] = None) -> str:
        """Classify node into domain based on ID and sector."""
        if sector:
            sector_lower = sector.lower()
            if sector_lower in ['water', 'power', 'transport', 'comms', 'emergency']:
                return sector_lower
        
        node_lower = node_id.lower()
        
        # Heuristic classification
        if any(keyword in node_lower for keyword in ['pump', 'reservoir', 'water', 'treatment']):
            return "water"
        elif any(keyword in node_lower for keyword in ['substation', 'power', 'grid', 'voltage', 'frequency']):
            return "power"
        elif any(keyword in node_lower for keyword in ['traffic', 'road', 'bridge', 'tunnel', 'rail']):
            return "transport"
        elif any(keyword in node_lower for keyword in ['tower', 'comms', 'network']):
            return "comms"
        elif any(keyword in node_lower for keyword in ['emergency', 'hospital', 'fire']):
            return "emergency"
        
        return "other"


# Global registry instance
default_registry = DomainRegistry()
