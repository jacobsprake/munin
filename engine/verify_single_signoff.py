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
from engine.logger import get_logger

log = get_logger(__name__)

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

log.info("=" * 60)
log.info("SINGLE SIGN-OFF VERIFICATION")
log.info("=" * 60)
log.info(f"Playbook: {playbook_path.name}")
log.info(f"Playbook approval_required:")
for role in playbook.get('approval_required', []):
    if isinstance(role, dict):
        log.info(f"  - {role.get('role')}: minimum_sign_off={role.get('minimum_sign_off', False)}")
    else:
        log.info(f"  - {role}")

log.info(f"Multi-Sig Requirements Result:")
log.info(f"  Required: {result.get('required')}")
log.info(f"  Threshold: {result.get('threshold')}")
log.info(f"  Minimum Sign-Off: {result.get('minimumSignOff', False)}")
log.info(f"  Minimum Sign-Off Role: {result.get('minimumSignOffRole', 'N/A')}")

if result.get('threshold') == 1:
    log.info(f"SUCCESS: Single sign-off is working! EA Duty Officer can authorize with single tick-box.")
else:
    log.warning(f"Threshold is {result.get('threshold')}, expected 1. Check playbook configuration.")
