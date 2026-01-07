"""
Sovereign Mesh: Emergency Communication Hardware
2026 Reality Feature: Communication Sovereignty

In a total grid collapse or cyberwar, the first thing that fails is the cellular network.
If Munin relies on the internet, it's a brick.

The Product: Munin-Link Mesh Transceivers
- Ruggedized, long-range (LoRa/Satellite) radio nodes that clip onto utility poles
- Creates a private, parallel network dedicated solely to Munin's infrastructure telemetry
- Even if the nation's internet is cut, Munin's "nervous system" stays alive

Strategic Value: You are the only provider that offers "Communication Sovereignty."
You don't just optimize the grid; you provide the only network that can't be turned off by an adversary.
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
import uuid


class MeshNodeType(Enum):
    """Types of mesh nodes in the sovereign network."""
    LORA_BASE_STATION = "lora_base_station"  # Long-range LoRa transceiver
    SATELLITE_GATEWAY = "satellite_gateway"  # Satellite uplink node
    REPEATER = "repeater"  # Mesh repeater node
    EDGE_NODE = "edge_node"  # Edge sensor node with mesh capability


class MeshConnectionStatus(Enum):
    """Connection status of mesh nodes."""
    ONLINE = "online"
    DEGRADED = "degraded"  # Intermittent connectivity
    OFFLINE = "offline"
    ISOLATED = "isolated"  # Node is up but can't reach network


class MeshProtocol(Enum):
    """Communication protocols supported by the mesh."""
    LORA_WAN = "lora_wan"  # LoRaWAN protocol
    SATELLITE = "satellite"  # Satellite communication
    MESH_RF = "mesh_rf"  # Direct RF mesh
    HYBRID = "hybrid"  # Multiple protocols


class SovereignMeshNode:
    """Represents a node in the sovereign mesh network."""
    
    def __init__(
        self,
        node_id: str,
        node_type: MeshNodeType,
        location: Dict[str, float],  # lat, lon
        protocol: MeshProtocol = MeshProtocol.LORA_WAN,
        parent_node_id: Optional[str] = None
    ):
        self.node_id = node_id
        self.node_type = node_type
        self.location = location
        self.protocol = protocol
        self.parent_node_id = parent_node_id
        self.status = MeshConnectionStatus.ONLINE
        self.last_heartbeat = datetime.now()
        self.signal_strength = 100.0  # Percentage
        self.battery_level = 100.0  # Percentage
        self.message_queue: List[Dict] = []
        self.neighbors: List[str] = []  # Connected neighbor node IDs
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict:
        """Convert node to dictionary."""
        return {
            'id': self.node_id,
            'type': self.node_type.value,
            'location': self.location,
            'protocol': self.protocol.value,
            'parentNodeId': self.parent_node_id,
            'status': self.status.value,
            'lastHeartbeat': self.last_heartbeat.isoformat(),
            'signalStrength': self.signal_strength,
            'batteryLevel': self.battery_level,
            'messageQueueSize': len(self.message_queue),
            'neighbors': self.neighbors,
            'createdAt': self.created_at.isoformat()
        }


class SovereignMeshNetwork:
    """Manages the sovereign mesh network topology and routing."""
    
    def __init__(self):
        self.nodes: Dict[str, SovereignMeshNode] = {}
        self.routing_table: Dict[str, List[str]] = {}  # node_id -> path to gateway
        self.message_log: List[Dict] = []
        self.network_health_score = 1.0
    
    def add_node(self, node: SovereignMeshNode) -> None:
        """Add a node to the mesh network."""
        self.nodes[node.node_id] = node
        self._update_routing_table()
    
    def remove_node(self, node_id: str) -> None:
        """Remove a node from the mesh network."""
        if node_id in self.nodes:
            del self.nodes[node_id]
            if node_id in self.routing_table:
                del self.routing_table[node_id]
            self._update_routing_table()
    
    def update_node_status(self, node_id: str, status: MeshConnectionStatus) -> None:
        """Update the status of a mesh node."""
        if node_id in self.nodes:
            self.nodes[node_id].status = status
            self.nodes[node_id].last_heartbeat = datetime.now()
            self._update_routing_table()
            self._compute_network_health()
    
    def send_message(
        self,
        source_node_id: str,
        target_node_id: str,
        payload: Dict,
        priority: int = 1
    ) -> Dict:
        """
        Send a message through the mesh network.
        Returns message receipt with routing path.
        """
        if source_node_id not in self.nodes:
            raise ValueError(f"Source node {source_node_id} not found")
        if target_node_id not in self.nodes:
            raise ValueError(f"Target node {target_node_id} not found")
        
        # Find routing path
        path = self._find_path(source_node_id, target_node_id)
        if not path:
            raise ValueError(f"No path found from {source_node_id} to {target_node_id}")
        
        message_id = str(uuid.uuid4())
        message = {
            'id': message_id,
            'source': source_node_id,
            'target': target_node_id,
            'payload': payload,
            'priority': priority,
            'path': path,
            'timestamp': datetime.now().isoformat(),
            'hops': len(path) - 1,
            'status': 'delivered' if all(
                self.nodes[nid].status == MeshConnectionStatus.ONLINE
                for nid in path
            ) else 'pending'
        }
        
        self.message_log.append(message)
        
        # Add to message queue of intermediate nodes
        for node_id in path[1:-1]:  # Exclude source and target
            if node_id in self.nodes:
                self.nodes[node_id].message_queue.append(message)
        
        return message
    
    def _find_path(self, source: str, target: str) -> Optional[List[str]]:
        """Find shortest path between two nodes using BFS."""
        if source == target:
            return [source]
        
        # Simple BFS routing
        queue: List[Tuple[str, List[str]]] = [(source, [source])]
        visited = {source}
        
        while queue:
            current, path = queue.pop(0)
            
            # Get neighbors
            if current in self.nodes:
                neighbors = self.nodes[current].neighbors
            else:
                neighbors = []
            
            for neighbor in neighbors:
                if neighbor == target:
                    return path + [target]
                
                if neighbor not in visited and neighbor in self.nodes:
                    if self.nodes[neighbor].status == MeshConnectionStatus.ONLINE:
                        visited.add(neighbor)
                        queue.append((neighbor, path + [neighbor]))
        
        return None
    
    def _update_routing_table(self) -> None:
        """Update routing table for all nodes."""
        # Find gateway nodes (base stations and satellite gateways)
        gateways = [
            nid for nid, node in self.nodes.items()
            if node.node_type in [MeshNodeType.LORA_BASE_STATION, MeshNodeType.SATELLITE_GATEWAY]
            and node.status == MeshConnectionStatus.ONLINE
        ]
        
        # Build routing paths to nearest gateway for each node
        self.routing_table = {}
        for node_id in self.nodes:
            if node_id in gateways:
                self.routing_table[node_id] = [node_id]
            else:
                # Find path to nearest gateway
                best_path = None
                best_length = float('inf')
                
                for gateway in gateways:
                    path = self._find_path(node_id, gateway)
                    if path and len(path) < best_length:
                        best_path = path
                        best_length = len(path)
                
                if best_path:
                    self.routing_table[node_id] = best_path
    
    def _compute_network_health(self) -> None:
        """Compute overall network health score."""
        if not self.nodes:
            self.network_health_score = 0.0
            return
        
        online_count = sum(
            1 for node in self.nodes.values()
            if node.status == MeshConnectionStatus.ONLINE
        )
        
        total_count = len(self.nodes)
        connectivity_ratio = online_count / total_count if total_count > 0 else 0.0
        
        # Average signal strength
        avg_signal = sum(
            node.signal_strength for node in self.nodes.values()
        ) / total_count if total_count > 0 else 0.0
        
        # Nodes with routing paths
        routed_count = len(self.routing_table)
        routing_ratio = routed_count / total_count if total_count > 0 else 0.0
        
        # Combined health score
        self.network_health_score = (
            connectivity_ratio * 0.4 +
            (avg_signal / 100.0) * 0.3 +
            routing_ratio * 0.3
        )
    
    def get_network_status(self) -> Dict:
        """Get overall network status."""
        self._compute_network_health()
        
        return {
            'healthScore': self.network_health_score,
            'totalNodes': len(self.nodes),
            'onlineNodes': sum(
                1 for node in self.nodes.values()
                if node.status == MeshConnectionStatus.ONLINE
            ),
            'gatewayNodes': sum(
                1 for node in self.nodes.values()
                if node.node_type in [MeshNodeType.LORA_BASE_STATION, MeshNodeType.SATELLITE_GATEWAY]
            ),
            'totalMessages': len(self.message_log),
            'routingTableSize': len(self.routing_table),
            'timestamp': datetime.now().isoformat()
        }
    
    def to_dict(self) -> Dict:
        """Convert network to dictionary."""
        return {
            'nodes': [node.to_dict() for node in self.nodes.values()],
            'routingTable': self.routing_table,
            'networkStatus': self.get_network_status(),
            'recentMessages': self.message_log[-100:]  # Last 100 messages
        }


def create_mesh_network_from_graph(
    graph_nodes: List[Dict],
    graph_edges: List[Dict],
    base_station_locations: Optional[List[Dict[str, float]]] = None
) -> SovereignMeshNetwork:
    """
    Create a sovereign mesh network from the infrastructure graph.
    Places mesh nodes at critical infrastructure locations.
    """
    mesh = SovereignMeshNetwork()
    
    # Create base stations (gateways)
    if base_station_locations:
        for i, location in enumerate(base_station_locations):
            base_station = SovereignMeshNode(
                node_id=f"mesh_gateway_{i:03d}",
                node_type=MeshNodeType.LORA_BASE_STATION,
                location=location,
                protocol=MeshProtocol.LORA_WAN
            )
            mesh.add_node(base_station)
    
    # Create mesh nodes at critical infrastructure nodes
    for graph_node in graph_nodes:
        if 'lat' in graph_node and 'lon' in graph_node:
            mesh_node = SovereignMeshNode(
                node_id=f"mesh_{graph_node['id']}",
                node_type=MeshNodeType.EDGE_NODE,
                location={'lat': graph_node['lat'], 'lon': graph_node['lon']},
                protocol=MeshProtocol.LORA_WAN
            )
            mesh.add_node(mesh_node)
    
    # Connect mesh nodes based on graph edges (within range)
    for edge in graph_edges:
        source_mesh_id = f"mesh_{edge['source']}"
        target_mesh_id = f"mesh_{edge['target']}"
        
        if source_mesh_id in mesh.nodes and target_mesh_id in mesh.nodes:
            # Add as neighbors (within LoRa range ~10km)
            if target_mesh_id not in mesh.nodes[source_mesh_id].neighbors:
                mesh.nodes[source_mesh_id].neighbors.append(target_mesh_id)
            if source_mesh_id not in mesh.nodes[target_mesh_id].neighbors:
                mesh.nodes[target_mesh_id].neighbors.append(source_mesh_id)
    
    # Update routing
    mesh._update_routing_table()
    
    return mesh


def save_mesh_network(mesh: SovereignMeshNetwork, output_path: Path) -> None:
    """Save mesh network configuration to file."""
    with open(output_path, 'w') as f:
        json.dump(mesh.to_dict(), f, indent=2)


def load_mesh_network(input_path: Path) -> SovereignMeshNetwork:
    """Load mesh network configuration from file."""
    with open(input_path, 'r') as f:
        data = json.load(f)
    
    mesh = SovereignMeshNetwork()
    
    for node_data in data.get('nodes', []):
        node = SovereignMeshNode(
            node_id=node_data['id'],
            node_type=MeshNodeType(node_data['type']),
            location=node_data['location'],
            protocol=MeshProtocol(node_data['protocol']),
            parent_node_id=node_data.get('parentNodeId')
        )
        node.status = MeshConnectionStatus(node_data['status'])
        node.last_heartbeat = datetime.fromisoformat(node_data['lastHeartbeat'])
        node.signal_strength = node_data['signalStrength']
        node.battery_level = node_data['batteryLevel']
        node.neighbors = node_data.get('neighbors', [])
        node.created_at = datetime.fromisoformat(node_data['createdAt'])
        mesh.add_node(node)
    
    mesh.routing_table = data.get('routingTable', {})
    
    return mesh


if __name__ == "__main__":
    # Example usage
    mesh = SovereignMeshNetwork()
    
    # Create base station
    base_station = SovereignMeshNode(
        node_id="gateway_001",
        node_type=MeshNodeType.LORA_BASE_STATION,
        location={'lat': 40.7128, 'lon': -74.0060},
        protocol=MeshProtocol.LORA_WAN
    )
    mesh.add_node(base_station)
    
    # Create edge nodes
    for i in range(5):
        edge_node = SovereignMeshNode(
            node_id=f"edge_{i:03d}",
            node_type=MeshNodeType.EDGE_NODE,
            location={'lat': 40.7128 + i * 0.01, 'lon': -74.0060 + i * 0.01},
            protocol=MeshProtocol.LORA_WAN,
            parent_node_id="gateway_001"
        )
        edge_node.neighbors = ["gateway_001"]
        base_station.neighbors.append(edge_node.node_id)
        mesh.add_node(edge_node)
    
    # Update routing
    mesh._update_routing_table()
    
    # Send test message
    message = mesh.send_message(
        "edge_001",
        "edge_003",
        {'type': 'telemetry', 'value': 42.0}
    )
    
    print(json.dumps(mesh.get_network_status(), indent=2))
    print(f"\nMessage sent: {message['id']} via {len(message['path'])} hops")

