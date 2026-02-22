"""
When Munin Doesn't Apply – classifier with reasoning.
Returns whether Munin would help for a given disaster profile, with checks and score.
"""
from __future__ import annotations

from typing import Dict, Any

# Known disaster profiles for testing
KNOWN_DISASTERS: Dict[str, Dict[str, Any]] = {
    "katrina_2005": {
        "multi_agency": True,
        "coordination_bottleneck": True,
        "equipment_failure_primary": False,
        "capacity_limit_primary": False,
        "cascade_predictable": True,
        "authorization_delay_documented": True,
    },
    "fukushima_2011": {
        "multi_agency": True,
        "coordination_bottleneck": True,
        "equipment_failure_primary": False,
        "capacity_limit_primary": False,
        "cascade_predictable": True,
        "authorization_delay_documented": True,
    },
    "uk_floods_2015": {
        "multi_agency": True,
        "coordination_bottleneck": True,
        "equipment_failure_primary": False,
        "capacity_limit_primary": False,
        "cascade_predictable": True,
        "authorization_delay_documented": True,
    },
    "texas_2021": {
        "multi_agency": False,
        "coordination_bottleneck": False,
        "equipment_failure_primary": True,
        "capacity_limit_primary": True,
        "cascade_predictable": True,
        "authorization_delay_documented": False,
    },
    "dubai_2024": {
        "multi_agency": False,
        "coordination_bottleneck": False,
        "equipment_failure_primary": False,
        "capacity_limit_primary": True,
        "cascade_predictable": False,
        "authorization_delay_documented": False,
    },
}


def has_multiple_agencies(disaster_data: Dict[str, Any]) -> bool:
    return bool(disaster_data.get("multi_agency"))


def is_coordination_primary(disaster_data: Dict[str, Any]) -> bool:
    return bool(disaster_data.get("coordination_bottleneck"))


def is_equipment_failure(disaster_data: Dict[str, Any]) -> bool:
    return bool(disaster_data.get("equipment_failure_primary"))


def is_capacity_limit(disaster_data: Dict[str, Any]) -> bool:
    return bool(disaster_data.get("capacity_limit_primary"))


def is_cascade_predictable(disaster_data: Dict[str, Any]) -> bool:
    return bool(disaster_data.get("cascade_predictable"))


def has_authorization_delay(disaster_data: Dict[str, Any]) -> bool:
    return bool(disaster_data.get("authorization_delay_documented"))


def assess_munin_applicability(disaster_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns whether Munin would help, with reasoning.
    """
    checks = {
        "multi_agency": has_multiple_agencies(disaster_data),
        "coordination_bottleneck": is_coordination_primary(disaster_data),
        "not_equipment_failure": not is_equipment_failure(disaster_data),
        "not_capacity_limit": not is_capacity_limit(disaster_data),
        "predictable_cascade": is_cascade_predictable(disaster_data),
        "authorization_delay": has_authorization_delay(disaster_data),
    }
    score = sum(checks.values()) / len(checks) if checks else 0.0
    applicable = score > 0.7
    return {
        "applicable": applicable,
        "confidence": round(score, 2),
        "reasoning": checks,
        "recommendation": "APPLY" if applicable else "DO NOT APPLY",
    }


# Tests (can be run with pytest)
def test_applicability_katrina() -> None:
    r = assess_munin_applicability(KNOWN_DISASTERS["katrina_2005"])
    assert r["applicable"] is True, r


def test_applicability_texas() -> None:
    r = assess_munin_applicability(KNOWN_DISASTERS["texas_2021"])
    assert r["applicable"] is False, r


def test_applicability_dubai() -> None:
    r = assess_munin_applicability(KNOWN_DISASTERS["dubai_2024"])
    assert r["applicable"] is False, r
