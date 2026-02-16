"""Generate Authoritative Handshake packets from incidents."""
import json
import hashlib
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from liability_shield import LiabilityShield
from byzantine_resilience import ByzantineResilienceEngine, integrate_byzantine_multi_sig_into_packet
from audit_log import get_audit_log

# Optional: Import decision integration (requires Next.js API to be running)
try:
    from decision_integration import integrate_packet_with_decisions
    DECISION_INTEGRATION_AVAILABLE = True
except ImportError:
    DECISION_INTEGRATION_AVAILABLE = False
    print("Note: Decision integration not available (decision_integration.py not found)")

def compute_data_hash(data: str) -> str:
    """Compute SHA-256 hash of data."""
    return hashlib.sha256(data.encode()).hexdigest()

def generate_merkle_receipt(packet_content: str, previous_hash: Optional[str] = None) -> Dict:
    """Generate Merkle-proof receipt for a packet, chaining to previous packet."""
    packet_hash = compute_data_hash(packet_content)
    
    if previous_hash:
        combined = f"{previous_hash}:{packet_hash}"
    else:
        combined = packet_hash
    
    receipt_hash = compute_data_hash(combined)
    
    return {
        'previousHash': previous_hash,
        'packetHash': packet_hash,
        'receiptHash': receipt_hash
    }

def determine_multi_sig_requirements(playbook: Dict, incident: Dict) -> Dict:
    """Determine multi-sig requirements based on playbook risk level and incident scope."""
    # Check for minimum_sign_off setting in playbook
    approval_roles = playbook.get('approval_required', [])
    
    # Check if any role has minimum_sign_off: true
    has_minimum_sign_off = False
    minimum_sign_off_role = None
    for role in approval_roles:
        if isinstance(role, dict) and role.get('minimum_sign_off', False):
            has_minimum_sign_off = True
            minimum_sign_off_role = role.get('role', '')
            break
    
    # If minimum_sign_off is enabled, require only 1 signature
    if has_minimum_sign_off:
        return {
            'required': len(approval_roles),
            'threshold': 1,  # Only need 1 signature (the minimum_sign_off role)
            'currentSignatures': 0,
            'minimumSignOff': True,
            'minimumSignOffRole': minimum_sign_off_role
        }
    
    # High-risk indicators
    high_risk_indicators = [
        len(incident.get('timeline', [])) > 5,  # Complex timeline
        any('critical' in str(e).lower() for e in incident.get('timeline', [])),  # Critical events
        playbook.get('type') in ['power_instability', 'flood'],  # High-impact playbooks
    ]
    
    is_high_risk = any(high_risk_indicators)
    num_required = len(approval_roles)
    
    # For high-risk operations, require 2-of-3 (or M-of-N)
    if is_high_risk and num_required >= 2:
        # Add a third agency (e.g., Defense/National Security) for high-risk
        threshold = 2
        required = 3
    else:
        # Standard: all required signers must sign
        threshold = num_required
        required = num_required
    
    return {
        'required': required,
        'threshold': threshold,
        'currentSignatures': 0
    }

def generate_packet(
    incident: Dict[str, Any],
    playbook_id: str,
    graph: Dict[str, Any],
    evidence: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate a handshake packet from an incident.
    
    Args:
        incident: Incident dictionary with 'id', 'type', 'timeline' fields
        playbook_id: Identifier for the playbook to use
        graph: Dependency graph with 'nodes' and 'edges'
        evidence: Evidence windows dictionary with 'windows' list
    
    Returns:
        Validated handshake packet dictionary
    
    Raises:
        ValueError: If required fields are missing or invalid
    """
    # Validate inputs
    if not isinstance(incident, dict):
        raise ValueError("incident must be a dictionary")
    if 'id' not in incident:
        raise ValueError("incident must have 'id' field")
    if 'type' not in incident:
        raise ValueError("incident must have 'type' field")
    if 'timeline' not in incident:
        raise ValueError("incident must have 'timeline' field")
    if not isinstance(playbook_id, str) or not playbook_id:
        raise ValueError("playbook_id must be a non-empty string")
    if not isinstance(graph, dict) or 'nodes' not in graph or 'edges' not in graph:
        raise ValueError("graph must be a dictionary with 'nodes' and 'edges' fields")
    if not isinstance(evidence, dict) or 'windows' not in evidence:
        raise ValueError("evidence must be a dictionary with 'windows' field")
    created_ts = datetime.now()
    packet_id = f"packet_{incident['id']}_{created_ts.strftime('%Y%m%d%H%M%S')}"
    
    # Determine scope from incident timeline
    all_impacted: Set[str] = set()
    for timeline_entry in incident['timeline']:
        if not isinstance(timeline_entry, dict):
            raise ValueError("timeline entries must be dictionaries")
        if 'impactedNodeIds' not in timeline_entry:
            raise ValueError("timeline entries must have 'impactedNodeIds' field")
        node_ids = timeline_entry['impactedNodeIds']
        if not isinstance(node_ids, list):
            raise ValueError("impactedNodeIds must be a list")
        all_impacted.update(node_ids)
    
    # Get regions from nodes
    node_regions: Dict[str, str] = {}
    for node in graph['nodes']:
        if not isinstance(node, dict) or 'id' not in node:
            raise ValueError("Graph nodes must be dictionaries with 'id' field")
        node_regions[node['id']] = node.get('region', 'unknown')
    
    regions: List[str] = list(set(node_regions.get(nid, 'unknown') for nid in all_impacted))
    
    # Map incident type to playbook and regulatory basis
    regulatory_map = {
        'flood': 'Complies with 2026 Flood Resilience Act, Section 4.2',
        'drought': 'Complies with 2026 Drought Resilience Act, Section 4',
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
    relevant_evidence: List[Dict[str, Any]] = []
    for e in evidence['windows']:
        if not isinstance(e, dict):
            continue
        # Check if evidence relates to impacted nodes
        evidence_nodes = e.get('sourceNodeId', '') + ' ' + e.get('targetNodeId', '')
        if any(nid in evidence_nodes for nid in all_impacted):
            if 'robustness' in e and isinstance(e['robustness'], (int, float)):
                relevant_evidence.append(e)
    
    if relevant_evidence:
        robustness_values = [e['robustness'] for e in relevant_evidence]
        avg_confidence = sum(robustness_values) / len(robustness_values)
        uncertainty = float(max(0.0, min(1.0, 1.0 - avg_confidence)))
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
    
    # Compute technical verification
    # Simulated success probability based on evidence quality and scope
    base_success_prob = 0.95
    if uncertainty > 0.3:
        base_success_prob -= 0.1
    if len(all_impacted) > 15:
        base_success_prob -= 0.05
    
    # Constraints (simplified - would come from playbook in real system)
    constraints_satisfied = [
        'Valve capacity within limits',
        'Pressure limits respected',
        'Safety interlocks verified',
    ]
    
    # Check for potential constraint violations
    constraints_failed = []
    if len(all_impacted) > 20:
        constraints_failed.append('Large scope may exceed coordination capacity')
    
    technical_verification = {
        'simulatedSuccessProb': float(max(0.0, min(1.0, base_success_prob))),
        'constraintsSatisfied': constraints_satisfied,
    }
    if constraints_failed:
        technical_verification['constraintsFailed'] = constraints_failed
    
    # Actuator boundary
    actuator_boundary = {
        'writesToHardware': False,
        'notes': 'No direct OT writes. Human authorization required for all actuator commands. This packet provides permission and coordination framework only.'
    }
    
    # Validate evidence refs
    evidence_refs: List[str] = []
    for e in relevant_evidence[:5]:
        if 'id' in e and isinstance(e['id'], str):
            evidence_refs.append(e['id'])
    
    # Validate packet fields
    packet: Dict[str, Any] = {
        'id': str(packet_id),
        'version': int(1),
        'createdTs': str(created_ts.isoformat()),
        'firstApprovalTs': None,  # Will be set when first approval is received
        'authorizedTs': None,  # Will be set when authorization threshold is met
        'timeToAuthorize': None,  # Will be calculated when authorized
        'status': str('ready'),
        'scope': {
            'regions': [str(r) for r in regions],
            'nodeIds': [str(nid) for nid in sorted(all_impacted)],
        },
        'situationSummary': str(summary_map.get(incident['type'], 'Unknown incident type')),
        'proposedAction': str(action_map.get(incident['type'], 'Review and assess')),
        'regulatoryBasis': str(regulatory_map.get(incident['type'], 'General emergency protocols')),
        'playbookId': str(playbook_id),
        'evidenceRefs': evidence_refs,
        'uncertainty': {
            'overall': float(uncertainty),
            'notes': [str(note) for note in uncertainty_notes]
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
            'modelVersion': str('prototype_v1'),
            'configHash': str(config_hash),
            'dataHash': str(data_hash)
        },
        'technicalVerification': technical_verification,
        'actuatorBoundary': actuator_boundary
    }
    
    # Validate packet structure matches schema
    _validate_packet_structure(packet)
    
    return packet


def _validate_packet_structure(packet: Dict[str, Any]) -> None:
    """Validate packet structure matches expected schema."""
    required_fields = [
        'id', 'version', 'createdTs', 'status', 'scope',
        'situationSummary', 'proposedAction', 'regulatoryBasis',
        'playbookId', 'evidenceRefs', 'uncertainty', 'approvals',
        'provenance'
    ]
    
    for field in required_fields:
        if field not in packet:
            raise ValueError(f"Packet missing required field: {field}")
    
    # Validate types
    if not isinstance(packet['id'], str):
        raise ValueError("Packet 'id' must be a string")
    if not isinstance(packet['version'], int):
        raise ValueError("Packet 'version' must be an integer")
    if not isinstance(packet['scope'], dict):
        raise ValueError("Packet 'scope' must be a dictionary")
    if 'regions' not in packet['scope'] or not isinstance(packet['scope']['regions'], list):
        raise ValueError("Packet 'scope.regions' must be a list")
    if 'nodeIds' not in packet['scope'] or not isinstance(packet['scope']['nodeIds'], list):
        raise ValueError("Packet 'scope.nodeIds' must be a list")
    if not isinstance(packet['uncertainty'], dict) or 'overall' not in packet['uncertainty']:
        raise ValueError("Packet 'uncertainty' must be a dictionary with 'overall' field")
    if not (0.0 <= packet['uncertainty']['overall'] <= 1.0):
        raise ValueError("Packet 'uncertainty.overall' must be between 0.0 and 1.0")

def packetize_incidents(
    incidents_path: Path,
    graph_path: Path,
    evidence_path: Path,
    playbooks_dir: Path,
    output_dir: Path
):
    """Generate packets for all incidents with Merkle-proof receipts."""
    with open(incidents_path, 'r') as f:
        incidents_data = json.load(f)
    
    with open(graph_path, 'r') as f:
        graph = json.load(f)
    
    with open(evidence_path, 'r') as f:
        evidence = json.load(f)
    
    # Map incident types to playbooks
    # Try Carlisle playbook first, fallback to original if not found
    playbook_map = {
        'flood': 'carlisle_flood_gate_coordination.yaml',  # Use Carlisle playbook for flood incidents
        'drought': 'drought_reservoir_diversion.yaml',
        'power_instability': 'power_frequency_instability.yaml',
    }
    
    # Fallback playbooks if primary not found
    playbook_fallback = {
        'flood': 'flood_event_pump_isolation.yaml',
    }
    
    output_dir.mkdir(exist_ok=True)
    
    # Get existing packets to chain from (for Merkle receipts)
    existing_packets = []
    if output_dir.exists():
        for packet_file in output_dir.glob('*.json'):
            try:
                with open(packet_file, 'r') as f:
                    existing_packet = json.load(f)
                    if existing_packet.get('merkle', {}).get('receiptHash'):
                        existing_packets.append(existing_packet)
            except:
                pass
    
    # Sort by creation time to get latest
    existing_packets.sort(key=lambda p: p.get('createdTs', ''), reverse=True)
    previous_hash = existing_packets[0].get('merkle', {}).get('receiptHash') if existing_packets else None
    
    for incident in incidents_data['incidents']:
        playbook_id = playbook_map.get(incident['type'], 'default.yaml')
        playbook_path = playbooks_dir / playbook_id
        
        # Load playbook to determine multi-sig requirements
        playbook = {}
        if playbook_path.exists():
            with open(playbook_path, 'r') as f:
                playbook = yaml.safe_load(f)
        else:
            # Try fallback playbook
            fallback_id = playbook_fallback.get(incident['type'])
            if fallback_id:
                fallback_path = playbooks_dir / fallback_id
                if fallback_path.exists():
                    playbook_id = fallback_id
                    playbook_path = fallback_path
                    with open(playbook_path, 'r') as f:
                        playbook = yaml.safe_load(f)
                    print(f"Using fallback playbook: {fallback_id}")
                else:
                    print(f"Warning: Playbook {playbook_id} and fallback {fallback_id} not found, using default")
                    playbook_id = 'default.yaml'
            else:
                print(f"Warning: Playbook {playbook_id} not found, using default")
                playbook_id = 'default.yaml'
        
        packet = generate_packet(incident, playbook_id, graph, evidence)
        
        # Determine multi-sig requirements
        multi_sig = determine_multi_sig_requirements(playbook, incident)
        packet['multiSig'] = multi_sig
        
        # Add Byzantine multi-sig for high-consequence actions (treason-proofing)
        byzantine_engine = ByzantineResilienceEngine()
        packet = integrate_byzantine_multi_sig_into_packet(packet, byzantine_engine)
        
        # Add statutory compliance (Liability Shield)
        shield = LiabilityShield(jurisdiction='national')
        packet = shield.enhance_handshake_with_compliance(packet, playbook)
        
        # Update approvals list if multi-sig requires more signers
        if multi_sig['required'] > len(packet['approvals']):
            # Add additional required roles for high-risk operations
            additional_roles = ['Defense Coordination Officer', 'National Security Liaison']
            for role in additional_roles[:multi_sig['required'] - len(packet['approvals'])]:
                packet['approvals'].append({'role': role})
        
        # Generate Merkle receipt (chain to previous packet)
        packet_json = json.dumps(packet, sort_keys=True)
        merkle_receipt = generate_merkle_receipt(packet_json, previous_hash)
        packet['merkle'] = merkle_receipt
        
        # Update previous_hash for next iteration
        previous_hash = merkle_receipt['receiptHash']
        
        packet_path = output_dir / f"{packet['id']}.json"
        with open(packet_path, 'w') as f:
            json.dump(packet, f, indent=2)
        
        print(f"Packet generated: {packet['id']} (Merkle: {merkle_receipt['receiptHash'][:16]}...)")
        
        # Integrate with decision system (if available)
        if DECISION_INTEGRATION_AVAILABLE:
            try:
                decision_id = integrate_packet_with_decisions(
                    packet, 
                    incident['id'], 
                    playbook_id,
                    output_dir.parent  # Pass parent dir to create decisions/ subdirectory
                )
                if decision_id:
                    print(f"   Decision created: {decision_id}")
            except Exception as e:
                print(f"   ⚠️  Decision integration failed: {e}")
        
        # Log packet creation to audit log
        audit_log.append(
            action='create',
            actor='system',
            packet_id=packet['id'],
            metadata={
                'playbook_id': playbook_id,
                'incident_type': incident['type'],
                'merkle_receipt_hash': merkle_receipt['receiptHash'],
                'status': packet['status']
            }
        )
    
    # Initialize immutable audit log (for final summary)
    audit_log = get_audit_log(output_dir.parent)
    verification = audit_log.verify_chain()
    if verification['valid']:
        print(f"\n✅ Audit log chain verified: {verification['entries_checked']} entries")
    else:
        print(f"\n⚠️  Audit log verification failed: {verification.get('errors', [])}")

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    out_dir = script_dir / "out"
    playbooks_dir = script_dir.parent / "playbooks"
    
    incidents_path = out_dir / "incidents.json"
    graph_path = out_dir / "graph.json"
    evidence_path = out_dir / "evidence.json"
    packets_dir = out_dir / "packets"
    
    packetize_incidents(incidents_path, graph_path, evidence_path, playbooks_dir, packets_dir)

