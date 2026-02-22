"""
Live match: playbook trigger evaluation and match live situation to nearest pre-simulated scenario.
Used for crisis-time lookup so Munin can surface the right playbooks from current data.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd

# Optional Carlisle triggers (same shape as playbook YAML triggers)
try:
    from carlisle_config import check_trigger_condition, FLOOD_GATE_TRIGGERS, PlaybookTrigger
    CARLISLE_AVAILABLE = True
except ImportError:
    CARLISLE_AVAILABLE = False
    PlaybookTrigger = None


def evaluate_playbook_triggers(
    normalized_df: pd.DataFrame,
    triggers: Optional[List[Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Evaluate playbook triggers against normalized time-series (e.g. latest values per node).
    Returns list of {playbook_id, node_id, trigger_condition, met: bool, value}.
    """
    if normalized_df is None or normalized_df.empty:
        return []
    triggered = []
    # Use latest row per column as "current" state
    latest = normalized_df.iloc[-1] if len(normalized_df) > 0 else None
    if latest is None:
        return []
    if triggers is None and CARLISLE_AVAILABLE:
        triggers = FLOOD_GATE_TRIGGERS
    if not triggers:
        return []
    for t in triggers:
        node_id = getattr(t, 'node_id', t.get('node_id') if isinstance(t, dict) else None)
        if node_id is None:
            continue
        if node_id not in latest.index:
            continue
        value = float(latest[node_id]) if pd.notna(latest.get(node_id)) else None
        if value is None:
            continue
        if CARLISLE_AVAILABLE:
            met = check_trigger_condition(node_id, value, t)
        else:
            met = False
        triggered.append({
            'playbook_id': 'carlisle_flood_gate_coordination.yaml',
            'node_id': node_id,
            'trigger_condition': getattr(t, 'condition', str(t)),
            'met': bool(met),
            'value': value,
        })
    return triggered


def match_live_to_scenario(
    live_state: Dict[str, float],
    incidents: List[Dict[str, Any]],
    graph: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Match current live state to the nearest pre-simulated scenario.
    live_state: node_id -> latest value (e.g. from normalized timeseries last row).
    incidents: list of incident dicts with timeline[0].impactedNodeIds and type.
    Returns best-matching incident or None.
    """
    if not incidents:
        return None
    # Simple heuristic: find incident whose initial impact set overlaps most with nodes that have "high" values in live_state
    # For flood: nodes with value above threshold could be treated as "affected"
    threshold = 0.5  # or use playbook thresholds
    live_affected = {nid for nid, v in live_state.items() if isinstance(v, (int, float)) and v > threshold}
    best = None
    best_score = -1
    for inc in incidents:
        timeline = inc.get('timeline', [])
        initial = set(timeline[0].get('impactedNodeIds', [])) if timeline else set()
        overlap = len(initial & live_affected) if live_affected else 0
        # Prefer same type and some overlap
        score = overlap + (10 if initial else 0)
        if score > best_score:
            best_score = score
            best = inc
    return best


def write_triggered_playbooks(
    triggered: List[Dict[str, Any]],
    out_path: Path,
) -> None:
    """Write triggered playbooks JSON for downstream (e.g. packetize or UI)."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump({'triggered': triggered, 'count': len([t for t in triggered if t.get('met')])}, f, indent=2)
