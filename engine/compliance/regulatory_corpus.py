"""
Regulatory corpus – law codes and requirements by jurisdiction and scenario type.
Used by the playbook designer to generate compliant playbooks for every scenario.
Extend this module as new regulations or jurisdictions are added.
"""
from __future__ import annotations

from typing import Dict, List, Any

# Scenario type -> jurisdiction -> list of { act, section, requirement, authority }
# Authority = who must sign off or who enforces (for approval_required roles).
REGULATORY_CORPUS: Dict[str, Dict[str, List[Dict[str, str]]]] = {
    "flood": {
        "UK": [
            {
                "act": "Flood and Water Management Act 2010",
                "section": "Section 9",
                "requirement": "Coordinate flood risk management activities across authorities",
                "authority": "Environment Agency",
            },
            {
                "act": "Civil Contingencies Act 2004",
                "section": "Section 2",
                "requirement": "Maintain effective emergency response coordination",
                "authority": "Local Resilience Forums",
            },
            {
                "act": "Environment Agency Operational Standards",
                "section": "FLO-2026-01",
                "requirement": "Document all flood gate operations with evidence and approval chain",
                "authority": "EA Duty Officer",
            },
        ],
        "US": [
            {
                "act": "Stafford Act",
                "section": "Section 401",
                "requirement": "Federal disaster declaration and coordination with state/local",
                "authority": "FEMA",
            },
            {
                "act": "FEMA National Response Framework",
                "section": "ESF-3",
                "requirement": "Public works and engineering coordination during floods",
                "authority": "State emergency management",
            },
            {
                "act": "State flood emergency regulations",
                "section": "Varies by state",
                "requirement": "Document response actions and maintain approval chain",
                "authority": "State/local emergency managers",
            },
        ],
        "EU": [
            {
                "act": "Union Civil Protection Mechanism",
                "section": "Decision 1313/2013/EU",
                "requirement": "Coordinate cross-border flood response and mutual assistance",
                "authority": "ERCC / National civil protection",
            },
            {
                "act": "Directive on critical infrastructure (ECI)",
                "section": "Annex I",
                "requirement": "Protect water infrastructure and document response",
                "authority": "Member state crisis centre",
            },
        ],
    },
    "power_instability": {
        "UK": [
            {
                "act": "Electricity Act 1989",
                "section": "Section 3",
                "requirement": "Maintain secure and efficient electricity supply",
                "authority": "National Grid ESO",
            },
            {
                "act": "Grid Code",
                "section": "CC.6.1",
                "requirement": "Frequency and stability within operational limits",
                "authority": "Grid operator",
            },
            {
                "act": "Civil Contingencies Act 2004",
                "section": "Section 2",
                "requirement": "Critical infrastructure emergency coordination",
                "authority": "BEIS / Resilience forums",
            },
        ],
        "US": [
            {
                "act": "NERC Reliability Standards",
                "section": "EOP-011",
                "requirement": "Maintain frequency within operational limits and coordinate with regional operators",
                "authority": "NERC / Regional entity",
            },
            {
                "act": "FERC Order 693",
                "section": "CIP",
                "requirement": "Critical infrastructure protection and incident response",
                "authority": "NERC",
            },
            {
                "act": "Grid Stability Protocols",
                "section": "GSP-2026-02",
                "requirement": "Document all load shedding actions and restoration procedures",
                "authority": "Grid operator",
            },
        ],
        "EU": [
            {
                "act": "Regulation (EU) 2019/943",
                "section": "Article 13",
                "requirement": "System operation and frequency stability",
                "authority": "TSO",
            },
            {
                "act": "Network Code on Emergency and Restoration",
                "section": "NC ER",
                "requirement": "Document restoration and coordination with TSOs",
                "authority": "National TSO",
            },
        ],
    },
    "drought": {
        "UK": [
            {
                "act": "Water Industry Act 1991",
                "section": "Section 37",
                "requirement": "Duty to maintain water supply; drought orders and permits",
                "authority": "Environment Agency / Ofwat",
            },
            {
                "act": "Drought Plan (Water Resources Management)",
                "section": "Statutory guidance",
                "requirement": "Maintain minimum service levels during declared drought",
                "authority": "Water company / EA",
            },
            {
                "act": "Water Resource Management Standards",
                "section": "WRM-2026-03",
                "requirement": "Document all diversion actions with evidence and approval chain",
                "authority": "Regulatory Compliance Officer",
            },
        ],
        "US": [
            {
                "act": "State water codes (varies)",
                "section": "Drought contingency",
                "requirement": "Maintain minimum service levels during declared drought conditions",
                "authority": "State water board",
            },
            {
                "act": "Water Resource Management Standards",
                "section": "WRM-2026-03",
                "requirement": "Document all diversion actions with evidence and approval chain",
                "authority": "Regulatory Compliance Officer",
            },
        ],
        "EU": [
            {
                "act": "Water Framework Directive 2000/60/EC",
                "section": "Article 4",
                "requirement": "Protect water bodies; drought management plans",
                "authority": "Member state authority",
            },
            {
                "act": "Water Resource Management Standards",
                "section": "WRM-2026-03",
                "requirement": "Document diversion and approval chain",
                "authority": "National authority",
            },
        ],
    },
    "evacuation": {
        "UK": [
            {
                "act": "Civil Contingencies Act 2004",
                "section": "Section 2",
                "requirement": "Warn and inform public; evacuation where necessary",
                "authority": "Local authority / Police",
            },
            {
                "act": "Flood and Water Management Act 2010",
                "section": "Section 18",
                "requirement": "Flood evacuation and multi-agency coordination",
                "authority": "EA / Local authority",
            },
        ],
        "US": [
            {
                "act": "Stafford Act",
                "section": "Section 403",
                "requirement": "Federal assistance for evacuation and shelter",
                "authority": "FEMA",
            },
            {
                "act": "FEMA policies",
                "section": "Evacuation and mass care",
                "requirement": "Coordinate state/local evacuation orders and supply chains",
                "authority": "State/local emergency management",
            },
        ],
        "EU": [
            {
                "act": "Union Civil Protection Mechanism",
                "section": "Evacuation coordination",
                "requirement": "Cross-border evacuation and shelter coordination",
                "authority": "ERCC / National authority",
            },
        ],
    },
    "nuclear_emergency": {
        "UK": [
            {
                "act": "Radiation (Emergency Preparedness and Public Information) Regulations 2019",
                "section": "REPPIR",
                "requirement": "Emergency plans and public information for nuclear sites",
                "authority": "ONR / Local authority",
            },
            {
                "act": "Civil Contingencies Act 2004",
                "section": "Section 2",
                "requirement": "Multi-agency response and evacuation",
                "authority": "Local Resilience Forum",
            },
        ],
        "US": [
            {
                "act": "NRC regulations (10 CFR)",
                "section": "Emergency preparedness",
                "requirement": "Emergency plans and off-site coordination",
                "authority": "NRC / FEMA",
            },
        ],
        "EU": [
            {
                "act": "Council Directive 2013/59/Euratom",
                "section": "Emergency preparedness",
                "requirement": "Plans and coordination for radiological emergencies",
                "authority": "National radiation authority",
            },
        ],
    },
    "chaos_multi_fault": {
        "UK": [
            {
                "act": "Civil Contingencies Act 2004",
                "section": "Section 2",
                "requirement": "Effective emergency response coordination for complex incidents",
                "authority": "Local Resilience Forums",
            },
            {
                "act": "Environment Agency Operational Standards",
                "section": "FLO-2026-01",
                "requirement": "Document operations with evidence and approval chain",
                "authority": "EA Duty Officer",
            },
        ],
        "US": [
            {
                "act": "Stafford Act",
                "section": "Section 401",
                "requirement": "Federal coordination for multi-hazard incidents",
                "authority": "FEMA",
            },
            {
                "act": "FEMA National Response Framework",
                "section": "Multi-agency coordination",
                "requirement": "Document response and approval chain",
                "authority": "State/local emergency management",
            },
        ],
        "EU": [
            {
                "act": "Union Civil Protection Mechanism",
                "section": "Crisis coordination",
                "requirement": "Cross-border and multi-sector coordination",
                "authority": "ERCC / National authority",
            },
        ],
    },
    "chaos_correlated": {
        "UK": [
            {
                "act": "Civil Contingencies Act 2004",
                "section": "Section 2",
                "requirement": "Effective emergency response for correlated failures",
                "authority": "Local Resilience Forums",
            },
        ],
        "US": [
            {
                "act": "Stafford Act",
                "section": "Section 401",
                "requirement": "Federal coordination for cascading/correlated incidents",
                "authority": "FEMA",
            },
        ],
        "EU": [
            {
                "act": "Union Civil Protection Mechanism",
                "section": "Crisis coordination",
                "requirement": "Multi-sector correlated response",
                "authority": "ERCC / National authority",
            },
        ],
    },
}


def get_regulations_for_scenario(scenario_type: str, jurisdiction: str) -> List[Dict[str, str]]:
    """Return list of regulatory entries (act, section, requirement, authority) for a scenario and jurisdiction."""
    by_scenario = REGULATORY_CORPUS.get(scenario_type, {})
    # Fallback: try generic flood or chaos for unknown scenario
    if not by_scenario:
        by_scenario = REGULATORY_CORPUS.get("flood", {}) or REGULATORY_CORPUS.get("chaos_multi_fault", {})
    entries = by_scenario.get(jurisdiction.upper(), [])
    if not entries and jurisdiction.upper() != "UK":
        entries = by_scenario.get("US", []) or by_scenario.get("EU", [])
    return list(entries)


def list_scenario_types() -> List[str]:
    """Return all scenario types that have regulatory entries."""
    return list(REGULATORY_CORPUS.keys())


def list_jurisdictions_for_scenario(scenario_type: str) -> List[str]:
    """Return jurisdictions that have regulations for the given scenario type."""
    by_scenario = REGULATORY_CORPUS.get(scenario_type, {})
    return list(by_scenario.keys())
