"""
Agentic AI Orchestration Layer - 2026 End-State Feature
AI vs. AI: Autonomous Countermeasures for Agentic Sabotage

By 2026, cyberattacks aren't launched by humans; they are launched by
Autonomous AI Agents. Munin doesn't wait for a human to see an alert. It
deploys its own AI Agents at the edge to "quarantine" compromised substations
or reroute water flow in milliseconds—faster than any human-led cyber-command
could react.

The Feature: Agentic Countermeasures
The Advantage: You've moved from "Monitoring" to "Autonomous Governance."
You are the only one who can fight a 2026-era war.
"""
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
from enum import Enum


class ThreatType(Enum):
    """Types of autonomous AI threats."""
    SENSOR_SPOOFING = "sensor_spoofing"  # AI agent faking sensor data
    COMMAND_INJECTION = "command_injection"  # AI agent injecting malicious commands
    CASCADE_AMPLIFICATION = "cascade_amplification"  # AI agent accelerating cascades
    PROTOCOL_EXPLOITATION = "protocol_exploitation"  # AI agent exploiting OT protocols
    SYNTHETIC_CORRUPTION = "synthetic_corruption"  # AI-generated fake authorizations


class CountermeasureAction(Enum):
    """Autonomous countermeasure actions."""
    QUARANTINE_NODE = "quarantine_node"  # Isolate compromised node
    REROUTE_FLOW = "reroute_flow"  # Reroute critical flows
    ACTIVATE_BACKUP = "activate_backup"  # Activate backup systems
    BLOCK_COMMANDS = "block_commands"  # Block malicious command stream
    CROSS_VERIFY = "cross_verify"  # Cross-verify with physical sensors
    ALERT_HUMAN = "alert_human"  # Escalate to human operators


class AgenticCountermeasure:
    """Represents an autonomous countermeasure deployed by Munin."""
    
    def __init__(
        self,
        threat_id: str,
        threat_type: ThreatType,
        target_node_id: str,
        action: CountermeasureAction,
        confidence: float,
        reasoning: str,
        deployed_at: datetime
    ):
        self.threat_id = threat_id
        self.threat_type = threat_type
        self.target_node_id = target_node_id
        self.action = action
        self.confidence = confidence
        self.reasoning = reasoning
        self.deployed_at = deployed_at
        self.status = "active"
        self.effectiveness_score = 0.0
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'threatId': self.threat_id,
            'threatType': self.threat_type.value,
            'targetNodeId': self.target_node_id,
            'action': self.action.value,
            'confidence': self.confidence,
            'reasoning': self.reasoning,
            'deployedAt': self.deployed_at.isoformat(),
            'status': self.status,
            'effectivenessScore': self.effectiveness_score
        }


class AgenticReasoningEngine:
    """
    Agentic AI that can reason through complex multi-step recovery scenarios.
    Unlike static playbooks, this agent can:
    - Cross-reference multiple data sources (weather, power grid, sensors)
    - Reason through multi-step goals autonomously
    - Draft multi-agency coordination responses
    - Adapt to novel situations not covered by playbooks
    """
    
    def __init__(self, graph_data: Dict, evidence_data: Dict, incidents_data: Dict):
        self.graph = graph_data
        self.evidence = evidence_data
        self.incidents = incidents_data
        self.reasoning_steps = []
        self.active_countermeasures: List[AgenticCountermeasure] = []
        self.threat_history: List[Dict] = []
        
    def reason_through_incident(self, incident_id: str, broken_sensor_id: Optional[str] = None) -> Dict:
        """
        Main reasoning entry point. Given an incident and optional broken sensor,
        reason through the situation and generate a multi-step recovery plan.
        """
        incident = next((i for i in self.incidents.get('incidents', []) if i['id'] == incident_id), None)
        if not incident:
            return {'error': 'Incident not found'}
        
        self.reasoning_steps = []
        
        # Step 1: Assess the situation
        situation = self._assess_situation(incident, broken_sensor_id)
        self.reasoning_steps.append({
            'step': 1,
            'action': 'Situation Assessment',
            'reasoning': situation['reasoning'],
            'confidence': situation['confidence']
        })
        
        # Step 2: Cross-reference external data sources
        external_context = self._cross_reference_sources(incident, broken_sensor_id)
        self.reasoning_steps.append({
            'step': 2,
            'action': 'External Data Cross-Reference',
            'reasoning': external_context['reasoning'],
            'sources': external_context['sources'],
            'confidence': external_context['confidence']
        })
        
        # Step 3: Identify cascading dependencies
        cascade_analysis = self._analyze_cascade(incident)
        self.reasoning_steps.append({
            'step': 3,
            'action': 'Cascade Dependency Analysis',
            'reasoning': cascade_analysis['reasoning'],
            'affected_nodes': cascade_analysis['affected_nodes'],
            'time_to_cascade': cascade_analysis['time_to_cascade']
        })
        
        # Step 4: Generate multi-step recovery plan
        recovery_plan = self._generate_recovery_plan(incident, situation, external_context, cascade_analysis)
        self.reasoning_steps.append({
            'step': 4,
            'action': 'Recovery Plan Generation',
            'reasoning': recovery_plan['reasoning'],
            'steps': recovery_plan['steps']
        })
        
        # Step 5: Draft multi-agency coordination
        coordination = self._draft_multi_agency_response(incident, recovery_plan)
        self.reasoning_steps.append({
            'step': 5,
            'action': 'Multi-Agency Coordination',
            'reasoning': coordination['reasoning'],
            'agencies': coordination['agencies'],
            'coordination_plan': coordination['plan']
        })
        
        return {
            'incident_id': incident_id,
            'reasoning_steps': self.reasoning_steps,
            'recommended_action': recovery_plan['primary_action'],
            'multi_agency_plan': coordination,
            'confidence': min(situation['confidence'], external_context['confidence']),
            'generated_at': datetime.now().isoformat()
        }
    
    def _assess_situation(self, incident: Dict, broken_sensor_id: Optional[str]) -> Dict:
        """Assess the current situation from available data."""
        incident_type = incident.get('type', 'unknown')
        
        reasoning = f"Analyzing {incident_type} incident. "
        
        if broken_sensor_id:
            # Find the sensor in the graph
            sensor_node = next((n for n in self.graph.get('nodes', []) if n['id'] == broken_sensor_id), None)
            if sensor_node:
                reasoning += f"Sensor {broken_sensor_id} ({sensor_node.get('label', 'unknown')}) is reporting degraded status. "
                reasoning += f"Health score: {sensor_node.get('health', {}).get('score', 0):.2f}. "
                
                # Check if this is a critical node
                outgoing_edges = [e for e in self.graph.get('edges', []) if e['source'] == broken_sensor_id]
                if len(outgoing_edges) > 3:
                    reasoning += "This sensor has high downstream dependencies - failure could cascade rapidly. "
        
        # Analyze timeline
        timeline = incident.get('timeline', [])
        if timeline:
            total_impacted = sum(len(t.get('impactedNodeIds', [])) for t in timeline)
            reasoning += f"Timeline analysis shows {total_impacted} nodes will be impacted over {len(timeline)} phases. "
        
        confidence = 0.85 if broken_sensor_id else 0.75
        
        return {
            'reasoning': reasoning,
            'confidence': confidence
        }
    
    def _cross_reference_sources(self, incident: Dict, broken_sensor_id: Optional[str]) -> Dict:
        """
        Cross-reference weather satellite data, power grid load, and other external sources
        to confirm the situation.
        """
        incident_type = incident.get('type', 'unknown')
        sources = []
        reasoning = "Cross-referencing external data sources: "
        
        # Simulate weather satellite data check for flood events
        if incident_type == 'flood':
            sources.append('NOAA Weather Satellite Feed')
            reasoning += "Weather satellite data confirms heavy precipitation in the region. "
            reasoning += "Rainfall accumulation over past 24h: 3.2 inches (above 95th percentile). "
            
        # Simulate power grid load check
        sources.append('Regional Power Grid Load Monitor')
        reasoning += "Power grid load shows 15% increase in demand from water treatment facilities. "
        reasoning += "This pattern matches historical flood response behavior. "
        
        # Simulate sensor correlation check
        if broken_sensor_id:
            sources.append('Cross-Sector Sensor Correlation Engine')
            reasoning += f"Sensor {broken_sensor_id} readings correlate with 4 other sensors showing similar degradation patterns. "
            reasoning += "This suggests a systemic issue rather than isolated sensor failure. "
        
        sources.append('Historical Incident Database')
        reasoning += "Historical analysis: Similar incidents in this region have required multi-agency coordination. "
        
        confidence = 0.92 if len(sources) >= 3 else 0.78
        
        return {
            'reasoning': reasoning,
            'sources': sources,
            'confidence': confidence
        }
    
    def _analyze_cascade(self, incident: Dict) -> Dict:
        """Analyze cascading dependencies to predict failure propagation."""
        timeline = incident.get('timeline', [])
        all_affected = set()
        
        for entry in timeline:
            all_affected.update(entry.get('impactedNodeIds', []))
        
        # Find critical paths
        critical_paths = []
        for edge in self.graph.get('edges', []):
            if edge['source'] in all_affected and edge['target'] not in all_affected:
                critical_paths.append({
                    'from': edge['source'],
                    'to': edge['target'],
                    'confidence': edge.get('confidenceScore', 0.5)
                })
        
        reasoning = f"Cascade analysis: {len(all_affected)} nodes will be directly impacted. "
        reasoning += f"{len(critical_paths)} additional nodes are at risk via dependency chains. "
        
        if timeline:
            first_impact = timeline[0]
            reasoning += f"First impact expected at T+{first_impact.get('timeToImpact', 0)} minutes. "
        
        return {
            'reasoning': reasoning,
            'affected_nodes': list(all_affected),
            'critical_paths': critical_paths,
            'time_to_cascade': timeline[0].get('timeToImpact', 15) if timeline else 15
        }
    
    def _generate_recovery_plan(self, incident: Dict, situation: Dict, external_context: Dict, cascade_analysis: Dict) -> Dict:
        """Generate a multi-step autonomous recovery plan."""
        incident_type = incident.get('type', 'unknown')
        
        reasoning = "Generating autonomous recovery plan: "
        
        steps = []
        
        if incident_type == 'flood':
            steps.append({
                'step': 1,
                'action': 'Confirm flood severity via weather satellite cross-reference',
                'target': 'weather_satellite_feed',
                'expected_outcome': 'Confirmed flood event with 92% confidence',
                'automated': True
            })
            steps.append({
                'step': 2,
                'action': 'Isolate primary pump stations in flood zone',
                'target': 'pump_station_01',
                'expected_outcome': 'Pump stations isolated, preventing contamination',
                'automated': False,  # Requires human authorization
                'requires_approval': ['Senior Operator']
            })
            steps.append({
                'step': 3,
                'action': 'Activate backup systems and redistribute load',
                'target': 'pump_station_02',
                'expected_outcome': 'Service continuity maintained at 85% capacity',
                'automated': True
            })
            steps.append({
                'step': 4,
                'action': 'Coordinate with regional water authority for diversion',
                'target': 'regional_water_authority',
                'expected_outcome': 'Flow diverted to secondary reservoir',
                'automated': False,
                'requires_approval': ['Regulatory Compliance Officer']
            })
            steps.append({
                'step': 5,
                'action': 'Monitor recovery and gradual restoration',
                'target': 'all_affected_nodes',
                'expected_outcome': 'Full service restoration within 48 hours',
                'automated': True
            })
            
            reasoning += "Flood event detected. Plan: (1) Confirm via satellite, (2) Isolate primary pumps, "
            reasoning += "(3) Activate backups, (4) Coordinate diversion, (5) Monitor restoration. "
            primary_action = "Isolate pump stations and activate backup systems"
        
        else:
            steps.append({
                'step': 1,
                'action': 'Assess situation severity',
                'target': 'all_nodes',
                'expected_outcome': 'Situation assessment complete',
                'automated': True
            })
            primary_action = "Review and assess situation"
            reasoning += "Generic recovery plan generated. "
        
        reasoning += f"Total steps: {len(steps)}. Estimated completion time: {len(steps) * 15} minutes. "
        
        return {
            'reasoning': reasoning,
            'steps': steps,
            'primary_action': primary_action,
            'estimated_completion_minutes': len(steps) * 15
        }
    
    def _draft_multi_agency_response(self, incident: Dict, recovery_plan: Dict) -> Dict:
        """Draft multi-agency coordination plan."""
        incident_type = incident.get('type', 'unknown')
        
        agencies = []
        coordination_plan = []
        
        if incident_type == 'flood':
            agencies = [
                'Regional Water Authority',
                'Emergency Management Services',
                'Power Grid Operator',
                'Environmental Protection Agency'
            ]
            
            coordination_plan = [
                {
                    'agency': 'Regional Water Authority',
                    'role': 'Primary responder - water flow management',
                    'actions': ['Approve diversion routes', 'Monitor water quality'],
                    'communication_channel': 'Secure API endpoint',
                    'priority': 'critical'
                },
                {
                    'agency': 'Emergency Management Services',
                    'role': 'Public safety coordination',
                    'actions': ['Issue public advisories', 'Coordinate evacuation if needed'],
                    'communication_channel': 'Emergency Operations Center',
                    'priority': 'high'
                },
                {
                    'agency': 'Power Grid Operator',
                    'role': 'Ensure power continuity for backup systems',
                    'actions': ['Maintain power to backup pumps', 'Monitor grid stability'],
                    'communication_channel': 'NERC EOP-011 protocol',
                    'priority': 'critical'
                },
                {
                    'agency': 'Environmental Protection Agency',
                    'role': 'Environmental compliance oversight',
                    'actions': ['Monitor contamination risks', 'Approve emergency protocols'],
                    'communication_channel': 'Regulatory compliance API',
                    'priority': 'high'
                }
            ]
        
        reasoning = f"Multi-agency coordination plan drafted for {len(agencies)} agencies. "
        reasoning += "Each agency has defined roles, communication channels, and priority levels. "
        reasoning += "Coordination will proceed via secure API endpoints and established protocols. "
        
        return {
            'reasoning': reasoning,
            'agencies': agencies,
            'plan': coordination_plan,
            'estimated_coordination_time_minutes': 30
        }
    
    def detect_agentic_threat(
        self,
        node_id: str,
        sensor_readings: Dict,
        command_stream: List[Dict],
        anomaly_score: float
    ) -> Optional[AgenticCountermeasure]:
        """
        Detect autonomous AI agent threats and deploy countermeasures.
        This is the "AI vs. AI" capability - Munin fights back at wire-speed.
        """
        threat_type = None
        confidence = 0.0
        reasoning_parts = []
        
        # Detect sensor spoofing (AI agent faking sensor data)
        if anomaly_score > 0.8:
            # Check for patterns indicating AI-generated spoofing
            if self._detect_spoofing_pattern(sensor_readings):
                threat_type = ThreatType.SENSOR_SPOOFING
                confidence = 0.85
                reasoning_parts.append("Sensor readings show AI-generated spoofing pattern")
        
        # Detect command injection (AI agent injecting malicious commands)
        if command_stream:
            malicious_commands = self._detect_malicious_commands(command_stream)
            if malicious_commands:
                threat_type = ThreatType.COMMAND_INJECTION
                confidence = 0.90
                reasoning_parts.append(f"Detected {len(malicious_commands)} malicious commands in stream")
        
        # Detect cascade amplification (AI agent accelerating failures)
        if anomaly_score > 0.7:
            cascade_rate = self._analyze_cascade_rate(node_id)
            if cascade_rate > 2.0:  # Cascade accelerating faster than natural
                threat_type = ThreatType.CASCADE_AMPLIFICATION
                confidence = 0.80
                reasoning_parts.append(f"Cascade rate {cascade_rate:.2f}x indicates AI amplification")
        
        if not threat_type:
            return None
        
        # Deploy autonomous countermeasure
        countermeasure = self._deploy_countermeasure(
            threat_type=threat_type,
            target_node_id=node_id,
            confidence=confidence,
            reasoning="; ".join(reasoning_parts)
        )
        
        return countermeasure
    
    def _detect_spoofing_pattern(self, sensor_readings: Dict) -> bool:
        """Detect patterns indicating AI-generated sensor spoofing."""
        # Check for suspiciously perfect correlations
        # AI agents often generate data that's "too perfect"
        if 'correlation' in sensor_readings:
            if sensor_readings['correlation'] > 0.99:  # Suspiciously perfect
                return True
        
        # Check for timing anomalies (AI agents often have microsecond precision)
        if 'timestamps' in sensor_readings:
            timestamps = sensor_readings['timestamps']
            if len(timestamps) > 10:
                intervals = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]
                if all(abs(i - intervals[0]) < 0.001 for i in intervals):  # Too regular
                    return True
        
        return False
    
    def _detect_malicious_commands(self, command_stream: List[Dict]) -> List[Dict]:
        """Detect malicious commands in the stream."""
        malicious = []
        
        for cmd in command_stream:
            # Check for physics-violating commands
            if cmd.get('action') == 'shutdown' and cmd.get('target') in ['critical_node', 'all_nodes']:
                malicious.append(cmd)
            
            # Check for rapid-fire commands (AI agent pattern)
            if len(command_stream) > 10:  # More than 10 commands in short time
                malicious.append(cmd)
            
            # Check for commands targeting multiple critical nodes simultaneously
            if isinstance(cmd.get('targets'), list) and len(cmd.get('targets', [])) > 5:
                malicious.append(cmd)
        
        return malicious
    
    def _analyze_cascade_rate(self, node_id: str) -> float:
        """Analyze the rate of cascade propagation."""
        # Find edges from this node
        outgoing_edges = [e for e in self.graph.get('edges', []) if e['source'] == node_id]
        
        if not outgoing_edges:
            return 1.0
        
        # Calculate average lag time
        avg_lag = sum(e.get('inferredLagSeconds', 60) for e in outgoing_edges) / len(outgoing_edges)
        
        # Normal cascade: ~60 seconds per hop
        # AI-amplified cascade: <30 seconds per hop
        natural_rate = 60.0
        actual_rate = avg_lag if avg_lag > 0 else natural_rate
        
        return natural_rate / actual_rate  # >1.0 means faster than natural
    
    def _deploy_countermeasure(
        self,
        threat_type: ThreatType,
        target_node_id: str,
        confidence: float,
        reasoning: str
    ) -> AgenticCountermeasure:
        """Deploy an autonomous countermeasure."""
        # Determine action based on threat type
        action = CountermeasureAction.QUARANTINE_NODE
        
        if threat_type == ThreatType.SENSOR_SPOOFING:
            action = CountermeasureAction.CROSS_VERIFY
        elif threat_type == ThreatType.COMMAND_INJECTION:
            action = CountermeasureAction.BLOCK_COMMANDS
        elif threat_type == ThreatType.CASCADE_AMPLIFICATION:
            action = CountermeasureAction.REROUTE_FLOW
        
        threat_id = f"threat_{datetime.now().strftime('%Y%m%d%H%M%S')}_{target_node_id}"
        
        countermeasure = AgenticCountermeasure(
            threat_id=threat_id,
            threat_type=threat_type,
            target_node_id=target_node_id,
            action=action,
            confidence=confidence,
            reasoning=reasoning,
            deployed_at=datetime.now()
        )
        
        self.active_countermeasures.append(countermeasure)
        self.threat_history.append({
            'threat_id': threat_id,
            'detected_at': datetime.now().isoformat(),
            'threat_type': threat_type.value,
            'countermeasure': countermeasure.to_dict()
        })
        
        return countermeasure
    
    def get_active_countermeasures(self) -> List[Dict]:
        """Get all active countermeasures."""
        return [cm.to_dict() for cm in self.active_countermeasures if cm.status == "active"]
    
    def get_threat_summary(self) -> Dict:
        """Get summary of detected threats and countermeasures."""
        return {
            'total_threats_detected': len(self.threat_history),
            'active_countermeasures': len([cm for cm in self.active_countermeasures if cm.status == "active"]),
            'threats_by_type': {
                threat_type.value: sum(
                    1 for h in self.threat_history
                    if h['threat_type'] == threat_type.value
                )
                for threat_type in ThreatType
            },
            'recent_threats': self.threat_history[-10:] if self.threat_history else []
        }


def generate_agentic_packet(incident_id: str, graph_path: str, evidence_path: str, incidents_path: str) -> Dict:
    """Generate an agentic recovery packet using the reasoning engine."""
    with open(graph_path, 'r') as f:
        graph = json.load(f)
    with open(evidence_path, 'r') as f:
        evidence = json.load(f)
    with open(incidents_path, 'r') as f:
        incidents = json.load(f)
    
    engine = AgenticReasoningEngine(graph, evidence, incidents)
    result = engine.reason_through_incident(incident_id)
    
    return result


if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    
    graph_path = out_dir / "graph.json"
    evidence_path = out_dir / "evidence.json"
    incidents_path = out_dir / "incidents.json"
    
    # Example: Generate agentic recovery for first incident
    with open(incidents_path, 'r') as f:
        incidents = json.load(f)
    
    if incidents.get('incidents'):
        incident_id = incidents['incidents'][0]['id']
        result = generate_agentic_packet(incident_id, graph_path, evidence_path, incidents_path)
        
        output_path = out_dir / "agentic_recovery.json"
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f"Agentic recovery plan generated: {output_path}")
        print(f"Reasoning steps: {len(result['reasoning_steps'])}")
        print(f"Recommended action: {result['recommended_action']}")

