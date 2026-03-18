"""
Ministry-View Executive Briefing Generator

Generates a concise, non-technical report suitable for a minister or
permanent secretary reviewing an infrastructure incident. Contains only
what a decision-maker needs: situation summary, recommended actions,
legal basis, time impact, and uncertainty.

This is what would appear on a minister's tablet in a crisis room.
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


def generate_ministry_briefing(
    out_dir: Path,
    output_path: Optional[Path] = None,
) -> str:
    """
    Generate an executive briefing from pipeline outputs.

    Args:
        out_dir: directory containing graph.json, incidents.json, packets/
        output_path: if provided, write briefing to this file

    Returns:
        briefing as a string (Markdown, suitable for HTML/PDF conversion)
    """
    lines = []

    def add(text: str = "") -> None:
        lines.append(text)

    # Header
    add("---")
    add("MINISTRY SITUATION BRIEFING")
    add(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    add("Classification: OFFICIAL-SENSITIVE")
    add("System: Munin Sovereign Infrastructure Orchestration")
    add("---")
    add()

    # Load data
    graph_path = out_dir / "graph.json"
    incidents_path = out_dir / "incidents.json"
    packets_dir = out_dir / "packets"

    graph = {}
    if graph_path.exists():
        with open(graph_path) as f:
            graph = json.load(f)

    incidents_data = {}
    if incidents_path.exists():
        with open(incidents_path) as f:
            incidents_data = json.load(f)

    packets = []
    if packets_dir.exists():
        for pf in sorted(packets_dir.glob("*.json"))[:5]:
            with open(pf) as f:
                packets.append(json.load(f))

    # Section 1: Situation Summary
    add("# SITUATION SUMMARY")
    add()

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    shadow_links = [e for e in edges if e.get("isShadowLink")]
    incidents = incidents_data.get("incidents", [])

    sectors = {}
    for n in nodes:
        s = n.get("sector", "unknown")
        sectors[s] = sectors.get(s, 0) + 1

    add(f"**Infrastructure monitored:** {len(nodes)} assets across {len(sectors)} sectors ({', '.join(sectors.keys())})")
    add(f"**Cross-sector dependencies identified:** {len(shadow_links)} (not documented in existing records)")
    add(f"**Cascade scenarios analysed:** {len(incidents)}")
    add()

    if shadow_links:
        add("**Key cross-sector vulnerabilities:**")
        for sl in shadow_links[:3]:
            add(f"- {sl['source']} depends on {sl['target']} (confidence: {sl.get('confidenceScore', 0):.0%}, lag: {sl.get('inferredLagSeconds', 0) // 60} min)")
        add()

    # Section 2: Recommended Actions
    add("# RECOMMENDED ACTIONS")
    add()

    if packets:
        for i, pkt in enumerate(packets[:3]):
            add(f"## Option {i + 1}: {pkt.get('playbookId', 'Unknown Playbook')}")
            add()

            # Status
            ms = pkt.get("multiSig", {})
            current_sigs = ms.get("currentSignatures", 0)
            required_sigs = ms.get("required", ms.get("threshold", 0))
            add(f"**Authorization status:** {current_sigs}/{required_sigs} required signatures")
            add()

            # Regulatory basis
            reg = pkt.get("regulatoryBasis", [])
            if isinstance(reg, str):
                reg = [s.strip() for s in reg.split(",") if s.strip()]
            if reg:
                add("**Legal basis:**")
                for r in reg[:4]:
                    add(f"- {r}")
                add()

            # Uncertainty
            u = pkt.get("uncertainty", {})
            conf = u.get("confidence", 0)
            if conf > 0.8:
                confidence_text = "HIGH"
            elif conf > 0.5:
                confidence_text = "MODERATE"
            else:
                confidence_text = "LOW"
            add(f"**Confidence:** {confidence_text} ({conf:.0%})")

            counterexamples = u.get("counterexampleWindows", [])
            if counterexamples:
                add(f"**Caveats:** {len(counterexamples)} time window(s) where this prediction did not hold historically")
            add()
    else:
        add("No authorization packets generated. No immediate action recommended.")
        add()

    # Section 3: Time Impact
    add("# TIME IMPACT")
    add()
    add("| Metric | Traditional Process | With Munin |")
    add("|--------|-------------------|-----------|")
    add("| Situational awareness | 30-120 minutes | Immediate |")
    add("| Cross-agency coordination | 2-6 hours | Pre-computed |")
    add("| Authorization ready | 4-10 hours | Available now |")
    add("| Evidence documentation | Post-hoc reconstruction | Included in packet |")
    add()

    # Section 4: What This System Cannot Do
    add("# LIMITATIONS")
    add()
    add("- This system **cannot** control infrastructure equipment")
    add("- This system **cannot** execute actions without your explicit approval")
    add("- Confidence scores are based on historical correlation, not guaranteed prediction")
    add("- Cross-sector dependencies are inferred from data patterns, not verified by physical inspection")
    add("- All recommendations are advisory; operational judgment remains with designated authorities")
    add()

    # Section 5: Required Signatures
    add("# REQUIRED SIGNATURES")
    add()
    if packets:
        pkt = packets[0]
        ms = pkt.get("multiSig", {})
        add(f"This authorization requires **{ms.get('required', ms.get('threshold', 'N/A'))} signatures** from the following authorities:")
        add()
        add("| Authority | Status |")
        add("|-----------|--------|")
        sigs = ms.get("signatures", [])
        if sigs:
            for sig in sigs:
                add(f"| {sig.get('role', 'Unknown')} | Signed ({sig.get('timestamp', 'N/A')}) |")
        else:
            add("| Environment Agency | Pending |")
            add("| Civil Protection | Pending |")
            add("| Infrastructure Ministry | Pending |")
        add()
    add()
    add("---")
    add("*This briefing was generated automatically by Munin. All data is from the latest pipeline run.*")
    add("*Munin is advisory only. Humans decide. Humans execute.*")

    briefing = "\n".join(lines)

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            f.write(briefing)

    return briefing
