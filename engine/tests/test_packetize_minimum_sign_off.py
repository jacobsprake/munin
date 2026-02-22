"""
Single sign-off workflow verification (roadmap item 14).
Verify minimum_sign_off in packetize: when playbook has minimum_sign_off role,
threshold is 1 and authorization path is single sign-off.
"""
import sys
from pathlib import Path

import pytest

# Add engine to path
engine_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(engine_dir))

from packetize import determine_multi_sig_requirements


def test_minimum_sign_off_returns_threshold_one():
    """When playbook has a role with minimum_sign_off: true, threshold is 1."""
    playbook = {
        "approval_required": [
            {"role": "EA Duty Officer", "minimum_sign_off": True},
            {"role": "Council Emergency Officer", "minimum_sign_off": False},
        ],
    }
    incident = {"id": "inc_1", "type": "flood", "timeline": []}
    result = determine_multi_sig_requirements(playbook, incident)
    assert result["threshold"] == 1
    assert result.get("minimumSignOff") is True
    assert result.get("minimumSignOffRole") == "EA Duty Officer"
    assert result.get("required") == 2


def test_no_minimum_sign_off_uses_full_threshold():
    """When no role has minimum_sign_off, threshold equals number of required signers."""
    playbook = {
        "approval_required": [
            {"role": "EA Duty Officer"},
            {"role": "Council Emergency Officer"},
        ],
    }
    incident = {"id": "inc_1", "type": "flood", "timeline": []}
    result = determine_multi_sig_requirements(playbook, incident)
    assert result["threshold"] == 2
    assert result.get("required") == 2
    assert result.get("minimumSignOff", False) is not True


def test_high_risk_can_require_2_of_3():
    """High-risk indicators can yield 2-of-3."""
    playbook = {
        "type": "flood",
        "approval_required": [
            {"role": "A"},
            {"role": "B"},
        ],
    }
    incident = {
        "id": "inc_1",
        "type": "flood",
        "timeline": ["event1", "event2", "event3", "event4", "event5", "critical event"],
    }
    result = determine_multi_sig_requirements(playbook, incident)
    assert result["threshold"] == 2
    assert result["required"] == 3
