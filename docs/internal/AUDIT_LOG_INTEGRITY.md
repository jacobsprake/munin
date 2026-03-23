# Audit Log Integrity Model

## Overview

Munin implements a tamper-evident, append-only audit log using cryptographic hash chaining and Ed25519 digital signatures. This provides an immutable audit trail for all incident workflow operations: **alert → playbook → tasking/approvals → audit log → replay**.

## Hash Chain

### Principle

Each audit log entry is cryptographically linked to the previous entry, creating an unbreakable chain where any modification or reordering is immediately detectable.

### Algorithm

```
Entry 1 (Genesis):
  entry_hash = SHA-256(canonical(payload_json))

Entry 2:
  entry_hash = SHA-256(canonical(payload_json) + prev_hash)

Entry 3:
  entry_hash = SHA-256(canonical(payload_json) + prev_hash)
  ...
```

### Properties

1. **Tamper-evident**: Any modification to an entry changes its hash, breaking the chain
2. **Order-preserving**: Each entry references the previous entry's hash, preventing reordering
3. **Append-only**: Entries cannot be modified or deleted without detection

### Canonical JSON

All payloads are serialized with stable key ordering to ensure deterministic hashing:

```typescript
canonicalizeJSON({ b: 2, a: 1, c: 3 }) === canonicalizeJSON({ c: 3, a: 1, b: 2 })
// Result: {"a":1,"b":2,"c":3}
```

**Implementation**: Recursively sorts all object keys before JSON serialization.

## Signature Verification

### Ed25519 Digital Signatures

All signed entries use Ed25519 (RFC 8032) for cryptographic proof of authorship.

### Signature Format

- **Message**: `entry_hash:signer_id:key_id`
- **Algorithm**: Ed25519
- **Key Format**: Base64-encoded public/private keys

### Verification Process

1. Extract signature, public key, and entry hash from audit log entry
2. Reconstruct message: `entry_hash:signer_id:key_id`
3. Verify Ed25519 signature: `ed25519.verify(signature, message, publicKey)`
4. Verify key status is ACTIVE (not REVOKED or ROTATED)

### Key Rotation

Keys can be rotated without breaking the audit trail:
- Old key marked as `ROTATED` (historical entries remain valid)
- New key marked as `ACTIVE` (used for new signatures)
- Key history tracked in `user_key_history` table

## Checkpoints

### Purpose

Periodic snapshots of chain state for:
- Efficient verification (verify from checkpoint to head)
- Archival (entries before checkpoint can be archived)
- Compliance audits (trusted reference points)

### Checkpoint Structure

```typescript
{
  chain_head_hash: string,    // Receipt hash of last entry
  timestamp: Date,            // Checkpoint creation time
  sequence_number: number,    // Sequence number of last entry
  checkpoint_hash: string    // SHA-256 hash of checkpoint data
}
```

### Usage

```typescript
const checkpoint = exportCheckpoint();
// Saves to database, returns checkpoint data
```

## Threat Model

### Threats Mitigated

#### 1. Tampering
- **Threat**: Attacker modifies existing entry payload
- **Mitigation**: Hash chain breaks on any modification
- **Detection**: Chain verification detects hash mismatches

#### 2. Reordering
- **Threat**: Attacker reorders entries to change sequence
- **Mitigation**: Each entry references previous entry's hash
- **Detection**: Chain verification detects broken references

#### 3. Deletion
- **Threat**: Attacker deletes entries to hide actions
- **Mitigation**: Append-only log, sequence numbers detect gaps
- **Detection**: Sequence number verification

#### 4. Forgery
- **Threat**: Attacker creates fake entries
- **Mitigation**: Ed25519 signatures require private key
- **Detection**: Signature verification fails with wrong key

#### 5. Key Compromise
- **Threat**: Attacker steals private key
- **Mitigation**: Key rotation support, key status tracking
- **Detection**: Revoked keys cannot sign new entries

### Attack Scenarios

#### Scenario 1: Payload Tampering
```
Attacker modifies entry payload:
  Original: {event: "DECISION_CREATED", decision_id: "abc"}
  Modified: {event: "DECISION_CREATED", decision_id: "xyz"}

Result:
  - Entry hash changes
  - Chain breaks (next entry's prev_hash no longer matches)
  - Verification detects: "Entry hash mismatch"
```

#### Scenario 2: Entry Reordering
```
Attacker swaps entry order:
  Original: Entry1 → Entry2 → Entry3
  Modified: Entry1 → Entry3 → Entry2

Result:
  - Entry3's prev_hash doesn't match Entry1's entry_hash
  - Chain breaks
  - Verification detects: "Chain broken: previous hash does not match"
```

#### Scenario 3: Signature Forgery
```
Attacker creates fake signature:
  - Uses wrong private key
  - Signature verification fails

Result:
  - Ed25519 verification returns false
  - Entry rejected or flagged
```

#### Scenario 4: Revoked Key Usage
```
Attacker uses revoked key:
  - Key status: REVOKED
  - Attempts to sign new entry

Result:
  - Key status check fails
  - Signing rejected: "Key is not active"
```

## Verification

### Chain Integrity Verification

```typescript
const result = verifyChainIntegrity();
// Returns: { valid: boolean, errors: string[], entriesChecked: number }
```

**Process**:
1. Load all entries in sequence order
2. For each entry:
   - Recompute entry hash from canonical payload + prev_hash
   - Compare with stored entry_hash
   - Verify prev_hash matches previous entry's entry_hash
3. Report any mismatches as errors

### Signature Verification

```typescript
const isValid = verifySignature(entry, publicKey);
// Verifies Ed25519 signature on entry_hash:signer_id:key_id
```

## Database Schema

### audit_log
- `id`: UUID primary key
- `ts`: Timestamp
- `event_type`: Event type (e.g., 'DECISION_CREATED', 'DECISION_SIGNED')
- `payload_json`: JSONB payload (canonicalized)
- `prev_hash`: Previous entry hash (NULL for genesis)
- `entry_hash`: SHA-256(canonical_payload + prev_hash)
- `signer_id`: Signer identifier
- `signature`: Ed25519 signature (base64)
- `key_id`: Key identifier (supports rotation)

### decisions
- `decision_id`: UUID primary key
- `incident_id`: Related incident
- `playbook_id`: Playbook used
- `status`: PENDING | AUTHORIZED | REJECTED | EXECUTED
- `policy_json`: {threshold: M, required: N, signers: [...]}
- `previous_decision_hash`: Hash of previous decision (for chaining)

### decision_signatures
- `id`: UUID primary key
- `decision_id`: Foreign key to decisions
- `signer_id`: Signer identifier
- `signature`: Ed25519 signature over decision message
- `key_id`: Key used for signing

### users
- `user_id`: UUID primary key
- `public_key`: Ed25519 public key (base64)
- `key_id`: Unique key identifier
- `key_status`: ACTIVE | REVOKED | ROTATED

### checkpoints
- `id`: UUID primary key
- `chain_head_hash`: Receipt hash of last entry
- `timestamp`: Checkpoint creation time
- `sequence_number`: Sequence number of last entry
- `checkpoint_hash`: SHA-256 hash of checkpoint data

## Implementation Files

- `lib/audit/auditLog.ts`: Core audit log library
- `lib/audit/decisions.ts`: Decision and signature management
- `lib/audit/keyManagement.ts`: Key rotation and status
- `lib/audit/ed25519.ts`: Ed25519 signature wrapper
- `migrations/001_audit_log.sql`: Database schema
- `app/api/decisions/create/route.ts`: CreateDecision endpoint
- `app/api/decisions/sign/route.ts`: SignDecision endpoint
- `lib/audit/__tests__/auditLog.test.ts`: Unit tests

## Security Guarantees

1. **Tamper Detection**: Hash chain breaks on any modification
2. **Reordering Prevention**: Each entry references previous entry's hash
3. **Forgery Prevention**: Ed25519 signatures require private key
4. **Key Compromise Mitigation**: Key rotation and revocation support
5. **Append-Only**: Entries cannot be modified or deleted

## Production Considerations

1. **Ed25519 Library**: Replace placeholder with `@noble/ed25519`
2. **PostgreSQL**: Use provided migrations for production database
3. **Backup**: Regular checkpoint exports for archival
4. **Monitoring**: Periodic chain verification in production
5. **Key Rotation Policy**: Define rotation schedule and procedures
