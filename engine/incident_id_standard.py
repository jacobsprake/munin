"""Standardized incident ID generation and correlation."""
import hashlib
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path
import json


def generate_incident_id(
    incident_type: str,
    initial_node: str,
    timestamp: Optional[datetime] = None,
    sequence: Optional[int] = None
) -> str:
    """
    Generate standardized incident ID.
    
    Format: incident_{type}_{node}_{timestamp}_{sequence}
    
    Args:
        incident_type: Type of incident (e.g., 'flood', 'drought')
        initial_node: Initial failure node ID
        timestamp: Incident timestamp (default: now)
        sequence: Sequence number for same type/node/time (default: 0)
    
    Returns:
        Standardized incident ID
    """
    if timestamp is None:
        timestamp = datetime.now()
    
    if sequence is None:
        sequence = 0
    
    # Normalize inputs
    incident_type = incident_type.lower().replace(' ', '_')
    initial_node = initial_node.lower().replace(' ', '_')
    timestamp_str = timestamp.strftime('%Y%m%d%H%M%S')
    
    incident_id = f"incident_{incident_type}_{initial_node}_{timestamp_str}_{sequence:03d}"
    return incident_id


def correlate_incident_with_packet(incident_id: str, packet_id: str) -> Dict[str, str]:
    """
    Create correlation record linking incident to packet.
    
    Returns:
        Correlation dictionary with incident_id, packet_id, correlation_id
    """
    correlation_id = f"corr_{hashlib.sha256(f'{incident_id}:{packet_id}'.encode()).hexdigest()[:12]}"
    
    return {
        'correlation_id': correlation_id,
        'incident_id': incident_id,
        'packet_id': packet_id,
        'created': datetime.now().isoformat()
    }


def correlate_incident_with_audit(incident_id: str, audit_entry_id: str) -> Dict[str, str]:
    """
    Create correlation record linking incident to audit entry.
    
    Returns:
        Correlation dictionary
    """
    correlation_id = f"corr_{hashlib.sha256(f'{incident_id}:{audit_entry_id}'.encode()).hexdigest()[:12]}"
    
    return {
        'correlation_id': correlation_id,
        'incident_id': incident_id,
        'audit_entry_id': audit_entry_id,
        'created': datetime.now().isoformat()
    }


def correlate_incident_with_shadow(incident_id: str, shadow_entry_id: str) -> Dict[str, str]:
    """
    Create correlation record linking incident to shadow mode entry.
    
    Returns:
        Correlation dictionary
    """
    correlation_id = f"corr_{hashlib.sha256(f'{incident_id}:{shadow_entry_id}'.encode()).hexdigest()[:12]}"
    
    return {
        'correlation_id': correlation_id,
        'incident_id': incident_id,
        'shadow_entry_id': shadow_entry_id,
        'created': datetime.now().isoformat()
    }


def save_correlations(correlations: list, output_path: Path):
    """Save correlation records to JSON file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump({'correlations': correlations}, f, indent=2)


def load_correlations(correlations_path: Path) -> list:
    """Load correlation records from JSON file."""
    if not correlations_path.exists():
        return []
    
    with open(correlations_path, 'r') as f:
        data = json.load(f)
    
    return data.get('correlations', [])


def get_incident_correlations(incident_id: str, correlations_path: Path) -> Dict[str, list]:
    """
    Get all correlations for a given incident.
    
    Returns:
        Dictionary with 'packets', 'audit_entries', 'shadow_entries' lists
    """
    correlations = load_correlations(correlations_path)
    
    incident_correlations = {
        'packets': [],
        'audit_entries': [],
        'shadow_entries': []
    }
    
    for corr in correlations:
        if corr.get('incident_id') == incident_id:
            if 'packet_id' in corr:
                incident_correlations['packets'].append(corr)
            elif 'audit_entry_id' in corr:
                incident_correlations['audit_entries'].append(corr)
            elif 'shadow_entry_id' in corr:
                incident_correlations['shadow_entries'].append(corr)
    
    return incident_correlations
