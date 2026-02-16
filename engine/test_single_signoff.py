"""
Test Single Sign-Off Workflow
Verifies that minimum_sign_off: true in playbook results in 1-of-1 approval.
"""
import json
import yaml
from pathlib import Path
from datetime import datetime
import sys

sys.path.insert(0, str(Path(__file__).parent))

from packetize import determine_multi_sig_requirements

def test_single_signoff():
    """Test that single sign-off playbook results in threshold=1."""
    
    # Load playbook
    playbook_path = Path(__file__).parent.parent / "playbooks" / "carlisle_flood_gate_coordination.yaml"
    
    if not playbook_path.exists():
        print(f"❌ Playbook not found: {playbook_path}")
        return False
    
    with open(playbook_path, 'r') as f:
        playbook = yaml.safe_load(f)
    
    # Create test incident
    incident = {
        'id': 'test_incident_001',
        'type': 'flood',
        'timeline': [
            {
                'timestamp': datetime.now().isoformat(),
                'event': 'threshold_breach',
                'impactedNodeIds': ['eden_sands_centre'],
                'severity': 'warning'
            }
        ]
    }
    
    # Determine multi-sig requirements
    multi_sig = determine_multi_sig_requirements(playbook, incident)
    
    print("=" * 60)
    print("Single Sign-Off Workflow Test")
    print("=" * 60)
    print(f"\nPlaybook: {playbook_path.name}")
    print(f"Playbook ID: {playbook.get('id', 'N/A')}")
    
    # Check approval roles
    approval_roles = playbook.get('approval_required', [])
    print(f"\nApproval Roles:")
    for role in approval_roles:
        role_name = role.get('role', 'Unknown') if isinstance(role, dict) else role
        min_signoff = role.get('minimum_sign_off', False) if isinstance(role, dict) else False
        print(f"  - {role_name}: minimum_sign_off={min_signoff}")
    
    print(f"\nMulti-Sig Requirements:")
    print(f"  Required: {multi_sig.get('required', 'N/A')}")
    print(f"  Threshold: {multi_sig.get('threshold', 'N/A')}")
    print(f"  Minimum Sign-Off: {multi_sig.get('minimumSignOff', False)}")
    print(f"  Minimum Sign-Off Role: {multi_sig.get('minimumSignOffRole', 'N/A')}")
    
    # Verify single sign-off
    expected_threshold = 1
    actual_threshold = multi_sig.get('threshold', 0)
    
    if actual_threshold == expected_threshold:
        print(f"\n✅ PASS: Threshold is {actual_threshold} (single sign-off)")
        print(f"   EA Duty Officer can authorize with 1 signature")
        print(f"   Expected authorization time: < 2 minutes")
        return True
    else:
        print(f"\n❌ FAIL: Threshold is {actual_threshold}, expected {expected_threshold}")
        print(f"   Single sign-off not working correctly")
        return False

if __name__ == '__main__':
    success = test_single_signoff()
    sys.exit(0 if success else 1)
