"""
Quick verification that single sign-off logic works correctly.
"""
import yaml
import sys
from pathlib import Path

# Add engine directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from packetize import determine_multi_sig_requirements

# Load the Carlisle playbook
playbook_path = script_dir.parent / "playbooks" / "carlisle_flood_gate_coordination.yaml"
with open(playbook_path, 'r') as f:
    playbook = yaml.safe_load(f)

# Create a test incident
test_incident = {
    'id': 'test_incident',
    'type': 'flood',
    'timeline': [
        {'impactedNodeIds': ['eden_sands_centre']}
    ]
}

# Test the multi-sig requirements
result = determine_multi_sig_requirements(playbook, test_incident)

print("=" * 60)
print("SINGLE SIGN-OFF VERIFICATION")
print("=" * 60)
print(f"\nPlaybook: {playbook_path.name}")
print(f"Playbook approval_required:")
for role in playbook.get('approval_required', []):
    if isinstance(role, dict):
        print(f"  - {role.get('role')}: minimum_sign_off={role.get('minimum_sign_off', False)}")
    else:
        print(f"  - {role}")

print(f"\nMulti-Sig Requirements Result:")
print(f"  Required: {result.get('required')}")
print(f"  Threshold: {result.get('threshold')}")
print(f"  Minimum Sign-Off: {result.get('minimumSignOff', False)}")
print(f"  Minimum Sign-Off Role: {result.get('minimumSignOffRole', 'N/A')}")

if result.get('threshold') == 1:
    print(f"\n✅ SUCCESS: Single sign-off is working!")
    print(f"   EA Duty Officer can authorize with single tick-box.")
else:
    print(f"\n⚠️  WARNING: Threshold is {result.get('threshold')}, expected 1")
    print(f"   Check playbook configuration.")
