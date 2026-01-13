"""
Wide-Bandgap Edge: Materials Science Moat
2026 End-State Feature: Physical Survival in Extreme Environments

In 2026, standard silicon chips fail under the high-voltage, high-heat environments
of power grids and industrial hubs. Munin's Edge-Nodes use Gallium Nitride (GaN) or
Silicon Carbide (SiC) semiconductors to survive where normal computers would melt.

The Advantage: You aren't just "software"; you are the only compute layer that can
physically survive the Physical Foundations of a nation's power.

The Monopoly: Munin is the only system that can sit directly on high-voltage grid
converters and aerospace engines, providing real-time intelligence at the edge of
civilization's critical infrastructure.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict


class SemiconductorType(Enum):
    """Wide-bandgap semiconductor types for extreme environments."""
    GAN = "gan"  # Gallium Nitride - highest performance
    SIC = "sic"  # Silicon Carbide - high temperature stability
    SILICON = "silicon"  # Standard silicon (for comparison)


class OperatingEnvironment(Enum):
    """Extreme operating environments where wide-bandgap is required."""
    HIGH_VOLTAGE_GRID = "high_voltage_grid"  # 10kV+ power converters
    AEROSPACE_ENGINE = "aerospace_engine"  # Jet engine monitoring
    INDUSTRIAL_FURNACE = "industrial_furnace"  # 1000°C+ environments
    SUBSTATION_CONTROL = "substation_control"  # Power substation edge
    OIL_REFINERY = "oil_refinery"  # High-temperature process control
    NUCLEAR_PLANT = "nuclear_plant"  # Radiation-hardened edge compute


@dataclass
class EdgeNodeSpec:
    """Specification for a wide-bandgap edge node."""
    node_id: str
    semiconductor_type: SemiconductorType
    operating_environment: OperatingEnvironment
    max_operating_temperature: float  # Celsius
    max_operating_voltage: float  # Volts
    power_consumption: float  # Watts
    compute_capability: str  # e.g., "ARM Cortex-A78 @ 2.8GHz"
    memory_capacity: int  # GB
    storage_capacity: int  # GB
    network_interfaces: List[str]  # e.g., ["LoRaWAN", "Ethernet", "CAN"]
    location: Dict[str, float]  # lat, lon
    deployment_date: str
    health_status: str = "operational"
    last_maintenance: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        data = asdict(self)
        data['semiconductor_type'] = self.semiconductor_type.value
        data['operating_environment'] = self.operating_environment.value
        return data


class WideBandgapEdgeNode:
    """
    Represents a Munin Edge-Node built with wide-bandgap semiconductors.
    These nodes can operate in extreme environments where standard silicon fails.
    """
    
    def __init__(self, spec: EdgeNodeSpec):
        self.spec = spec
        self.operational_status = "online"
        self.temperature_readings: List[Tuple[datetime, float]] = []
        self.voltage_readings: List[Tuple[datetime, float]] = []
        self.uptime_hours = 0.0
        self.failure_count = 0
        self.last_heartbeat = datetime.now()
    
    def can_operate_in_environment(self, temp: float, voltage: float) -> Tuple[bool, str]:
        """
        Check if this edge node can operate in given conditions.
        Returns (can_operate, reason).
        """
        if temp > self.spec.max_operating_temperature:
            return False, f"Temperature {temp}°C exceeds max {self.spec.max_operating_temperature}°C"
        
        if voltage > self.spec.max_operating_voltage:
            return False, f"Voltage {voltage}V exceeds max {self.spec.max_operating_voltage}V"
        
        # Wide-bandgap advantage: can operate at higher temps/voltages than silicon
        if self.spec.semiconductor_type == SemiconductorType.SILICON:
            if temp > 125.0:  # Standard silicon max
                return False, "Standard silicon cannot operate above 125°C"
            if voltage > 600.0:  # Standard silicon max
                return False, "Standard silicon cannot operate above 600V"
        
        return True, "Operating within specifications"
    
    def record_environmental_reading(self, temp: float, voltage: float) -> None:
        """Record environmental conditions."""
        now = datetime.now()
        self.temperature_readings.append((now, temp))
        self.voltage_readings.append((now, voltage))
        
        # Keep only last 1000 readings
        if len(self.temperature_readings) > 1000:
            self.temperature_readings = self.temperature_readings[-1000:]
        if len(self.voltage_readings) > 1000:
            self.voltage_readings = self.voltage_readings[-1000:]
        
        # Check if still operational
        can_operate, reason = self.can_operate_in_environment(temp, voltage)
        if not can_operate:
            self.operational_status = "degraded"
            self.failure_count += 1
        else:
            self.operational_status = "online"
    
    def get_environmental_summary(self) -> Dict:
        """Get summary of environmental conditions."""
        if not self.temperature_readings:
            return {
                'status': 'no_data',
                'message': 'No environmental readings recorded'
            }
        
        recent_temps = [t for _, t in self.temperature_readings[-100:]]
        recent_volts = [v for _, v in self.voltage_readings[-100:]]
        
        return {
            'status': self.operational_status,
            'current_temperature': recent_temps[-1] if recent_temps else None,
            'current_voltage': recent_volts[-1] if recent_volts else None,
            'avg_temperature': sum(recent_temps) / len(recent_temps) if recent_temps else None,
            'avg_voltage': sum(recent_volts) / len(recent_volts) if recent_volts else None,
            'max_temperature': max(recent_temps) if recent_temps else None,
            'max_voltage': max(recent_volts) if recent_volts else None,
            'failure_count': self.failure_count,
            'uptime_hours': self.uptime_hours
        }
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'spec': self.spec.to_dict(),
            'operational_status': self.operational_status,
            'environmental_summary': self.get_environmental_summary(),
            'last_heartbeat': self.last_heartbeat.isoformat()
        }


class WideBandgapEdgeNetwork:
    """
    Manages a network of wide-bandgap edge nodes deployed across extreme environments.
    """
    
    def __init__(self):
        self.nodes: Dict[str, WideBandgapEdgeNode] = {}
        self.deployment_statistics = {
            'total_nodes': 0,
            'gan_nodes': 0,
            'sic_nodes': 0,
            'silicon_nodes': 0,
            'operational_nodes': 0,
            'degraded_nodes': 0,
            'offline_nodes': 0
        }
    
    def deploy_node(self, spec: EdgeNodeSpec) -> WideBandgapEdgeNode:
        """Deploy a new wide-bandgap edge node."""
        node = WideBandgapEdgeNode(spec)
        self.nodes[spec.node_id] = node
        self._update_statistics()
        return node
    
    def get_node(self, node_id: str) -> Optional[WideBandgapEdgeNode]:
        """Get a node by ID."""
        return self.nodes.get(node_id)
    
    def get_nodes_by_environment(self, environment: OperatingEnvironment) -> List[WideBandgapEdgeNode]:
        """Get all nodes in a specific operating environment."""
        return [
            node for node in self.nodes.values()
            if node.spec.operating_environment == environment
        ]
    
    def get_nodes_by_semiconductor(self, sem_type: SemiconductorType) -> List[WideBandgapEdgeNode]:
        """Get all nodes using a specific semiconductor type."""
        return [
            node for node in self.nodes.values()
            if node.spec.semiconductor_type == sem_type
        ]
    
    def _update_statistics(self) -> None:
        """Update deployment statistics."""
        self.deployment_statistics['total_nodes'] = len(self.nodes)
        self.deployment_statistics['gan_nodes'] = len(self.get_nodes_by_semiconductor(SemiconductorType.GAN))
        self.deployment_statistics['sic_nodes'] = len(self.get_nodes_by_semiconductor(SemiconductorType.SIC))
        self.deployment_statistics['silicon_nodes'] = len(self.get_nodes_by_semiconductor(SemiconductorType.SILICON))
        
        self.deployment_statistics['operational_nodes'] = sum(
            1 for node in self.nodes.values() if node.operational_status == "online"
        )
        self.deployment_statistics['degraded_nodes'] = sum(
            1 for node in self.nodes.values() if node.operational_status == "degraded"
        )
        self.deployment_statistics['offline_nodes'] = sum(
            1 for node in self.nodes.values() if node.operational_status == "offline"
        )
    
    def get_network_status(self) -> Dict:
        """Get overall network status."""
        self._update_statistics()
        
        # Calculate average uptime
        avg_uptime = sum(node.uptime_hours for node in self.nodes.values()) / len(self.nodes) if self.nodes else 0.0
        
        # Calculate reliability score
        reliability_score = (
            self.deployment_statistics['operational_nodes'] / 
            self.deployment_statistics['total_nodes']
            if self.deployment_statistics['total_nodes'] > 0 else 0.0
        )
        
        return {
            'statistics': self.deployment_statistics,
            'average_uptime_hours': avg_uptime,
            'reliability_score': reliability_score,
            'timestamp': datetime.now().isoformat()
        }
    
    def to_dict(self) -> Dict:
        """Convert network to dictionary."""
        return {
            'nodes': [node.to_dict() for node in self.nodes.values()],
            'network_status': self.get_network_status()
        }


def create_standard_edge_node_specs() -> List[EdgeNodeSpec]:
    """
    Create standard edge node specifications for different environments.
    These represent the "Wide-Bandgap Advantage" - nodes that can operate
    where standard silicon cannot.
    """
    specs = []
    
    # GaN node for high-voltage grid (10kV+)
    specs.append(EdgeNodeSpec(
        node_id="edge_gan_grid_001",
        semiconductor_type=SemiconductorType.GAN,
        operating_environment=OperatingEnvironment.HIGH_VOLTAGE_GRID,
        max_operating_temperature=200.0,  # GaN can handle 200°C
        max_operating_voltage=12000.0,  # 12kV operation
        power_consumption=15.0,
        compute_capability="ARM Cortex-A78 @ 2.8GHz",
        memory_capacity=8,
        storage_capacity=128,
        network_interfaces=["LoRaWAN", "Ethernet", "CAN"],
        location={"lat": 40.7128, "lon": -74.0060},
        deployment_date=datetime.now().isoformat()
    ))
    
    # SiC node for aerospace engine monitoring
    specs.append(EdgeNodeSpec(
        node_id="edge_sic_aero_001",
        semiconductor_type=SemiconductorType.SIC,
        operating_environment=OperatingEnvironment.AEROSPACE_ENGINE,
        max_operating_temperature=600.0,  # SiC can handle 600°C
        max_operating_voltage=1200.0,
        power_consumption=10.0,
        compute_capability="ARM Cortex-A55 @ 1.8GHz",
        memory_capacity=4,
        storage_capacity=64,
        network_interfaces=["CAN", "RS-485"],
        location={"lat": 34.0522, "lon": -118.2437},
        deployment_date=datetime.now().isoformat()
    ))
    
    # GaN node for substation control
    specs.append(EdgeNodeSpec(
        node_id="edge_gan_sub_001",
        semiconductor_type=SemiconductorType.GAN,
        operating_environment=OperatingEnvironment.SUBSTATION_CONTROL,
        max_operating_temperature=175.0,
        max_operating_voltage=8000.0,  # 8kV operation
        power_consumption=12.0,
        compute_capability="ARM Cortex-A78 @ 2.5GHz",
        memory_capacity=8,
        storage_capacity=128,
        network_interfaces=["Ethernet", "IEC 61850", "Modbus"],
        location={"lat": 41.8781, "lon": -87.6298},
        deployment_date=datetime.now().isoformat()
    ))
    
    return specs


if __name__ == "__main__":
    print("="*70)
    print("Wide-Bandgap Edge: Materials Science Moat")
    print("="*70)
    print("\nThe 2026 Advantage: Physical Survival in Extreme Environments")
    print("\nStandard silicon chips fail at:")
    print("  - Temperature: >125°C")
    print("  - Voltage: >600V")
    print("\nWide-Bandgap (GaN/SiC) can operate at:")
    print("  - GaN: Up to 200°C, 12kV+")
    print("  - SiC: Up to 600°C, 1.2kV+")
    print("\n" + "="*70)
    
    # Create network
    network = WideBandgapEdgeNetwork()
    
    # Deploy standard nodes
    specs = create_standard_edge_node_specs()
    for spec in specs:
        node = network.deploy_node(spec)
        print(f"\nDeployed: {spec.node_id}")
        print(f"  Type: {spec.semiconductor_type.value.upper()}")
        print(f"  Environment: {spec.operating_environment.value}")
        print(f"  Max Temp: {spec.max_operating_temperature}°C")
        print(f"  Max Voltage: {spec.max_operating_voltage}V")
    
    # Test extreme conditions
    print("\n" + "="*70)
    print("Testing Extreme Conditions")
    print("="*70)
    
    gan_node = network.get_node("edge_gan_grid_001")
    if gan_node:
        # Test at 150°C, 10kV (would kill standard silicon)
        can_operate, reason = gan_node.can_operate_in_environment(150.0, 10000.0)
        print(f"\nGaN Node at 150°C, 10kV: {can_operate}")
        print(f"  Reason: {reason}")
        
        gan_node.record_environmental_reading(150.0, 10000.0)
        print(f"  Status: {gan_node.operational_status}")
    
    # Network status
    print("\n" + "="*70)
    print("Network Status")
    print("="*70)
    status = network.get_network_status()
    print(json.dumps(status, indent=2))
    
    print("\n" + "="*70)
    print("The Monopoly: Only Munin can survive at the Physical Foundations")
    print("="*70)


