"""Replay harness for shadow mode - batch evaluation of historical incidents."""
import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import pandas as pd

from shadow_simulation import ShadowModeEngine, HumanAction, MuninPrediction


class ShadowReplayHarness:
    """
    Replay harness that feeds historical incidents + human actions
    into shadow_simulation.py for batch evaluation.
    """
    
    def __init__(self, shadow_engine: ShadowModeEngine):
        """Initialize replay harness with shadow engine."""
        self.shadow_engine = shadow_engine
        self.replay_results: List[Dict] = []
    
    def load_historical_incidents(self, incidents_path: Path) -> List[Dict]:
        """Load historical incidents from JSON file."""
        with open(incidents_path, 'r') as f:
            data = json.load(f)
        return data.get('incidents', [])
    
    def load_human_actions(self, actions_path: Path) -> List[Dict]:
        """Load human actions from JSONL file (one action per line)."""
        actions = []
        with open(actions_path, 'r') as f:
            for line in f:
                if line.strip():
                    actions.append(json.loads(line))
        return actions
    
    def replay_incident(
        self,
        incident: Dict,
        human_action_data: Dict,
        graph: Dict,
        evidence: Dict
    ) -> Dict:
        """
        Replay a single incident through shadow mode.
        
        Returns comparison result.
        """
        # Create HumanAction from data
        human_action = HumanAction(
            timestamp=datetime.fromisoformat(human_action_data['timestamp']),
            action_type=human_action_data['action_type'],
            description=human_action_data['description'],
            target_nodes=human_action_data['target_nodes'],
            duration_seconds=human_action_data['duration_seconds'],
            outcome=human_action_data.get('outcome', 'unknown'),
            operator_id=human_action_data.get('operator_id'),
            coordination_parties=human_action_data.get('coordination_parties', [])
        )
        
        # Record human action
        recorded_action = self.shadow_engine.record_human_action(
            action_type=human_action.action_type,
            description=human_action.description,
            target_nodes=human_action.target_nodes,
            duration_seconds=human_action.duration_seconds,
            outcome=human_action.outcome,
            operator_id=human_action.operator_id,
            coordination_parties=human_action.coordination_parties
        )
        
        # Generate Munin prediction
        munin_prediction = self.shadow_engine.generate_munin_prediction(
            incident_id=incident['id'],
            incident_data=incident,
            graph=graph,
            evidence=evidence
        )
        
        # Compare
        comparison = self.shadow_engine.compare_human_vs_munin(
            incident_id=incident['id'],
            human_action=recorded_action,
            munin_prediction=munin_prediction
        )
        
        return {
            'incident_id': incident['id'],
            'comparison': comparison,
            'human_action': recorded_action,
            'munin_prediction': munin_prediction
        }
    
    def batch_replay(
        self,
        incidents: List[Dict],
        human_actions_map: Dict[str, Dict],  # incident_id -> human_action_data
        graph: Dict,
        evidence: Dict
    ) -> List[Dict]:
        """
        Replay multiple incidents in batch.
        
        Args:
            incidents: List of incident dictionaries
            human_actions_map: Map of incident_id -> human_action_data
            graph: Dependency graph
            evidence: Evidence windows
        
        Returns:
            List of replay results
        """
        results = []
        
        for incident in incidents:
            incident_id = incident['id']
            if incident_id not in human_actions_map:
                print(f"Warning: No human action found for incident {incident_id}")
                continue
            
            try:
                result = self.replay_incident(
                    incident=incident,
                    human_action_data=human_actions_map[incident_id],
                    graph=graph,
                    evidence=evidence
                )
                results.append(result)
            except Exception as e:
                print(f"Error replaying incident {incident_id}: {e}")
                continue
        
        self.replay_results.extend(results)
        return results
    
    def save_replay_results(self, output_path: Path):
        """Save replay results to JSON file."""
        results_data = {
            'replay_timestamp': datetime.now().isoformat(),
            'total_incidents': len(self.replay_results),
            'results': [
                {
                    'incident_id': r['incident_id'],
                    'time_saved_seconds': r['comparison'].time_saved_seconds,
                    'damage_prevented_estimate': r['comparison'].damage_prevented_estimate,
                    'improvement_ratio': r['comparison'].improvement_ratio
                }
                for r in self.replay_results
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"Replay results saved to {output_path}")


if __name__ == "__main__":
    # Example usage
    shadow_engine = ShadowModeEngine(shadow_mode_duration_days=365)
    harness = ShadowReplayHarness(shadow_engine)
    
    # Load data
    incidents_path = Path("engine/out/incidents.json")
    graph_path = Path("engine/out/graph.json")
    evidence_path = Path("engine/out/evidence.json")
    
    if incidents_path.exists() and graph_path.exists() and evidence_path.exists():
        incidents = harness.load_historical_incidents(incidents_path)
        
        with open(graph_path, 'r') as f:
            graph = json.load(f)
        
        with open(evidence_path, 'r') as f:
            evidence = json.load(f)
        
        # Create mock human actions (in real scenario, load from logs)
        human_actions_map = {
            incident['id']: {
                'timestamp': datetime.now().isoformat(),
                'action_type': 'coordination',
                'description': f"Human response to {incident['id']}",
                'target_nodes': incident.get('impacted_nodes', [])[:3],
                'duration_seconds': 14400,  # 4 hours
                'outcome': 'success'
            }
            for incident in incidents[:5]  # Limit to first 5 for demo
        }
        
        # Run batch replay
        results = harness.batch_replay(incidents[:5], human_actions_map, graph, evidence)
        
        # Save results
        harness.save_replay_results(Path("engine/out/shadow_replay_results.json"))
        
        print(f"Replayed {len(results)} incidents")
    else:
        print("Required files not found. Run engine pipeline first.")
