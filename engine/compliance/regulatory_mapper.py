"""
Regulatory Compliance Mapper – which regulations/authorities Munin must navigate per jurisdiction.
Used for demos and procurement to show understanding of the legal/regulatory landscape.
"""
from __future__ import annotations

from typing import Dict, List, Any

# Jurisdiction -> frameworks and authorities relevant to crisis coordination
REGULATORY_MAP: Dict[str, Dict[str, Any]] = {
    "UK": {
        "name": "United Kingdom",
        "frameworks": [
            "Civil Contingencies Act 2004 (CCA)",
            "Flood and Water Management Act 2010",
            "Environment Agency Operational Standards",
            "Local Resilience Forums (LRF) and multi-agency coordination",
        ],
        "authorities": [
            "Environment Agency (EA)",
            "Local authorities (lead local flood authority)",
            "Highways England",
            "Met Office (warnings)",
        ],
        "munin_notes": "Pre-validated playbooks map to CCA Section 2 duties; EA duty officer sign-off aligns with single tick-box approval.",
    },
    "US": {
        "name": "United States",
        "frameworks": [
            "Stafford Act (federal disaster declaration)",
            "FEMA National Response Framework",
            "State emergency management authorities",
            "NERC (grid reliability)",
        ],
        "authorities": [
            "FEMA",
            "State emergency management agencies",
            "Local/county emergency managers",
            "NERC (grid)",
        ],
        "munin_notes": "Pre-simulated playbooks can embed FEMA–state–local sign-off requirements; M-of-N aligns with multi-jurisdiction approval.",
    },
    "EU": {
        "name": "European Union",
        "frameworks": [
            "Union Civil Protection Mechanism",
            "Directive on critical infrastructure (ECI)",
            "Cross-border cooperation agreements",
        ],
        "authorities": [
            "National civil protection authorities",
            "EU Emergency Response Coordination Centre (ERCC)",
            "Member state crisis centres",
        ],
        "munin_notes": "Cross-border playbooks require mapping to ERCC and bilateral/multilateral coordination protocols.",
    },
}


def get_regulatory_summary(jurisdiction: str) -> Dict[str, Any]:
    """Return regulatory summary for a jurisdiction."""
    return REGULATORY_MAP.get(jurisdiction.upper(), {}).copy()


def list_jurisdictions() -> List[str]:
    """Return list of supported jurisdictions."""
    return list(REGULATORY_MAP.keys())
