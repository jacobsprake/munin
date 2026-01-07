"""Generate Authoritative Handshake packets from incidents."""
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List

def compute_data_hash(data: str) -> str:
    """Compute SHA-256 hash of data."""
    return hashlib.sha256(data.encode()).hexdigest()

def generate_packet(
    incident: Dict,
    playbook_id: str,
    graph: Dict,
    evidence: Dict
) -> Dict:
    """Generate a handshake packet from an incident."""
    packet_id = f"packet_{incident['id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Determine scope from incident timeline
    all_impacted = set()
    for timeline_entry in incident['timeline']:
        all_impacted.update(timeline_entry['impactedNodeIds'])
    
    # Get regions from nodes
    node_regions = {}
    for node in graph['nodes']:
        node_regions[node['id']] = node['region']
    
    regions = list(set(node_regions.get(nid, 'unknown') for nid in all_impacted))
    
    # Map incident type to playbook and regulatory basis
    regulatory_map = {
        'flood': 'Complies with 2024 Flood Resilience Act, Section 4.2',
        'drought': 'Complies with 2024 Drought Resilience Act, Section 4',
        'power_instability': 'Complies with NERC Reliability Standards, EOP-011',
    }
    
    action_map = {
        'flood': 'Isolate affected pump stations and divert flow to backup reservoirs',
        'drought': 'Divert 40% flow from Reservoir Alpha to Reservoir Beta',
        'power_instability': 'Initiate frequency stabilization protocol and load shedding',
    }
    
    summary_map = {
        'flood': f"Flood event detected affecting {len(all_impacted)} nodes. Cascading impact predicted across water infrastructure.",
        'drought': f"Drought conditions detected. Reservoir levels critical. Predicted impact to {len(all_impacted)} dependent nodes.",
        'power_instability': f"Power frequency instability detected. Grid stability at risk. {len(all_impacted)} nodes predicted to be impacted.",
    }
    
    # Compute uncertainty from evidence
    relevant_evidence = [e for e in evidence['windows'] 
                        if any(nid in str(e) for nid in all_impacted)]
    if relevant_evidence:
        avg_confidence = sum(e['robustness'] for e in relevant_evidence) / len(relevant_evidence)
        uncertainty = 1.0 - avg_confidence
    else:
        uncertainty = 0.3
    
    uncertainty_notes = []
    if uncertainty > 0.2:
        uncertainty_notes.append('Limited historical evidence for this scenario')
    if len(all_impacted) > 10:
        uncertainty_notes.append('Large blast radius increases prediction uncertainty')
    
    # Generate provenance hashes
    graph_json = json.dumps(graph, sort_keys=True)
    evidence_json = json.dumps(evidence, sort_keys=True)
    config_hash = compute_data_hash('prototype_v1')
    data_hash = compute_data_hash(graph_json + evidence_json)
    
    packet = {
        'id': packet_id,
        'version': 1,
        'createdTs': datetime.now().isoformat(),
        'status': 'ready',
        'scope': {
            'regions': regions,
            'nodeIds': list(all_impacted),
        },
        'situationSummary': summary_map.get(incident['type'], 'Unknown incident type'),
        'proposedAction': action_map.get(incident['type'], 'Review and assess'),
        'regulatoryBasis': regulatory_map.get(incident['type'], 'General emergency protocols'),
        'playbookId': playbook_id,
        'evidenceRefs': [e['id'] for e in relevant_evidence[:5]],  # Top 5 evidence refs
        'uncertainty': {
            'overall': float(uncertainty),
            'notes': uncertainty_notes
        },
        'approvals': [
            {
                'role': 'Senior Operator',
            },
            {
                'role': 'Regulatory Compliance Officer',
            }
        ],
        'provenance': {
            'modelVersion': 'prototype_v1',
            'configHash': config_hash,
            'dataHash': data_hash
        }
    }
    
    return packet

def packetize_incidents(
    incidents_path: Path,
    graph_path: Path,
    evidence_path: Path,
    playbooks_dir: Path,
    output_dir: Path
):
    """Generate packets for all incidents."""
    with open(incidents_path, 'r') as f:
        incidents_data = json.load(f)
    
    with open(graph_path, 'r') as f:
        graph = json.load(f)
    
    with open(evidence_path, 'r') as f:
        evidence = json.load(f)
    
    # Map incident types to playbooks
    playbook_map = {
        'flood': 'flood_event_pump_isolation.yaml',
        'drought': 'drought_reservoir_diversion.yaml',
        'power_instability': 'power_frequency_instability.yaml',
    }
    
    output_dir.mkdir(exist_ok=True)
    
    for incident in incidents_data['incidents']:
        playbook_id = playbook_map.get(incident['type'], 'default.yaml')
        playbook_path = playbooks_dir / playbook_id
        
        if not playbook_path.exists():
            print(f"Warning: Playbook {playbook_id} not found, using default")
            playbook_id = 'default.yaml'
        
        packet = generate_packet(incident, playbook_id, graph, evidence)
        
        packet_path = output_dir / f"{packet['id']}.json"
        with open(packet_path, 'w') as f:
            json.dump(packet, f, indent=2)
        
        print(f"Packet generated: {packet['id']}")
    
    # Initialize audit log if it doesn't exist
    audit_path = output_dir.parent / 'audit.jsonl'
    if not audit_path.exists():
        audit_path.touch()

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    playbooks_dir = script_dir.parent / "playbooks"
    
    incidents_path = out_dir / "incidents.json"
    graph_path = out_dir / "graph.json"
    evidence_path = out_dir / "evidence.json"
    packets_dir = out_dir / "packets"
    
    packetize_incidents(incidents_path, graph_path, evidence_path, playbooks_dir, packets_dir)

