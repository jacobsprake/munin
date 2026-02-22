"""
Cascade Visualization – interactive HTML showing cascade propagation
and Munin intervention point (side-by-side: without vs with Munin).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime


def _timeline_to_steps(timeline: List[Dict], graph: Dict) -> List[Dict]:
    """Convert incident timeline to display steps with T+ and node labels."""
    steps = []
    t0 = None
    for i, entry in enumerate(timeline):
        ts = entry.get("ts", "")
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if t0 is None:
                t0 = dt
            delta_min = int((dt - t0).total_seconds() / 60)
        except Exception:
            delta_min = i * 5
        steps.append({
            "t_plus": f"T+{delta_min}min",
            "impacted": entry.get("impactedNodeIds", []),
            "confidence": entry.get("confidence", 0),
        })
    return steps


def generate_cascade_animation(
    graph: Dict[str, Any],
    scenario: Dict[str, Any],
    html_path: Path,
) -> None:
    """
    Creates interactive HTML showing cascade propagation and Munin intervention point.
    Side-by-side: WITHOUT MUNIN (cascade spreads, authorization at 2–6 h) vs WITH MUNIN (approval at ~3 min).
    """
    timeline = scenario.get("timeline", [])
    steps = _timeline_to_steps(timeline, graph)
    node_ids = [n.get("id") for n in graph.get("nodes", []) if n.get("id")]
    incident_type = scenario.get("type", "flood")
    title = scenario.get("title", "Cascade simulation")

    # Without Munin: authorization at 120 min (2 h); with Munin: at 3.7 min
    munin_approval_min = 4
    traditional_approval_min = 120

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Munin – Cascade Animation</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ font-family: system-ui, sans-serif; margin: 0; padding: 1rem; background: #0f172a; color: #e2e8f0; }}
    h1 {{ font-size: 1.25rem; margin-bottom: 0.5rem; }}
    .subtitle {{ color: #94a3b8; font-size: 0.875rem; margin-bottom: 1rem; }}
    .side-by-side {{ display: flex; gap: 1rem; flex-wrap: wrap; }}
    .panel {{ flex: 1; min-width: 280px; border: 1px solid #334155; border-radius: 8px; padding: 1rem; background: #1e293b; }}
    .panel h2 {{ font-size: 1rem; margin: 0 0 0.75rem 0; color: #f8fafc; }}
    .panel.traditional h2 {{ color: #f87171; }}
    .panel.munin h2 {{ color: #4ade80; }}
    .timeline {{ margin: 0; padding: 0; list-style: none; }}
    .timeline li {{ padding: 0.35rem 0; border-bottom: 1px solid #334155; font-size: 0.8125rem; display: flex; justify-content: space-between; align-items: center; }}
    .timeline li .t {{ color: #64748b; }}
    .timeline li .nodes {{ color: #cbd5e1; }}
    .timeline li.intervention {{ background: rgba(74, 222, 128, 0.15); border-radius: 4px; margin: 2px 0; padding-left: 4px; }}
    .timeline li.waiting {{ opacity: 0.7; }}
    .footer {{ margin-top: 1rem; font-size: 0.75rem; color: #64748b; }}
  </style>
</head>
<body>
  <h1>Cascade propagation: {title}</h1>
  <p class="subtitle">Side-by-side: Traditional (authorization 2–6 h) vs Munin (authorization &lt;4 min)</p>
  <div class="side-by-side">
    <div class="panel traditional">
      <h2>Without Munin</h2>
      <ul class="timeline" id="timeline-traditional"></ul>
      <p class="footer">Authorization typically at T+{traditional_approval_min} min. Cascade continues to spread.</p>
    </div>
    <div class="panel munin">
      <h2>With Munin</h2>
      <ul class="timeline" id="timeline-munin"></ul>
      <p class="footer">Playbook approved at T+{munin_approval_min} min. Execution can begin immediately.</p>
    </div>
  </div>
  <script>
    const steps = {json.dumps(steps)};
    const nodeIds = {json.dumps(node_ids)};
    const muninApprovalMin = {munin_approval_min};
    const traditionalApprovalMin = {traditional_approval_min};

    function renderTimeline(containerId, approvalMin) {{
      const ul = document.getElementById(containerId);
      ul.innerHTML = '';
      steps.forEach((step, i) => {{
        const li = document.createElement('li');
        const tPlus = step.t_plus || ('T+' + (i * 5) + 'min');
        const nodes = (step.impacted || []).slice(0, 5).join(', ');
        const more = (step.impacted || []).length > 5 ? ' +' + ((step.impacted || []).length - 5) + ' more' : '';
        li.innerHTML = '<span class="t">' + tPlus + '</span> <span class="nodes">' + nodes + more + '</span>';
        const min = parseInt(tPlus.replace('T+', '').replace('min', ''), 10) || i * 5;
        if (containerId === 'timeline-munin' && min >= approvalMin && (i === 0 || parseInt((steps[i-1].t_plus || '').replace(/\\\\D/g,''), 10) < approvalMin))
          li.classList.add('intervention');
        if (containerId === 'timeline-traditional' && min >= traditionalApprovalMin && (i === 0 || parseInt((steps[i-1].t_plus || '').replace(/\\\\D/g,''), 10) < traditionalApprovalMin))
          li.classList.add('intervention');
        if (min >= approvalMin && containerId === 'timeline-traditional') li.classList.add('waiting');
        ul.appendChild(li);
      }});
    }}

    renderTimeline('timeline-traditional', traditionalApprovalMin);
    renderTimeline('timeline-munin', muninApprovalMin);
  </script>
</body>
</html>
"""
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(html, encoding="utf-8")
