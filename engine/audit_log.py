"""
Immutable Audit Log System
Merkle-chained append-only log for all handshake packet operations.

Features:
- Append-only (cannot modify existing entries)
- Merkle chaining (each entry links to previous)
- Tamper detection (any alteration breaks chain)
- File-based (audit.jsonl) and database storage
"""
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict


@dataclass
class AuditLogEntry:
    """Single audit log entry."""
    timestamp: str
    action: str  # 'create', 'approve', 'authorize', 'execute', 'reject'
    actor: str  # Operator ID or system identifier
    packet_id: str
    previous_hash: Optional[str]  # Hash of previous entry
    entry_hash: str  # Hash of this entry
    receipt_hash: str  # Combined hash (previous + entry)
    metadata: Dict  # Additional context (signatures, evidence, etc.)
    sequence_number: int  # Sequential entry number
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)
    
    def to_jsonl(self) -> str:
        """Convert to JSON Lines format."""
        return json.dumps(self.to_dict())


class ImmutableAuditLog:
    """
    Immutable audit log with Merkle chaining.
    Each entry is cryptographically linked to the previous one.
    """
    
    def __init__(self, log_path: Path):
        """
        Initialize audit log.
        
        Args:
            log_path: Path to audit.jsonl file
        """
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self._entries: List[AuditLogEntry] = []
        self._load_existing_entries()
    
    def _load_existing_entries(self):
        """Load existing entries from file."""
        if not self.log_path.exists():
            return
        
        try:
            with open(self.log_path, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        entry = AuditLogEntry(**data)
                        self._entries.append(entry)
                    except Exception as e:
                        print(f"Warning: Failed to parse audit log entry {line_num}: {e}")
        except Exception as e:
            print(f"Warning: Failed to load audit log: {e}")
    
    def _compute_hash(self, data: str) -> str:
        """Compute SHA-256 hash of data."""
        return hashlib.sha256(data.encode('utf-8')).hexdigest()
    
    def _get_previous_hash(self) -> Optional[str]:
        """Get hash of the last entry."""
        if not self._entries:
            return None
        return self._entries[-1].receipt_hash
    
    def _get_next_sequence(self) -> int:
        """Get next sequence number."""
        if not self._entries:
            return 1
        return self._entries[-1].sequence_number + 1
    
    def append(
        self,
        action: str,
        actor: str,
        packet_id: str,
        metadata: Optional[Dict] = None
    ) -> AuditLogEntry:
        """
        Append a new entry to the audit log.
        
        Args:
            action: Action type ('create', 'approve', 'authorize', etc.)
            actor: Operator ID or system identifier
            packet_id: ID of the handshake packet
            metadata: Additional context (signatures, evidence, etc.)
        
        Returns:
            Created audit log entry
        """
        timestamp = datetime.now().isoformat()
        previous_hash = self._get_previous_hash()
        sequence_number = self._get_next_sequence()
        
        # Create entry data (without hashes)
        entry_data = {
            'timestamp': timestamp,
            'action': action,
            'actor': actor,
            'packet_id': packet_id,
            'previous_hash': previous_hash,
            'sequence_number': sequence_number,
            'metadata': metadata or {}
        }
        
        # Compute entry hash (hash of entry data)
        entry_data_str = json.dumps(entry_data, sort_keys=True)
        entry_hash = self._compute_hash(entry_data_str)
        
        # Compute receipt hash (hash of previous + entry)
        if previous_hash:
            combined = f"{previous_hash}:{entry_hash}"
        else:
            combined = entry_hash
        receipt_hash = self._compute_hash(combined)
        
        # Create entry
        entry = AuditLogEntry(
            timestamp=timestamp,
            action=action,
            actor=actor,
            packet_id=packet_id,
            previous_hash=previous_hash,
            entry_hash=entry_hash,
            receipt_hash=receipt_hash,
            metadata=metadata or {},
            sequence_number=sequence_number
        )
        
        # Append to file (append-only)
        with open(self.log_path, 'a') as f:
            f.write(entry.to_jsonl() + '\n')
        
        # Add to in-memory list
        self._entries.append(entry)
        
        return entry
    
    def verify_chain(self) -> Dict:
        """
        Verify the integrity of the audit log chain.
        
        Returns:
            Dictionary with verification results
        """
        if not self._entries:
            return {
                'valid': True,
                'message': 'Empty log',
                'entries_checked': 0
            }
        
        errors = []
        
        # Verify each entry links to the previous
        for i, entry in enumerate(self._entries):
            # Recompute entry hash
            entry_data = {
                'timestamp': entry.timestamp,
                'action': entry.action,
                'actor': entry.actor,
                'packet_id': entry.packet_id,
                'previous_hash': entry.previous_hash,
                'sequence_number': entry.sequence_number,
                'metadata': entry.metadata
            }
            entry_data_str = json.dumps(entry_data, sort_keys=True)
            computed_entry_hash = self._compute_hash(entry_data_str)
            
            if computed_entry_hash != entry.entry_hash:
                errors.append(f"Entry {i+1}: Entry hash mismatch")
            
            # Recompute receipt hash
            if entry.previous_hash:
                combined = f"{entry.previous_hash}:{entry.entry_hash}"
            else:
                combined = entry.entry_hash
            computed_receipt_hash = self._compute_hash(combined)
            
            if computed_receipt_hash != entry.receipt_hash:
                errors.append(f"Entry {i+1}: Receipt hash mismatch")
            
            # Verify previous hash matches previous entry's receipt hash
            if i > 0:
                prev_entry = self._entries[i-1]
                if entry.previous_hash != prev_entry.receipt_hash:
                    errors.append(f"Entry {i+1}: Previous hash does not match previous entry's receipt hash")
        
        if errors:
            return {
                'valid': False,
                'message': 'Chain integrity compromised',
                'errors': errors,
                'entries_checked': len(self._entries)
            }
        else:
            return {
                'valid': True,
                'message': 'Chain intact',
                'entries_checked': len(self._entries),
                'last_receipt_hash': self._entries[-1].receipt_hash
            }
    
    def get_entries(
        self,
        packet_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[AuditLogEntry]:
        """
        Get audit log entries with optional filtering.
        
        Args:
            packet_id: Filter by packet ID
            action: Filter by action type
            limit: Maximum number of entries to return
        
        Returns:
            List of audit log entries
        """
        entries = self._entries.copy()
        
        if packet_id:
            entries = [e for e in entries if e.packet_id == packet_id]
        
        if action:
            entries = [e for e in entries if e.action == action]
        
        # Reverse to show most recent first
        entries.reverse()
        
        if limit:
            entries = entries[:limit]
        
        return entries
    
    def get_packet_history(self, packet_id: str) -> List[AuditLogEntry]:
        """Get all entries for a specific packet."""
        return self.get_entries(packet_id=packet_id)
    
    def get_latest_receipt_hash(self) -> Optional[str]:
        """Get the receipt hash of the latest entry."""
        if not self._entries:
            return None
        return self._entries[-1].receipt_hash
    
    def export_segment(
        self,
        start_sequence: int,
        end_sequence: int,
        output_path: Path
    ) -> bool:
        """
        Export a segment of the audit log.
        
        Args:
            start_sequence: Starting sequence number
            end_sequence: Ending sequence number
            output_path: Path to save exported segment
        
        Returns:
            True if successful
        """
        segment_entries = [
            e for e in self._entries
            if start_sequence <= e.sequence_number <= end_sequence
        ]
        
        if not segment_entries:
            return False
        
        with open(output_path, 'w') as f:
            for entry in segment_entries:
                f.write(entry.to_jsonl() + '\n')
        
        return True


def get_audit_log(log_dir: Path) -> ImmutableAuditLog:
    """
    Get or create audit log instance.
    
    Args:
        log_dir: Directory containing audit.jsonl
    
    Returns:
        ImmutableAuditLog instance
    """
    log_path = log_dir / 'audit.jsonl'
    return ImmutableAuditLog(log_path)


if __name__ == "__main__":
    # Test audit log
    test_dir = Path(__file__).parent / "out" / "test_audit"
    test_dir.mkdir(parents=True, exist_ok=True)
    
    log = ImmutableAuditLog(test_dir / "audit.jsonl")
    
    # Add test entries
    log.append('create', 'system', 'packet_001', {'playbook': 'flood_coordination'})
    log.append('approve', 'operator_001', 'packet_001', {'role': 'EA Duty Officer'})
    log.append('authorize', 'system', 'packet_001', {'signatures': 1, 'threshold': 1})
    
    # Verify chain
    result = log.verify_chain()
    print(f"Chain verification: {result}")
    
    # Get entries
    entries = log.get_entries(limit=10)
    print(f"\nTotal entries: {len(entries)}")
    for entry in entries:
        print(f"  {entry.sequence_number}: {entry.action} by {entry.actor} for {entry.packet_id}")
