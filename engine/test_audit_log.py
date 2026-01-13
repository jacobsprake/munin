"""
Test the immutable audit log system.
"""
import sys
from pathlib import Path

# Add engine directory to path
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from audit_log import get_audit_log, ImmutableAuditLog


def test_audit_log():
    """Test audit log functionality."""
    print("=" * 60)
    print("IMMUTABLE AUDIT LOG TEST")
    print("=" * 60)
    
    # Create test audit log
    test_dir = script_dir / "out" / "test_audit"
    test_dir.mkdir(parents=True, exist_ok=True)
    
    log = ImmutableAuditLog(test_dir / "audit.jsonl")
    
    print("\n[1] Creating test entries...")
    
    # Add test entries
    entry1 = log.append('create', 'system', 'packet_001', {
        'playbook': 'carlisle_flood_gate_coordination',
        'incident_type': 'flood'
    })
    print(f"  ✅ Entry 1: {entry1.action} by {entry1.actor} for {entry1.packet_id}")
    print(f"     Sequence: {entry1.sequence_number}, Hash: {entry1.entry_hash[:16]}...")
    
    entry2 = log.append('approve', 'ea_duty_officer_001', 'packet_001', {
        'role': 'EA Duty Officer',
        'signature_hash': 'abc123...'
    })
    print(f"  ✅ Entry 2: {entry2.action} by {entry2.actor} for {entry2.packet_id}")
    print(f"     Sequence: {entry2.sequence_number}, Hash: {entry2.entry_hash[:16]}...")
    print(f"     Previous: {entry2.previous_hash[:16] if entry2.previous_hash else 'None'}...")
    
    entry3 = log.append('authorize', 'system', 'packet_001', {
        'signatures_received': 1,
        'threshold': 1,
        'time_to_authorize': 3.78
    })
    print(f"  ✅ Entry 3: {entry3.action} by {entry3.actor} for {entry3.packet_id}")
    print(f"     Sequence: {entry3.sequence_number}, Hash: {entry3.entry_hash[:16]}...")
    
    print("\n[2] Verifying chain integrity...")
    result = log.verify_chain()
    
    if result['valid']:
        print(f"  ✅ Chain is valid!")
        print(f"     Entries checked: {result['entries_checked']}")
        print(f"     Last receipt hash: {result.get('last_receipt_hash', 'N/A')[:16]}...")
    else:
        print(f"  ❌ Chain verification failed!")
        print(f"     Errors: {result.get('errors', [])}")
    
    print("\n[3] Querying entries...")
    
    # Get all entries
    all_entries = log.get_entries(limit=10)
    print(f"  Total entries: {len(all_entries)}")
    
    # Get entries for specific packet
    packet_entries = log.get_packet_history('packet_001')
    print(f"  Entries for packet_001: {len(packet_entries)}")
    for entry in packet_entries:
        print(f"    - {entry.action} by {entry.actor} at {entry.timestamp}")
    
    # Get entries by action
    approve_entries = log.get_entries(action='approve')
    print(f"  Approval entries: {len(approve_entries)}")
    
    print("\n[4] Testing chain continuity...")
    for i, entry in enumerate(log._entries):
        if i > 0:
            prev_entry = log._entries[i-1]
            if entry.previous_hash == prev_entry.receipt_hash:
                print(f"  ✅ Entry {entry.sequence_number} correctly links to entry {prev_entry.sequence_number}")
            else:
                print(f"  ❌ Entry {entry.sequence_number} chain broken!")
                print(f"     Expected: {prev_entry.receipt_hash[:16]}...")
                print(f"     Got: {entry.previous_hash[:16] if entry.previous_hash else 'None'}...")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    
    return result['valid']


if __name__ == "__main__":
    success = test_audit_log()
    sys.exit(0 if success else 1)
