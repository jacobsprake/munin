"""
Playbook designer – uses law codes and regulatory corpus to design playbooks for every scenario.
All playbooks are generated from the regulatory corpus and scenario templates; humans review
and approve before use. No autonomous execution – this is design-time only.
"""
from __future__ import annotations

import sys
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add engine to path when run as script
_engine = Path(__file__).resolve().parent
if str(_engine) not in sys.path:
    sys.path.insert(0, str(_engine))

from compliance.regulatory_corpus import (
    get_regulations_for_scenario,
    list_scenario_types,
    list_jurisdictions_for_scenario,
    REGULATORY_CORPUS,
)
from compliance.regulatory_mapper import get_regulatory_summary, list_jurisdictions


# Scenario type -> default action sequence (step, action, parameters, task_owner_key)
# task_owner_key can be "primary", "secondary", "comms", "regulatory" – mapped from authorities per jurisdiction.
ACTION_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "flood": [
        {"step": 1, "action": "assess_flood_severity", "parameters": {"check_interval": "15m", "severity_levels": ["warning", "alert", "critical"]}, "task_owner_key": "primary"},
        {"step": 2, "action": "coordinate_flood_gate_operations", "parameters": {"gate_operation": "partial_close", "monitoring_mode": "intensive"}, "task_owner_key": "primary"},
        {"step": 3, "action": "notify_local_authorities", "parameters": {"message_template": "flood_warning_issued"}, "task_owner_key": "comms"},
        {"step": 4, "action": "activate_highways_coordination", "parameters": {"coordination_protocol": "real_time_updates"}, "task_owner_key": "secondary"},
        {"step": 5, "action": "continuous_monitoring", "parameters": {"check_interval": "5m"}, "task_owner_key": "primary"},
    ],
    "power_instability": [
        {"step": 1, "action": "assess_frequency_stability", "parameters": {"measurement_window": "1m"}, "task_owner_key": "primary"},
        {"step": 2, "action": "initiate_stabilization", "parameters": {"method": "automatic_load_shedding"}, "task_owner_key": "primary"},
        {"step": 3, "action": "coordinate_with_grid_operators", "parameters": {"reporting_interval": "5m"}, "task_owner_key": "secondary"},
        {"step": 4, "action": "monitor_recovery", "parameters": {"check_interval": "30s"}, "task_owner_key": "primary"},
        {"step": 5, "action": "gradual_load_restoration", "parameters": {"restoration_rate": "10%_per_5min"}, "task_owner_key": "primary"},
    ],
    "drought": [
        {"step": 1, "action": "assess_current_levels", "parameters": {"measurement_window": "24h"}, "task_owner_key": "primary"},
        {"step": 2, "action": "calculate_diversion_rate", "parameters": {"max_diversion_rate": 1000}, "task_owner_key": "primary"},
        {"step": 3, "action": "initiate_diversion", "parameters": {"monitoring_interval": "5m"}, "task_owner_key": "primary"},
        {"step": 4, "action": "monitor_impact", "parameters": {"check_interval": "15m"}, "task_owner_key": "primary"},
    ],
    "evacuation": [
        {"step": 1, "action": "assess_severity_and_evacuation_need", "parameters": {"check_interval": "15m"}, "task_owner_key": "primary"},
        {"step": 2, "action": "activate_evacuation_playbook", "parameters": {"multi_agency_sign_off": True}, "task_owner_key": "primary"},
        {"step": 3, "action": "notify_authorities_and_public", "parameters": {"message_template": "evacuation_activation"}, "task_owner_key": "comms"},
        {"step": 4, "action": "execute_supply_and_shelter_orders", "parameters": {"pre_authorised": True}, "task_owner_key": "secondary"},
    ],
    "nuclear_emergency": [
        {"step": 1, "action": "assess_containment_and_radiological_status", "parameters": {"check_interval": "5m"}, "task_owner_key": "primary"},
        {"step": 2, "action": "execute_pre_validated_venting_authorisation", "parameters": {"approval_required": True}, "task_owner_key": "primary"},
        {"step": 3, "action": "issue_evacuation_orders_coordinated", "parameters": {"coordination_required": True}, "task_owner_key": "secondary"},
        {"step": 4, "action": "continuous_monitoring_and_injection", "parameters": {"check_interval": "2m"}, "task_owner_key": "primary"},
    ],
    "chaos_multi_fault": [
        {"step": 1, "action": "assess_multi_fault_severity", "parameters": {"check_interval": "10m"}, "task_owner_key": "primary"},
        {"step": 2, "action": "initiate_isolation_sequence", "parameters": {"isolation_type": "full", "backup_activation": "automatic"}, "task_owner_key": "primary"},
        {"step": 3, "action": "activate_backup_systems", "parameters": {"load_redistribution": "100%"}, "task_owner_key": "primary"},
        {"step": 4, "action": "notify_all_authorities", "parameters": {"escalation_level": "critical"}, "task_owner_key": "comms"},
        {"step": 5, "action": "continuous_monitoring", "parameters": {"check_interval": "5m"}, "task_owner_key": "primary"},
    ],
    "chaos_correlated": [
        {"step": 1, "action": "assess_correlated_failure_scope", "parameters": {"check_interval": "10m"}, "task_owner_key": "primary"},
        {"step": 2, "action": "coordinate_cross_sector_response", "parameters": {"coordination_required": True}, "task_owner_key": "primary"},
        {"step": 3, "action": "notify_public_and_partners", "parameters": {"message_template": "correlated_incident"}, "task_owner_key": "comms"},
        {"step": 4, "action": "continuous_monitoring", "parameters": {"check_interval": "5m"}, "task_owner_key": "primary"},
    ],
}

# Human-readable titles and descriptions by scenario type
SCENARIO_META: Dict[str, Dict[str, str]] = {
    "flood": {
        "title": "Flood Event - Coordination Protocol",
        "description": "Emergency protocol for flood events. Coordinates gate operations, notifications, and monitoring in line with applicable flood and civil contingency regulations.",
    },
    "power_instability": {
        "title": "Power Frequency Instability - Grid Stabilization Protocol",
        "description": "Protocol for power grid frequency instability: assess, stabilize, coordinate with grid operators, monitor recovery, and restore load. Aligned with grid reliability standards.",
    },
    "drought": {
        "title": "Drought Conditions - Reservoir Diversion Protocol",
        "description": "Protocol for managing water resources during drought: assess levels, calculate diversion, initiate diversion, monitor impact. Compliant with water resource and drought regulations.",
    },
    "evacuation": {
        "title": "Evacuation and Supply Coordination Protocol",
        "description": "Multi-agency evacuation and supply coordination. Assess need, activate playbook, notify authorities and public, execute supply/shelter orders. Aligned with civil protection and emergency frameworks.",
    },
    "nuclear_emergency": {
        "title": "Nuclear Emergency - Containment and Evacuation Protocol",
        "description": "Radiological emergency protocol: assess containment/radiological status, pre-validated venting authorisation, coordinated evacuation, continuous monitoring. Compliant with nuclear emergency regulations.",
    },
    "chaos_multi_fault": {
        "title": "Multi-Fault Incident - Isolation and Coordination Protocol",
        "description": "Protocol for multiple simultaneous faults: assess severity, isolate, activate backup, notify authorities, monitor. Aligned with civil contingency and operational standards.",
    },
    "chaos_correlated": {
        "title": "Correlated Failure - Cross-Sector Coordination Protocol",
        "description": "Protocol for correlated cross-sector failures: assess scope, coordinate response, notify public and partners, monitor. Compliant with civil protection and multi-agency frameworks.",
    },
}


def _authority_to_roles(regulations: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Build approval_required list from unique authorities in the regulatory list."""
    seen: set = set()
    roles = []
    for r in regulations:
        auth = r.get("authority", "").strip()
        if not auth or auth in seen:
            continue
        seen.add(auth)
        # First authority can be minimum_sign_off for demo/rapid response
        roles.append({
            "role": auth,
            "authority": auth.lower().replace(" ", "_").replace("/", "_")[:40],
            "minimum_sign_off": len(roles) == 0,
            "biometric_handshake": False,
        })
    if not roles:
        roles = [{"role": "Senior Operator", "authority": "operational_control", "minimum_sign_off": True}]
    return roles


def _build_actions(
    scenario_type: str,
    jurisdiction: str,
    regulations: List[Dict[str, str]],
) -> List[Dict[str, Any]]:
    """Build actions list from template; task_owner from first/second/third authority."""
    template = ACTION_TEMPLATES.get(scenario_type)
    if not template:
        template = ACTION_TEMPLATES.get("chaos_multi_fault", [])
    authorities = [r.get("authority", "") for r in regulations if r.get("authority")]
    primary = authorities[0] if authorities else "Senior Operator"
    secondary = authorities[1] if len(authorities) > 1 else primary
    comms = "Communications Officer" if "Communications" not in str(authorities) else next((a for a in authorities if "Comms" in a or "Communications" in a), primary)
    key_to_owner = {"primary": primary, "secondary": secondary, "comms": comms, "regulatory": authorities[-1] if authorities else primary}
    actions = []
    for t in template:
        task_owner = key_to_owner.get(t.get("task_owner_key", "primary"), primary)
        actions.append({
            "step": t["step"],
            "action": t["action"],
            "target_nodes": [],  # Caller or pipeline can bind to graph later
            "parameters": t.get("parameters", {}),
            "task_owner": task_owner,
            "approval_required": t.get("step", 0) in (2, 3),
            "auto_assign": True,
        })
    return actions


def design_playbook(
    scenario_type: str,
    jurisdiction: str,
    *,
    playbook_id: Optional[str] = None,
    version: str = "1.0",
) -> Dict[str, Any]:
    """
    Design a single playbook from law codes and scenario template.
    Returns a playbook dict suitable for YAML dump and use by packetize.
    """
    regulations = get_regulations_for_scenario(scenario_type, jurisdiction)
    meta = SCENARIO_META.get(scenario_type, {"title": scenario_type.replace("_", " ").title(), "description": "Generated from regulatory corpus."})
    pid = playbook_id or f"{scenario_type}_{jurisdiction.lower()}"
    # Normalize id to safe filename
    safe_id = pid.replace(" ", "_").replace(".", "_")
    playbook = {
        "id": safe_id,
        "title": meta["title"],
        "version": version,
        "type": scenario_type,
        "description": meta["description"] + f"\n\nGenerated for jurisdiction: {jurisdiction}. All regulatory_compliance entries sourced from regulatory corpus.",
        "triggers": _default_triggers(scenario_type),
        "actions": _build_actions(scenario_type, jurisdiction, regulations),
        "regulatory_compliance": [
            {"act": r["act"], "section": r.get("section", ""), "requirement": r["requirement"]}
            for r in regulations
        ],
        "approval_required": _authority_to_roles(regulations),
        "expected_outcomes": [
            "Response actions executed in line with regulatory requirements",
            "Audit trail and approval chain documented",
            "Service continuity maintained where possible",
        ],
        "risks": [
            {"risk": "Regulatory non-compliance if steps skipped", "mitigation": "Pre-validated playbook and mandatory sign-off"},
            {"risk": "Communication breakdown", "mitigation": "Multiple channels and fallback protocols"},
        ],
    }
    return playbook


def _default_triggers(scenario_type: str) -> List[Dict[str, Any]]:
    """Default trigger conditions by scenario type."""
    if scenario_type == "flood":
        return [
            {"condition": "water_level > flood_warning_threshold", "threshold": 2.5, "unit": "meters", "operator": ">"},
            {"condition": "rainfall_rate > threshold", "threshold": 10.0, "unit": "mm_per_hour", "operator": ">"},
        ]
    if scenario_type == "power_instability":
        return [
            {"condition": "frequency_deviation > threshold", "threshold": 0.5, "unit": "Hz", "direction": "below_nominal"},
        ]
    if scenario_type == "drought":
        return [
            {"condition": "reservoir_level < threshold_low", "threshold_low": 0.4, "unit": "capacity_ratio"},
        ]
    if scenario_type in ("chaos_multi_fault", "chaos_correlated", "evacuation", "nuclear_emergency"):
        return [
            {"condition": "incident_severity >= critical", "severity": "critical"},
            {"condition": "multi_sector_impact_detected", "value": True},
        ]
    return [{"condition": "incident_detected", "scenario_type": scenario_type}]


def design_all_playbooks_for_jurisdiction(
    jurisdiction: str,
    scenario_types: Optional[List[str]] = None,
    output_dir: Optional[Path] = None,
    write_yaml: bool = True,
) -> List[Dict[str, Any]]:
    """
    Design playbooks for every scenario type in a jurisdiction using the regulatory corpus.
    If output_dir is set and write_yaml is True, writes each playbook to output_dir as <id>.yaml.
    """
    scenario_types = scenario_types or list_scenario_types()
    playbooks = []
    for st in scenario_types:
        if st not in REGULATORY_CORPUS:
            continue
        jurs = list_jurisdictions_for_scenario(st)
        if jurisdiction.upper() not in jurs:
            continue
        pb = design_playbook(st, jurisdiction)
        playbooks.append(pb)
        if output_dir and write_yaml:
            output_dir.mkdir(parents=True, exist_ok=True)
            path = output_dir / f"{pb['id']}.yaml"
            with open(path, "w") as f:
                yaml.safe_dump(pb, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    return playbooks


def design_all_playbooks(
    jurisdictions: Optional[List[str]] = None,
    output_dir: Optional[Path] = None,
    write_yaml: bool = True,
) -> List[Dict[str, Any]]:
    """
    Design playbooks for every scenario and every jurisdiction from the law codes.
    If output_dir is set, writes to output_dir/<jurisdiction>/<playbook_id>.yaml or output_dir/<playbook_id>.yaml.
    """
    jurisdictions = jurisdictions or list_jurisdictions()
    all_playbooks = []
    for jur in jurisdictions:
        subdir = Path(output_dir) / jur if output_dir else None
        pbs = design_all_playbooks_for_jurisdiction(jur, output_dir=subdir, write_yaml=write_yaml)
        all_playbooks.extend(pbs)
    return all_playbooks


def main():
    """CLI: generate playbooks from law codes. Usage: python -m playbook_design [--jurisdiction UK|US|EU] [--output dir] [--all]"""
    import argparse
    parser = argparse.ArgumentParser(description="Design playbooks from regulatory corpus (law codes).")
    parser.add_argument("--jurisdiction", "-j", default="UK", help="Jurisdiction (UK, US, EU) or 'all'")
    parser.add_argument("--output", "-o", type=Path, default=None, help="Output directory for YAML playbooks")
    parser.add_argument("--all", action="store_true", help="Generate for all jurisdictions")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    output_dir = args.output or root / "playbooks" / "generated"
    if args.all:
        design_all_playbooks(output_dir=output_dir)
        print(f"Generated playbooks for all jurisdictions in {output_dir}")
    else:
        design_all_playbooks_for_jurisdiction(args.jurisdiction, output_dir=output_dir)
        print(f"Generated playbooks for {args.jurisdiction} in {output_dir}")


if __name__ == "__main__":
    main()
