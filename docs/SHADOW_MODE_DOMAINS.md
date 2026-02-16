# Shadow Mode Domain Extension Points

Documentation for extending shadow mode to support multiple infrastructure domains.

## Domain Architecture

Shadow mode uses a **domain registry** pattern to support multiple infrastructure domains:

- **Water**: Reservoirs, pumps, treatment, distribution
- **Power**: Generation, transmission, distribution, substations
- **Transport**: Roads, rail, airports, ports, traffic
- **Comms**: Network infrastructure, towers
- **Emergency**: Hospitals, emergency services

## Domain Handler Interface

Each domain implements a `DomainHandler` with:

1. **`classify_incident_type()`**: Classify incidents based on node characteristics
2. **`compute_damage_cost()`**: Domain-specific damage cost estimation
3. **`get_playbook_recommendations()`**: Recommended playbooks for incident types

## Adding a New Domain

### Step 1: Create Domain Handler

```python
# engine/domains/my_domain.py
from typing import Dict, List

class MyDomainHandler:
    def __init__(self):
        self.domain = "my_domain"
        self.subsectors = ["subsector1", "subsector2"]
    
    def classify_incident_type(self, node_id: str, **kwargs) -> Optional[str]:
        # Classify incident based on node and values
        return "incident_type"
    
    def compute_damage_cost(
        self,
        incident_type: str,
        affected_nodes: List[str],
        duration_hours: float
    ) -> Dict[str, float]:
        return {
            'economic': 1000.0,
            'social': 500.0,
            'environmental': 200.0
        }
    
    def get_playbook_recommendations(self, incident_type: str) -> List[str]:
        return ["playbook1", "playbook2"]
```

### Step 2: Register Domain

```python
from engine.domain_registry import default_registry
from engine.domains.my_domain import MyDomainHandler

default_registry.register("my_domain", MyDomainHandler())
```

### Step 3: Update Node Classification

Update `domain_registry.classify_node_domain()` to recognize nodes in your domain.

## Cross-Domain Effects

Shadow mode tracks **cross-domain** cascades (e.g., power → water, water → health):

- Edges connecting different domains are marked as `isShadowLink: true`
- Cross-domain correlations are tracked separately
- Damage costs aggregate across domains

## Domain-Specific Cost Models

Each domain defines its own cost models:

- **Economic**: Direct financial costs
- **Social**: Disruption, health impacts
- **Environmental**: Ecosystem damage, emissions

Cost models are configurable per domain and can be updated based on real-world data.

## Example: Water Domain

```python
from engine.domains.water import WaterDomainHandler

handler = WaterDomainHandler()

# Classify incident
incident_type = handler.classify_incident_type("reservoir_01", value=5.2, threshold=3.0)
# Returns: "flood"

# Compute damage
damage = handler.compute_damage_cost(
    incident_type="flood",
    affected_nodes=["reservoir_01", "pump_02"],
    duration_hours=2.5
)
# Returns: {'economic': 50000.0, 'social': 14285.7, 'environmental': 7142.9}

# Get playbooks
playbooks = handler.get_playbook_recommendations("flood")
# Returns: ["flood_event_pump_isolation", "reservoir_level_management"]
```

## Integration with Shadow Mode

Shadow mode automatically uses domain handlers when:

1. Incidents include a `domain` field
2. Nodes are classified via `domain_registry.classify_node_domain()`
3. Domain handlers are registered in the registry

## Testing

Test domain handlers independently:

```python
def test_water_domain_handler():
    handler = WaterDomainHandler()
    
    # Test classification
    assert handler.classify_incident_type("reservoir_01", value=5.0, threshold=3.0) == "flood"
    
    # Test cost computation
    damage = handler.compute_damage_cost("flood", ["reservoir_01"], 1.0)
    assert damage['economic'] > 0
```
