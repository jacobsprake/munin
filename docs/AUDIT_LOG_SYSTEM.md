# Immutable Audit Log System

## Overview

The Munin immutable audit log system provides a tamper-proof, append-only record of all handshake packet operations. Each entry is cryptographically chained to the previous one using Merkle receipts, making it impossible to alter or reorder entries without detection.

## Features

### 1. Append-Only Log
- **File Format**: JSON Lines (`.jsonl`) - one entry per line
- **Location**: `engine/out/audit.jsonl` (or `engine/out/carlisle_demo/audit.jsonl`)
- **Immutable**: Once written, entries cannot be modified
- **Database Backup**: Also stored in SQLite database for querying

### 2. Merkle Chaining
Each entry links to the previous entry:
```
Entry 1: receipt_hash = SHA-256(entry_data)
Entry 2: receipt_hash = SHA-256(previous_receipt_hash + entry_data)
Entry 3: receipt_hash = SHA-256(previous_receipt_hash + entry_data)
...
```

**Properties**:
- Any alteration breaks the chain
- Reordering is impossible (each entry references previous)
- Tampering is immediately detectable

### 3. Entry Structure

```json
{
  "timestamp": "2026-01-13T17:39:41.714813",
  "action": "create",
  "actor": "system",
  "packet_id": "packet_incident_flood_20260101_20260113170242",
  "previous_hash": "8c4d1b4144cc1eca...",
  "entry_hash": "42612e6061945e4c...",
  "receipt_hash": "58748446777fffe3...",
  "metadata": {
    "playbook_id": "carlisle_flood_gate_coordination.yaml",
    "incident_type": "flood"
  },
  "sequence_number": 1
}
```

### 4. Actions Logged

- **`create`**: Packet created from incident
- **`approve`**: Operator approved packet
- **`authorize`**: Packet authorized (threshold met)
- **`execute`**: Actions executed
- **`reject`**: Packet rejected

## Implementation

### Python Module: `engine/audit_log.py`

**Key Classes**:
- `AuditLogEntry`: Single audit log entry
- `ImmutableAuditLog`: Main audit log manager

**Key Methods**:
- `append()`: Add new entry (append-only)
- `verify_chain()`: Verify chain integrity
- `get_entries()`: Query entries with filters
- `get_packet_history()`: Get all entries for a packet
- `export_segment()`: Export log segment

### Integration Points

#### 1. Packet Generation (`engine/packetize.py`)
```python
from audit_log import get_audit_log

audit_log = get_audit_log(output_dir.parent)
audit_log.append(
    action='create',
    actor='system',
    packet_id=packet['id'],
    metadata={'playbook_id': playbook_id, ...}
)
```

#### 2. Approval Workflow (`engine/test_approval_workflow.py`)
```python
audit_log.append(
    action='approve',
    actor=operator_id,
    packet_id=packet['id'],
    metadata={'role': role, 'signatures_received': signed_count}
)
```

#### 3. API Endpoint (`app/api/audit/log/route.ts`)
- `GET /api/audit/log`: Fetch audit log entries
- `POST /api/audit/log`: Verify chain integrity

#### 4. UI (`app/audit/page.tsx`)
- Displays audit log entries in real-time
- Shows chain integrity status
- Auto-refreshes every 30 seconds

## Usage

### Creating Audit Log Entries

```python
from audit_log import get_audit_log
from pathlib import Path

log_dir = Path("engine/out")
audit_log = get_audit_log(log_dir)

# Add entry
entry = audit_log.append(
    action='create',
    actor='operator_001',
    packet_id='packet_123',
    metadata={'key': 'value'}
)
```

### Verifying Chain Integrity

```python
result = audit_log.verify_chain()
if result['valid']:
    print("✅ Chain is intact")
else:
    print(f"❌ Chain broken: {result['errors']}")
```

### Querying Entries

```python
# Get all entries
entries = audit_log.get_entries(limit=100)

# Get entries for specific packet
packet_history = audit_log.get_packet_history('packet_123')

# Get entries by action
approvals = audit_log.get_entries(action='approve')
```

## Verification

### Automatic Verification
- Chain verified after each batch of entries
- Verification results logged
- Errors detected immediately

### Manual Verification
```bash
cd engine
python3 test_audit_log.py
```

**Output**:
```
✅ Chain is valid!
   Entries checked: 3
   Last receipt hash: 58748446777fffe3...
```

## API Endpoints

### GET /api/audit/log
Fetch audit log entries.

**Query Parameters**:
- `packetId`: Filter by packet ID
- `action`: Filter by action type
- `limit`: Maximum entries to return (default: 100)

**Response**:
```json
{
  "entries": [...],
  "count": 10,
  "total": 50
}
```

### POST /api/audit/log
Verify chain integrity.

**Body**:
```json
{
  "action": "verify"
}
```

**Response**:
```json
{
  "valid": true,
  "message": "Chain intact",
  "entries_checked": 10,
  "last_receipt_hash": "..."
}
```

## UI Integration

### Audit Page (`/audit`)
- Real-time audit log display
- Chain integrity indicator
- Entry details with metadata
- Auto-refresh every 30 seconds

**Features**:
- Shows sequence numbers
- Displays entry hashes and previous hashes
- Shows metadata for each entry
- Chain verification status

## Security Properties

### 1. Tamper Detection
- Any modification to an entry changes its hash
- Changed hash breaks chain continuity
- Verification immediately detects tampering

### 2. Reordering Prevention
- Each entry references previous entry's receipt hash
- Reordering breaks chain references
- Impossible to reorder without detection

### 3. Append-Only Guarantee
- File system append-only mode (in production)
- Database constraints prevent updates
- Read-only access for verification

### 4. Cryptographic Integrity
- SHA-256 hashing
- Merkle chaining
- Receipt hash proves chain continuity

## File Structure

```
engine/
├── audit_log.py              # Audit log implementation
├── test_audit_log.py         # Test script
└── out/
    ├── audit.jsonl           # Main audit log
    └── carlisle_demo/
        └── audit.jsonl       # Demo-specific audit log
```

## Testing

### Run Tests
```bash
cd engine
python3 test_audit_log.py
```

### Expected Output
```
✅ Entry 1: create by system for packet_001
✅ Entry 2: approve by ea_duty_officer_001 for packet_001
✅ Entry 3: authorize by system for packet_001
✅ Chain is valid!
✅ Entry 2 correctly links to entry 1
✅ Entry 3 correctly links to entry 2
```

## Integration with Handshake Packets

### Packet Creation
When a packet is created:
1. Packet generated with Merkle receipt
2. Audit log entry created: `action='create'`
3. Entry includes packet ID and metadata

### Packet Approval
When a packet is approved:
1. Approval signature added to packet
2. Audit log entry created: `action='approve'`
3. Entry includes operator ID and role

### Packet Authorization
When a packet is authorized:
1. Packet status changed to 'authorized'
2. Audit log entry created: `action='authorize'`
3. Entry includes timing metrics

## Best Practices

1. **Always verify chain** after batch operations
2. **Log all operations** - no silent actions
3. **Include metadata** for audit trail completeness
4. **Export segments** for compliance reporting
5. **Monitor chain integrity** in production

## Future Enhancements

1. **Distributed Audit Logs**: Replicate across multiple nodes
2. **Time-Stamping Service**: External time-stamp authority
3. **Compression**: Compress old log segments
4. **Encryption**: Encrypt sensitive metadata
5. **Retention Policies**: Automated archival
