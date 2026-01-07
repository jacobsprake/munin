"""
Sovereign Digital Twin: Munin-Mirror (Simulation-as-a-Service)
2026 Reality Feature: Predictive Rehearsal for Non-Linear Catastrophes

Governments need to "practice" for catastrophes without actually breaking things.

The Product: Munin-Mirror (Digital Twin)
- A high-fidelity, physics-based simulation of the nation's infrastructure
- Uses the real Asset-Dependency Graph to run "Stress Tests"
- Can simulate a 500-year flood or a cyber-attack on 50% of the grid
- Allows officials to rehearse their "Authoritative Handshakes" in a sandbox

The Enhancement: "Living Replay" with Shadow-Link Data
- Uses real-time "Shadow-Link" data from the infrastructure graph
- High-fidelity, geospatial simulation that mirrors real-world conditions
- Simulates national failures *before* they happen
- Allows Prime Minister to rehearse Authoritative Handshakes in a safe testbed

The Business Model: You sell this as a "National Resilience Audit."
Every year, the government pays you to prove that they *could* survive a catastrophe.
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
import uuid


class ScenarioType(Enum):
    """Types of stress test scenarios."""
    FLOOD = "flood"  # 500-year flood event
    CYBER_ATTACK = "cyber_attack"  # 50% grid compromise
    EARTHQUAKE = "earthquake"  # Seismic event
    POWER_BLACKOUT = "power_blackout"  # Regional power failure
    PUMP_CASCADE = "pump_cascade"  # Multiple pump failures
    DROUGHT = "drought"  # Water scarcity
    EXTREME_WEATHER = "extreme_weather"  # Hurricane, tornado, etc.


class SimulationStatus(Enum):
    """Status of a simulation run."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class StressTestScenario:
    """Represents a stress test scenario for the digital twin."""
    
    def __init__(
        self,
        scenario_id: str,
        scenario_type: ScenarioType,
        name: str,
        description: str,
        failure_nodes: List[str],  # Nodes that fail in this scenario
        cascade_depth: int = 3,  # How many hops the cascade propagates
        severity: float = 1.0,  # 0.0 to 1.0, severity of the event
        duration_hours: float = 24.0  # How long the scenario runs
    ):
        self.scenario_id = scenario_id
        self.scenario_type = scenario_type
        self.name = name
        self.description = description
        self.failure_nodes = failure_nodes
        self.cascade_depth = cascade_depth
        self.severity = severity
        self.duration_hours = duration_hours
        self.created_at = datetime.now()
    
    def to_dict(self) -> Dict:
        """Convert scenario to dictionary."""
        return {
            'id': self.scenario_id,
            'type': self.scenario_type.value,
            'name': self.name,
            'description': self.description,
            'failureNodes': self.failure_nodes,
            'cascadeDepth': self.cascade_depth,
            'severity': self.severity,
            'durationHours': self.duration_hours,
            'createdAt': self.created_at.isoformat()
        }


class SimulationResult:
    """Results from a digital twin simulation run."""
    
    def __init__(
        self,
        simulation_id: str,
        scenario: StressTestScenario,
        graph_data: Dict
    ):
        self.simulation_id = simulation_id
        self.scenario = scenario
        self.graph_data = graph_data
        self.status = SimulationStatus.PENDING
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.timeline: List[Dict] = []  # Event timeline
        self.affected_nodes: List[str] = []
        self.cascade_paths: List[List[str]] = []
        self.recovery_time_hours: Optional[float] = None
        self.survival_probability: float = 0.0
        self.recommended_playbooks: List[str] = []
        self.handshake_rehearsals: List[Dict] = []
    
    def to_dict(self) -> Dict:
        """Convert result to dictionary."""
        return {
            'simulationId': self.simulation_id,
            'scenario': self.scenario.to_dict(),
            'status': self.status.value,
            'startTime': self.start_time.isoformat() if self.start_time else None,
            'endTime': self.end_time.isoformat() if self.end_time else None,
            'affectedNodes': self.affected_nodes,
            'cascadePaths': self.cascade_paths,
            'recoveryTimeHours': self.recovery_time_hours,
            'survivalProbability': self.survival_probability,
            'recommendedPlaybooks': self.recommended_playbooks,
            'handshakeRehearsals': self.handshake_rehearsals,
            'timeline': self.timeline
        }


class SovereignDigitalTwin:
    """
    The Munin-Mirror: A high-fidelity digital twin of the infrastructure.
    Enhanced with "Living Replay" using Shadow-Link data.
    """
    
    def __init__(
        self,
        twin_id: str,
        graph_data: Dict,  # Asset-Dependency Graph
        historical_data: Optional[pd.DataFrame] = None,
        shadow_links: Optional[List[Dict]] = None  # Shadow-Link edges from graph
    ):
        self.twin_id = twin_id
        self.graph_data = graph_data
        self.historical_data = historical_data
        self.nodes = {n['id']: n for n in graph_data.get('nodes', [])}
        self.edges = {e['id']: e for e in graph_data.get('edges', [])}
        self.shadow_links = shadow_links or []  # Shadow-Link edges for high-fidelity simulation
        self.simulations: Dict[str, SimulationResult] = {}
        self.scenarios: List[StressTestScenario] = []
        self.living_replays: Dict[str, Dict] = {}  # replay_id -> replay data
        self.created_at = datetime.now()
    
    def add_scenario(self, scenario: StressTestScenario) -> None:
        """Add a stress test scenario."""
        self.scenarios.append(scenario)
    
    def run_simulation(
        self,
        scenario: StressTestScenario,
        simulation_id: Optional[str] = None
    ) -> SimulationResult:
        """
        Run a stress test simulation.
        This is the "National Resilience Audit" operation.
        """
        if simulation_id is None:
            simulation_id = str(uuid.uuid4())
        
        result = SimulationResult(
            simulation_id=simulation_id,
            scenario=scenario,
            graph_data=self.graph_data
        )
        
        result.status = SimulationStatus.RUNNING
        result.start_time = datetime.now()
        
        # Simulate the scenario
        self._simulate_scenario(result, scenario)
        
        result.status = SimulationStatus.COMPLETED
        result.end_time = datetime.now()
        
        # Compute survival probability
        result.survival_probability = self._compute_survival_probability(result)
        
        # Recommend playbooks
        result.recommended_playbooks = self._recommend_playbooks(result, scenario)
        
        # Generate handshake rehearsals
        result.handshake_rehearsals = self._generate_handshake_rehearsals(result)
        
        self.simulations[simulation_id] = result
        
        return result
    
    def _simulate_scenario(
        self,
        result: SimulationResult,
        scenario: StressTestScenario
    ) -> None:
        """Simulate a scenario and build the timeline."""
        # Initialize failure state
        failed_nodes = set(scenario.failure_nodes)
        affected_nodes = set(scenario.failure_nodes)
        
        # Build cascade paths
        cascade_paths: List[List[str]] = []
        
        # Simulate cascade propagation
        current_depth = 0
        queue: List[Tuple[str, int, List[str]]] = [
            (node, 0, [node]) for node in scenario.failure_nodes
        ]
        
        while queue and current_depth < scenario.cascade_depth:
            current_node, depth, path = queue.pop(0)
            
            if depth > current_depth:
                current_depth = depth
            
            # Find downstream nodes (nodes that depend on this one)
            downstream_edges = [
                e for e in self.edges.values()
                if e['source'] == current_node
            ]
            
            for edge in downstream_edges:
                target = edge['target']
                
                if target not in affected_nodes:
                    affected_nodes.add(target)
                    
                    # Compute failure probability based on edge confidence
                    edge_confidence = edge.get('confidenceScore', 0.5)
                    failure_prob = scenario.severity * (1.0 - edge_confidence)
                    
                    # Simulate failure (random based on probability)
                    if np.random.random() < failure_prob:
                        failed_nodes.add(target)
                        new_path = path + [target]
                        cascade_paths.append(new_path)
                        queue.append((target, depth + 1, new_path))
        
        result.affected_nodes = list(affected_nodes)
        result.cascade_paths = cascade_paths
        
        # Build timeline
        timeline = []
        current_time = result.start_time
        
        # Initial failures
        for node_id in scenario.failure_nodes:
            timeline.append({
                'timestamp': current_time.isoformat(),
                'event': 'node_failure',
                'nodeId': node_id,
                'severity': scenario.severity,
                'message': f"Node {node_id} failed due to {scenario.scenario_type.value}"
            })
        
        # Cascade events
        for path in cascade_paths:
            current_time += timedelta(minutes=5)  # Cascade propagates over time
            for i, node_id in enumerate(path[1:], 1):  # Skip first (already failed)
                timeline.append({
                    'timestamp': current_time.isoformat(),
                    'event': 'cascade_failure',
                    'nodeId': node_id,
                    'cascadePath': path,
                    'cascadeDepth': i,
                    'message': f"Cascade failure: {node_id} affected by {path[0]}"
                })
        
        result.timeline = timeline
        
        # Estimate recovery time
        result.recovery_time_hours = self._estimate_recovery_time(
            len(affected_nodes),
            scenario.severity
        )
    
    def _compute_survival_probability(self, result: SimulationResult) -> float:
        """Compute the probability that the system survives the scenario."""
        total_nodes = len(self.nodes)
        affected_ratio = len(result.affected_nodes) / total_nodes if total_nodes > 0 else 1.0
        
        # Survival probability decreases with affected ratio
        base_survival = 1.0 - affected_ratio
        
        # Adjust based on recovery time
        if result.recovery_time_hours:
            if result.recovery_time_hours < 1.0:
                recovery_factor = 1.0
            elif result.recovery_time_hours < 24.0:
                recovery_factor = 0.8
            elif result.recovery_time_hours < 72.0:
                recovery_factor = 0.5
            else:
                recovery_factor = 0.2
        else:
            recovery_factor = 0.5
        
        survival_prob = base_survival * recovery_factor
        return max(0.0, min(1.0, survival_prob))
    
    def _estimate_recovery_time(
        self,
        affected_node_count: int,
        severity: float
    ) -> float:
        """Estimate recovery time in hours."""
        # Base recovery time scales with affected nodes
        base_hours = affected_node_count * 0.5
        
        # Severity multiplier
        severity_multiplier = 1.0 + (severity * 2.0)
        
        return base_hours * severity_multiplier
    
    def _recommend_playbooks(
        self,
        result: SimulationResult,
        scenario: StressTestScenario
    ) -> List[str]:
        """Recommend playbooks based on scenario and results."""
        playbooks = []
        
        if scenario.scenario_type == ScenarioType.FLOOD:
            playbooks.append("flood_event_pump_isolation.yaml")
        elif scenario.scenario_type == ScenarioType.POWER_BLACKOUT:
            playbooks.append("power_frequency_instability.yaml")
        elif scenario.scenario_type == ScenarioType.DROUGHT:
            playbooks.append("drought_reservoir_diversion.yaml")
        
        # Add generic playbooks based on affected sectors
        affected_sectors = set(
            self.nodes.get(node_id, {}).get('sector', 'unknown')
            for node_id in result.affected_nodes
        )
        
        if 'water' in str(affected_sectors).lower():
            playbooks.append("water_contingency.yaml")
        if 'power' in str(affected_sectors).lower():
            playbooks.append("power_contingency.yaml")
        
        return playbooks
    
    def _generate_handshake_rehearsals(self, result: SimulationResult) -> List[Dict]:
        """Generate handshake rehearsal scenarios for officials to practice."""
        rehearsals = []
        
        # Create rehearsal for each critical cascade path
        for i, path in enumerate(result.cascade_paths[:5]):  # Top 5 paths
            rehearsal = {
                'id': f"rehearsal_{i+1}",
                'cascadePath': path,
                'situationSummary': f"Simulated cascade failure affecting {len(path)} nodes",
                'proposedAction': f"Isolate nodes: {', '.join(path)}",
                'playbookId': result.recommended_playbooks[0] if result.recommended_playbooks else None,
                'simulationId': result.simulation_id
            }
            rehearsals.append(rehearsal)
        
        return rehearsals
    
    def create_living_replay(
        self,
        replay_id: str,
        scenario: StressTestScenario,
        use_shadow_links: bool = True
    ) -> Dict:
        """
        Create a "Living Replay" - a high-fidelity simulation using Shadow-Link data.
        This allows officials to rehearse Authoritative Handshakes in a safe testbed.
        """
        # Run base simulation
        simulation_result = self.run_simulation(scenario, simulation_id=f"sim_{replay_id}")
        
        # Enhance with Shadow-Link data for high-fidelity replay
        shadow_enhanced_timeline = []
        if use_shadow_links and self.shadow_links:
            # Use Shadow-Link edges to enhance cascade predictions
            for event in simulation_result.timeline:
                enhanced_event = event.copy()
                
                # Find Shadow-Link edges for affected nodes
                if 'nodeId' in event:
                    node_id = event['nodeId']
                    shadow_edges = [
                        e for e in self.shadow_links
                        if e.get('source') == node_id or e.get('target') == node_id
                    ]
                    
                    if shadow_edges:
                        enhanced_event['shadowLinkData'] = {
                            'connectedNodes': [e.get('target') if e.get('source') == node_id else e.get('source') for e in shadow_edges],
                            'shadowLinkCount': len(shadow_edges),
                            'confidenceScores': [e.get('confidenceScore', 0.5) for e in shadow_edges]
                        }
                
                shadow_enhanced_timeline.append(enhanced_event)
        else:
            shadow_enhanced_timeline = simulation_result.timeline
        
        # Create geospatial visualization data
        geospatial_data = self._generate_geospatial_data(simulation_result)
        
        # Create handshake rehearsal opportunities
        handshake_rehearsals = self._generate_handshake_rehearsals(simulation_result)
        
        replay = {
            'replayId': replay_id,
            'scenario': scenario.to_dict(),
            'simulationResult': simulation_result.to_dict(),
            'shadowEnhancedTimeline': shadow_enhanced_timeline,
            'geospatialData': geospatial_data,
            'handshakeRehearsals': handshake_rehearsals,
            'createdAt': datetime.now().isoformat(),
            'fidelity': 'high' if use_shadow_links else 'standard',
            'shadowLinksUsed': len(self.shadow_links) if use_shadow_links else 0
        }
        
        self.living_replays[replay_id] = replay
        return replay
    
    def _generate_geospatial_data(self, result: SimulationResult) -> Dict:
        """Generate geospatial data for visualization."""
        affected_nodes_geo = []
        for node_id in result.affected_nodes:
            if node_id in self.nodes:
                node = self.nodes[node_id]
                if 'lat' in node and 'lon' in node:
                    affected_nodes_geo.append({
                        'nodeId': node_id,
                        'label': node.get('label', node_id),
                        'lat': node['lat'],
                        'lon': node['lon'],
                        'sector': node.get('sector', 'unknown')
                    })
        
        cascade_paths_geo = []
        for path in result.cascade_paths:
            path_geo = []
            for node_id in path:
                if node_id in self.nodes:
                    node = self.nodes[node_id]
                    if 'lat' in node and 'lon' in node:
                        path_geo.append({
                            'nodeId': node_id,
                            'lat': node['lat'],
                            'lon': node['lon']
                        })
            if path_geo:
                cascade_paths_geo.append(path_geo)
        
        return {
            'affectedNodes': affected_nodes_geo,
            'cascadePaths': cascade_paths_geo,
            'totalAffectedNodes': len(affected_nodes_geo),
            'totalCascadePaths': len(cascade_paths_geo)
        }
    
    def get_living_replay(self, replay_id: str) -> Optional[Dict]:
        """Get a living replay by ID."""
        return self.living_replays.get(replay_id)
    
    def list_living_replays(self) -> List[Dict]:
        """List all living replays."""
        return [
            {
                'replayId': replay_id,
                'scenario': replay['scenario']['name'],
                'scenarioType': replay['scenario']['type'],
                'createdAt': replay['createdAt'],
                'fidelity': replay['fidelity'],
                'survivalProbability': replay['simulationResult'].get('survivalProbability', 0.0)
            }
            for replay_id, replay in self.living_replays.items()
        ]
    
    def generate_resilience_audit_report(self) -> Dict:
        """
        Generate a "National Resilience Audit" report.
        This is what you sell to governments every year.
        """
        if not self.simulations:
            return {
                'twinId': self.twin_id,
                'status': 'no_simulations',
                'message': 'No simulations have been run yet'
            }
        
        # Aggregate results across all simulations
        total_simulations = len(self.simulations)
        avg_survival_prob = np.mean([
            s.survival_probability for s in self.simulations.values()
        ])
        avg_recovery_time = np.mean([
            s.recovery_time_hours or 0.0
            for s in self.simulations.values()
        ])
        
        # Scenario coverage
        scenario_types = set(
            s.scenario.scenario_type.value
            for s in self.simulations.values()
        )
        
        report = {
            'twinId': self.twin_id,
            'generatedAt': datetime.now().isoformat(),
            'summary': {
                'totalSimulations': total_simulations,
                'averageSurvivalProbability': float(avg_survival_prob),
                'averageRecoveryTimeHours': float(avg_recovery_time),
                'scenarioCoverage': list(scenario_types)
            },
            'recommendations': self._generate_recommendations(),
            'simulations': [
                s.to_dict() for s in self.simulations.values()
            ]
        }
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on simulation results."""
        recommendations = []
        
        if not self.simulations:
            return recommendations
        
        # Check survival probabilities
        low_survival = [
            s for s in self.simulations.values()
            if s.survival_probability < 0.5
        ]
        
        if low_survival:
            recommendations.append(
                f"{len(low_survival)} scenarios show survival probability < 50%. "
                "Consider infrastructure hardening or additional redundancy."
            )
        
        # Check recovery times
        long_recovery = [
            s for s in self.simulations.values()
            if s.recovery_time_hours and s.recovery_time_hours > 72.0
        ]
        
        if long_recovery:
            recommendations.append(
                f"{len(long_recovery)} scenarios show recovery time > 72 hours. "
                "Consider pre-positioned recovery resources."
            )
        
        return recommendations
    
    def to_dict(self) -> Dict:
        """Convert digital twin to dictionary."""
        return {
            'twinId': self.twin_id,
            'nodeCount': len(self.nodes),
            'edgeCount': len(self.edges),
            'scenarioCount': len(self.scenarios),
            'simulationCount': len(self.simulations),
            'createdAt': self.created_at.isoformat()
        }


def create_digital_twin_from_graph(
    graph_data: Dict,
    historical_data: Optional[pd.DataFrame] = None,
    extract_shadow_links: bool = True
) -> SovereignDigitalTwin:
    """
    Create a digital twin from the infrastructure graph.
    Extracts Shadow-Link edges for high-fidelity "Living Replay" simulations.
    """
    twin_id = f"twin_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Extract Shadow-Link edges (edges marked with isShadowLink flag)
    shadow_links = []
    if extract_shadow_links:
        shadow_links = [
            e for e in graph_data.get('edges', [])
            if e.get('isShadowLink', False)
        ]
    
    twin = SovereignDigitalTwin(
        twin_id=twin_id,
        graph_data=graph_data,
        historical_data=historical_data,
        shadow_links=shadow_links
    )
    return twin


if __name__ == "__main__":
    # Example usage
    graph_data = {
        'nodes': [
            {'id': 'node1', 'label': 'Substation 1', 'sector': 'power'},
            {'id': 'node2', 'label': 'Pump 1', 'sector': 'water'},
            {'id': 'node3', 'label': 'Reservoir 1', 'sector': 'water'}
        ],
        'edges': [
            {'id': 'e1', 'source': 'node1', 'target': 'node2', 'confidenceScore': 0.8},
            {'id': 'e2', 'source': 'node2', 'target': 'node3', 'confidenceScore': 0.9}
        ]
    }
    
    twin = create_digital_twin_from_graph(graph_data)
    
    # Create scenario
    scenario = StressTestScenario(
        scenario_id="scenario_001",
        scenario_type=ScenarioType.FLOOD,
        name="500-Year Flood Event",
        description="Simulate catastrophic flooding affecting water infrastructure",
        failure_nodes=['node2'],
        cascade_depth=2,
        severity=0.9
    )
    
    twin.add_scenario(scenario)
    
    # Run simulation
    result = twin.run_simulation(scenario)
    
    print(f"Simulation completed: {result.simulation_id}")
    print(f"Survival probability: {result.survival_probability:.2%}")
    print(f"Affected nodes: {len(result.affected_nodes)}")
    print(f"Recovery time: {result.recovery_time_hours:.1f} hours")
    
    # Generate audit report
    report = twin.generate_resilience_audit_report()
    print(f"\nAudit report: {json.dumps(report['summary'], indent=2)}")

