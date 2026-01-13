"""
Integration between Python packetize.py and TypeScript decision system.
Creates decisions when packets are generated and handles approval workflow.
"""
import json
import requests
from typing import Dict, Optional
from pathlib import Path

# API base URL (adjust for your environment)
API_BASE_URL = "http://localhost:3000/api"

def create_decision_from_packet(
    packet: Dict,
    incident_id: str,
    playbook_id: str
) -> Optional[Dict]:
    """
    Create a decision in the TypeScript system from a Python-generated packet.
    
    Args:
        packet: Handshake packet from packetize.py
        incident_id: Incident identifier
        playbook_id: Playbook identifier
        
    Returns:
        Decision object or None if creation failed
    """
    # Extract policy from packet's multi-sig requirements
    multi_sig = packet.get('multiSig', {})
    threshold = multi_sig.get('threshold', 1)
    required = multi_sig.get('required', 1)
    
    # Extract signers from packet's approvals
    signers = []
    for approval in packet.get('approvals', []):
        role = approval.get('role', '')
        if role:
            # Map role to signer_id (you may need to adjust this mapping)
            signer_id = f"signer_{role.lower().replace(' ', '_')}"
            signers.append(signer_id)
    
    # If no signers found, use default
    if not signers:
        signers = ['signer_senior_operator']
    
    policy = {
        'threshold': threshold,
        'required': required,
        'signers': signers
    }
    
    # Determine action type from packet
    action_type = packet.get('proposedAction', 'UNKNOWN_ACTION')
    scope = packet.get('scope', {})
    
    # Create decision via API
    try:
        response = requests.post(
            f"{API_BASE_URL}/decisions/create",
            json={
                'incident_id': incident_id,
                'playbook_id': playbook_id,
                'step_id': None,
                'policy': policy,
                'previous_decision_hash': None  # Can be chained if needed
            },
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            decision = result.get('decision')
            
            # Log decision creation
            print(f"✅ Decision created: {decision.get('decision_id')}")
            print(f"   Policy: {threshold}-of-{required} from {len(signers)} signers")
            
            return decision
        else:
            print(f"⚠️  Failed to create decision: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Error calling decision API: {e}")
        print(f"   Make sure Next.js server is running: npm run dev")
        return None

def sign_decision(
    decision_id: str,
    signer_id: str,
    signature: str,
    key_id: str,
    action_type: str,
    scope: Dict,
    decision_data: Optional[Dict] = None
) -> Optional[Dict]:
    """
    Sign a decision via the TypeScript API.
    
    Args:
        decision_id: Decision identifier
        signer_id: Signer identifier
        signature: Ed25519 signature (base64)
        key_id: Key identifier
        action_type: Action type
        scope: Action scope
        
    Returns:
        Signature result or None if signing failed
    """
    try:
        response = requests.post(
            f"{API_BASE_URL}/decisions/sign",
            json={
                'decision_id': decision_id,
                'signer_id': signer_id,
                'signature': signature,
                'key_id': key_id,
                'action_type': action_type,
                'scope': scope
            },
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Decision signed by {signer_id}")
            if result.get('decision', {}).get('authorized'):
                print(f"   🎉 Decision AUTHORIZED! Threshold met.")
            else:
                sigs_received = result.get('decision', {}).get('signatures_received', 0)
                threshold = result.get('decision', {}).get('threshold', 0)
                print(f"   Status: {sigs_received}/{threshold} signatures")
            return result
        else:
            print(f"⚠️  Failed to sign decision: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Error calling sign API: {e}")
        return None

def integrate_packet_with_decisions(
    packet: Dict,
    incident_id: str,
    playbook_id: str,
    output_dir: Path
) -> Optional[str]:
    """
    Integrate a packet with the decision system.
    Creates a decision and saves decision_id to packet metadata.
    
    Args:
        packet: Handshake packet
        incident_id: Incident identifier
        playbook_id: Playbook identifier
        output_dir: Output directory for saving metadata
        
    Returns:
        Decision ID or None if integration failed
    """
    # Create decision
    decision = create_decision_from_packet(packet, incident_id, playbook_id)
    
    if not decision:
        return None
    
    decision_id = decision.get('decision_id')
    
    # Add decision_id to packet metadata
    if 'metadata' not in packet:
        packet['metadata'] = {}
    packet['metadata']['decision_id'] = decision_id
    
    # Save updated packet
    packet_path = output_dir / 'packets' / f"{packet['id']}.json"
    packet_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(packet_path, 'w') as f:
        json.dump(packet, f, indent=2)
    
    # Save decision metadata separately
    decision_meta_path = output_dir / 'decisions' / f"{decision_id}.json"
    decision_meta_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(decision_meta_path, 'w') as f:
        json.dump({
            'decision_id': decision_id,
            'packet_id': packet['id'],
            'incident_id': incident_id,
            'playbook_id': playbook_id,
            'status': decision.get('status'),
            'policy': decision.get('policy')
        }, f, indent=2)
    
    print(f"📝 Decision metadata saved: {decision_meta_path}")
    
    return decision_id

if __name__ == '__main__':
    # Example usage
    print("Decision Integration Module")
    print("Use integrate_packet_with_decisions() to connect packets to decisions")
