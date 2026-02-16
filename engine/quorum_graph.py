"""
Arbitrary Quorum Graph Support

Extends byzantine resilience to support arbitrary quorum graphs, not just fixed M-of-N.
Enables conditional signatures and complex quorum topologies.
"""
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import json


class QuorumNodeType(Enum):
    """Types of nodes in quorum graph."""
    MINISTRY = "ministry"
    AGENCY = "agency"
    OPERATOR = "operator"
    REGULATOR = "regulator"


@dataclass
class QuorumNode:
    """Node in quorum graph."""
    node_id: str
    node_type: QuorumNodeType
    name: str
    required: bool  # Must sign for quorum to be valid
    conditional: Optional[str] = None  # Condition under which signature is valid (e.g., "emergency_level >= major_incident")
    weight: int = 1  # Weight of this node's signature


@dataclass
class QuorumEdge:
    """Edge in quorum graph (dependency between nodes)."""
    source_id: str
    target_id: str
    condition: Optional[str] = None  # Condition for this edge to be active


@dataclass
class QuorumGraph:
    """Arbitrary quorum graph topology."""
    nodes: List[QuorumNode]
    edges: List[QuorumEdge]
    threshold: int  # Total weight required for quorum
    description: str


class ArbitraryQuorumEngine:
    """Engine supporting arbitrary quorum graphs."""
    
    def __init__(self):
        self.quorum_graphs: Dict[str, QuorumGraph] = {}
        self.signatures: Dict[str, Dict[str, Dict]] = {}  # action_id -> node_id -> signature_data
    
    def register_quorum_graph(
        self,
        graph_id: str,
        nodes: List[QuorumNode],
        edges: List[QuorumEdge],
        threshold: int,
        description: str
    ):
        """Register a quorum graph topology."""
        graph = QuorumGraph(
            nodes=nodes,
            edges=edges,
            threshold=threshold,
            description=description
        )
        self.quorum_graphs[graph_id] = graph
    
    def add_signature(
        self,
        graph_id: str,
        action_id: str,
        node_id: str,
        signature_data: Dict,
        context: Optional[Dict] = None
    ) -> bool:
        """Add signature from a node, checking conditions."""
        if graph_id not in self.quorum_graphs:
            raise ValueError(f"Quorum graph {graph_id} not found")
        
        graph = self.quorum_graphs[graph_id]
        node = next((n for n in graph.nodes if n.node_id == node_id), None)
        
        if not node:
            raise ValueError(f"Node {node_id} not in quorum graph {graph_id}")
        
        # Check conditional signature validity
        if node.conditional and context:
            # Evaluate condition (simplified - would use proper expression evaluator in production)
            condition_met = self._evaluate_condition(node.conditional, context)
            if not condition_met:
                raise ValueError(f"Condition not met for node {node_id}: {node.conditional}")
        
        # Store signature
        if action_id not in self.signatures:
            self.signatures[action_id] = {}
        
        self.signatures[action_id][node_id] = {
            **signature_data,
            'node_id': node_id,
            'timestamp': datetime.now().isoformat(),
            'weight': node.weight
        }
        
        # Check if quorum is met
        return self._check_quorum_met(graph_id, action_id, context)
    
    def _evaluate_condition(self, condition: str, context: Dict) -> bool:
        """Evaluate conditional signature condition."""
        # Simplified evaluation - in production would use proper expression evaluator
        if 'emergency_level' in condition:
            if '>=' in condition:
                parts = condition.split('>=')
                if len(parts) == 2:
                    level = context.get('emergency_level', 'peacetime')
                    required = parts[1].strip().strip('"\'')
                    # Simplified level comparison
                    levels = ['peacetime', 'minor_incident', 'major_incident', 'national_emergency', 'war']
                    try:
                        level_idx = levels.index(level)
                        required_idx = levels.index(required)
                        return level_idx >= required_idx
                    except ValueError:
                        return False
        return True  # Default to true if condition parsing fails
    
    def _check_quorum_met(
        self,
        graph_id: str,
        action_id: str,
        context: Optional[Dict] = None
    ) -> bool:
        """Check if quorum threshold is met."""
        if graph_id not in self.quorum_graphs:
            return False
        
        graph = self.quorum_graphs[graph_id]
        
        if action_id not in self.signatures:
            return False
        
        action_signatures = self.signatures[action_id]
        
        # Calculate total weight of valid signatures
        total_weight = 0
        required_nodes_signed = True
        
        for node in graph.nodes:
            if node.node_id in action_signatures:
                # Check if signature is valid under current conditions
                if node.conditional and context:
                    if not self._evaluate_condition(node.conditional, context):
                        continue  # Skip this signature if condition not met
                
                total_weight += node.weight
            elif node.required:
                required_nodes_signed = False
        
        return required_nodes_signed and total_weight >= graph.threshold
    
    def get_quorum_status(
        self,
        graph_id: str,
        action_id: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """Get current quorum status."""
        if graph_id not in self.quorum_graphs:
            return {'error': f'Quorum graph {graph_id} not found'}
        
        graph = self.quorum_graphs[graph_id]
        action_signatures = self.signatures.get(action_id, {})
        
        signed_nodes = []
        missing_nodes = []
        total_weight = 0
        
        for node in graph.nodes:
            if node.node_id in action_signatures:
                sig = action_signatures[node.node_id]
                # Check condition validity
                valid = True
                if node.conditional and context:
                    valid = self._evaluate_condition(node.conditional, context)
                
                if valid:
                    signed_nodes.append({
                        'node_id': node.node_id,
                        'name': node.name,
                        'weight': node.weight,
                        'timestamp': sig.get('timestamp')
                    })
                    total_weight += node.weight
                else:
                    missing_nodes.append({
                        'node_id': node.node_id,
                        'name': node.name,
                        'reason': f'Condition not met: {node.conditional}'
                    })
            else:
                missing_nodes.append({
                    'node_id': node.node_id,
                    'name': node.name,
                    'required': node.required,
                    'conditional': node.conditional
                })
        
        return {
            'graph_id': graph_id,
            'action_id': action_id,
            'threshold': graph.threshold,
            'current_weight': total_weight,
            'quorum_met': total_weight >= graph.threshold,
            'signed_nodes': signed_nodes,
            'missing_nodes': missing_nodes,
            'description': graph.description
        }
