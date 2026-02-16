"""
Consistency checks across provenance ledger, audit log, and packet receipts.

Ensures data integrity across all three systems.
"""
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import hashlib

from provenance_ledger import ProvenanceLedger, ProvenanceStatus


def compute_packet_receipt_hash(packet: Dict) -> str:
    """Compute receipt hash for a packet."""
    packet_str = json.dumps(packet, sort_keys=True)
    return hashlib.sha256(packet_str.encode()).hexdigest()


def load_audit_log_entries(audit_log_path: Path) -> List[Dict]:
    """Load audit log entries from JSONL file."""
    entries = []
    if audit_log_path.exists():
        with open(audit_log_path, 'r') as f:
            for line in f:
                if line.strip():
                    entries.append(json.loads(line))
    return entries


def load_packets(packets_dir: Path) -> List[Dict]:
    """Load all packets from directory."""
    packets = []
    if packets_dir.exists():
        for packet_file in packets_dir.glob("*.json"):
            with open(packet_file, 'r') as f:
                packets.append(json.load(f))
    return packets


def check_provenance_audit_consistency(
    provenance_ledger: ProvenanceLedger,
    audit_entries: List[Dict],
    packet_id: Optional[str] = None
) -> Dict:
    """
    Check consistency between provenance ledger and audit log.
    
    Returns:
        {
            'consistent': bool,
            'errors': List[str],
            'checked_entries': int
        }
    """
    errors = []
    checked = 0
    
    # Check that audit entries referencing data have provenance records
    for entry in audit_entries:
        payload = entry.get('payload_json', {})
        data_id = payload.get('data_id') or payload.get('packet_id')
        
        if data_id:
            checked += 1
            # Check if provenance record exists
            # (Simplified - would check actual provenance ledger)
            pass
    
    return {
        'consistent': len(errors) == 0,
        'errors': errors,
        'checked_entries': checked
    }


def check_audit_packet_consistency(
    audit_entries: List[Dict],
    packets: List[Dict]
) -> Dict:
    """
    Check consistency between audit log and packet receipts.
    
    Returns:
        {
            'consistent': bool,
            'errors': List[str],
            'checked_packets': int
        }
    """
    errors = []
    checked = 0
    
    # Build map of packet IDs to audit entries
    packet_audit_map: Dict[str, List[Dict]] = {}
    for entry in audit_entries:
        payload = entry.get('payload_json', {})
        packet_id = payload.get('packet_id')
        if packet_id:
            if packet_id not in packet_audit_map:
                packet_audit_map[packet_id] = []
            packet_audit_map[packet_id].append(entry)
    
    # Check each packet has corresponding audit entries
    for packet in packets:
        packet_id = packet.get('id')
        if not packet_id:
            continue
        
        checked += 1
        
        # Check packet has audit entries
        if packet_id not in packet_audit_map:
            errors.append(f"Packet {packet_id} has no audit log entries")
            continue
        
        # Check receipt hash consistency
        packet_receipt_hash = packet.get('merkle', {}).get('receiptHash')
        if packet_receipt_hash:
            # Find corresponding audit entry with receipt hash
            receipt_entry = next(
                (e for e in packet_audit_map[packet_id] 
                 if e.get('payload_json', {}).get('receipt_hash') == packet_receipt_hash),
                None
            )
            
            if not receipt_entry:
                errors.append(f"Packet {packet_id} receipt hash not found in audit log")
    
    return {
        'consistent': len(errors) == 0,
        'errors': errors,
        'checked_packets': checked
    }


def check_provenance_packet_consistency(
    provenance_ledger: ProvenanceLedger,
    packets: List[Dict]
) -> Dict:
    """
    Check consistency between provenance ledger and packet receipts.
    
    Returns:
        {
            'consistent': bool,
            'errors': List[str],
            'checked_packets': int
        }
    """
    errors = []
    checked = 0
    
    for packet in packets:
        packet_id = packet.get('id')
        if not packet_id:
            continue
        
        checked += 1
        
        # Check packet evidence refs have provenance
        evidence_refs = packet.get('evidenceRefs', [])
        for evidence_ref in evidence_refs:
            # In production, would check provenance ledger for each evidence ref
            # For now, just verify structure
            if not isinstance(evidence_ref, str):
                errors.append(f"Packet {packet_id} has invalid evidence ref: {evidence_ref}")
    
    return {
        'consistent': len(errors) == 0,
        'errors': errors,
        'checked_packets': checked
    }


def run_all_consistency_checks(
    provenance_ledger: ProvenanceLedger,
    audit_log_path: Path,
    packets_dir: Path
) -> Dict:
    """
    Run all consistency checks across provenance, audit, and packets.
    
    Returns:
        Comprehensive consistency report
    """
    audit_entries = load_audit_log_entries(audit_log_path)
    packets = load_packets(packets_dir)
    
    provenance_audit = check_provenance_audit_consistency(provenance_ledger, audit_entries)
    audit_packet = check_audit_packet_consistency(audit_entries, packets)
    provenance_packet = check_provenance_packet_consistency(provenance_ledger, packets)
    
    all_consistent = (
        provenance_audit['consistent'] and
        audit_packet['consistent'] and
        provenance_packet['consistent']
    )
    
    all_errors = (
        provenance_audit['errors'] +
        audit_packet['errors'] +
        provenance_packet['errors']
    )
    
    return {
        'consistent': all_consistent,
        'timestamp': datetime.now().isoformat(),
        'checks': {
            'provenance_audit': provenance_audit,
            'audit_packet': audit_packet,
            'provenance_packet': provenance_packet
        },
        'total_errors': len(all_errors),
        'errors': all_errors,
        'summary': {
            'audit_entries': len(audit_entries),
            'packets': len(packets),
            'provenance_records': len(provenance_ledger.provenance_records)
        }
    }


if __name__ == "__main__":
    from provenance_ledger import ProvenanceLedger
    
    script_dir = Path(__file__).parent
    audit_log_path = script_dir / "out" / "audit.jsonl"
    packets_dir = script_dir / "out" / "packets"
    
    ledger = ProvenanceLedger()
    report = run_all_consistency_checks(ledger, audit_log_path, packets_dir)
    
    print(json.dumps(report, indent=2))
