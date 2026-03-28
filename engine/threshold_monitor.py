"""
Threshold Monitor: Check normalized time-series against playbook triggers.
Fires when thresholds are exceeded. Used by poll_ea_api or real-time pipeline.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import pandas as pd

from engine.logger import get_logger

log = get_logger(__name__)

try:
    from live_match import evaluate_playbook_triggers, match_live_to_scenario
    LIVE_MATCH_AVAILABLE = True
except ImportError:
    LIVE_MATCH_AVAILABLE = False


def check_thresholds(
    normalized_df: pd.DataFrame,
    triggers: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Check normalized time-series against thresholds.
    Returns list of {node_id, threshold, value, breached, playbook_id}.
    """
    if normalized_df is None or normalized_df.empty:
        return []
    breached = []
    latest = normalized_df.iloc[-1] if len(normalized_df) > 0 else None
    if latest is None:
        return []
    # Default flood-style thresholds if none provided
    if not triggers:
        triggers = [
            {'node_id': 'eden_level', 'threshold': 2.5, 'condition': '>'},
            {'node_id': 'caldew_level', 'threshold': 2.0, 'condition': '>'},
        ]
    for t in triggers:
        node_id = t.get('node_id')
        if not node_id or node_id not in latest.index:
            continue
        try:
            value = float(latest[node_id]) if pd.notna(latest.get(node_id)) else None
        except (TypeError, ValueError):
            continue
        if value is None:
            continue
        threshold = float(t.get('threshold', 0))
        cond = t.get('condition', '>')
        met = False
        if cond == '>':
            met = value > threshold
        elif cond == '>=':
            met = value >= threshold
        elif cond == '<':
            met = value < threshold
        elif cond == '<=':
            met = value <= threshold
        elif cond == '==':
            met = abs(value - threshold) < 0.01
        if met:
            breached.append({
                'node_id': node_id,
                'threshold': threshold,
                'condition': cond,
                'value': value,
                'breached': True,
                'playbook_id': t.get('playbook_id', 'carlisle_flood_gate_coordination.yaml'),
            })
    return breached


def run_threshold_check(
    timeseries_path: Optional[Path] = None,
    triggers_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Run threshold check on normalized timeseries.
    Returns {breached: [...], live_match: {...}, triggered_playbooks: [...]}.
    """
    if timeseries_path is None:
        timeseries_path = Path(__file__).parent / 'out' / 'normalized_timeseries.csv'
    if not timeseries_path.exists():
        return {'breached': [], 'live_match': None, 'triggered_playbooks': [], 'error': 'No timeseries file'}
    try:
        df = pd.read_csv(timeseries_path)
        if 'timestamp' in df.columns:
            df = df.set_index('timestamp')
    except Exception as e:
        return {'breached': [], 'live_match': None, 'triggered_playbooks': [], 'error': str(e)}
    triggers = None
    if triggers_path and triggers_path.exists():
        with open(triggers_path) as f:
            triggers = json.load(f)
    breached = check_thresholds(df, triggers)
    live_match = None
    triggered_playbooks = []
    if LIVE_MATCH_AVAILABLE and breached:
        live_state = df.iloc[-1].to_dict() if len(df) > 0 else {}
        incidents_path = Path(__file__).parent / 'out' / 'incidents.json'
        if incidents_path.exists():
            with open(incidents_path) as f:
                incidents = json.load(f)
            inc_list = incidents.get('incidents', incidents) if isinstance(incidents, dict) else incidents
            live_match = match_live_to_scenario(live_state, inc_list or [])
        triggered_playbooks = [b.get('playbook_id') for b in breached if b.get('playbook_id')]
    return {
        'breached': breached,
        'live_match': live_match,
        'triggered_playbooks': list(set(triggered_playbooks)),
    }


if __name__ == '__main__':
    result = run_threshold_check()
    log.info(json.dumps(result, indent=2))
