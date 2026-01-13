# Files Added/Changed for Tamper-Evident Audit Log & Handshake System

## Database Migrations (PostgreSQL)

1. **`migrations/001_audit_log.sql`** (NEW)
   - Creates `audit_log` table with hash chaining
   - Columns: `id`, `ts`, `event_type`, `payload_json`, `prev_hash`, `entry_hash`, `signer_id`, `signature`, `key_id`
   - Indexes for efficient querying

2. **`migrations/002_decisions.sql`** (NEW)
   - Creates `decisions` table for handshake workflow
   - Columns: `decision_id`, `incident_id`, `playbook_id`, `step_id`, `status`, `policy_json`, `previous_decision_hash`
   - Supports M-of-N threshold policies

3. **`migrations/003_decision_signatures.sql`** (NEW)
   - Creates `decision_signatures` table
   - Columns: `id`, `decision_id`, `signer_id`, `signature`, `signed_at`, `key_id`
   - Unique constraint: one signature per signer per decision

4. **`migrations/004_users_keys.sql`** (NEW)
   - Creates `users` table with public key management
   - Columns: `user_id`, `name`, `role`, `public_key`, `key_id`, `key_status`
   - Creates `user_key_history` table for key rotation tracking

5. **`migrations/005_checkpoints.sql`** (NEW)
   - Creates `checkpoints` table
   - Columns: `id`, `chain_head_hash`, `timestamp`, `sequence_number`, `checkpoint_hash`

## Core Libraries

6. **`lib/audit/auditLog.ts`** (NEW)
   - Canonical JSON serialization (`canonicalizeJSON`)
   - Entry hash computation (`computeEntryHash`)
   - Chain integrity verification (`verifyChainIntegrity`)
   - Ed25519 signature verification (`verifySignature`)
   - Checkpoint export (`exportCheckpoint`)
   - Append-only entry creation (`appendAuditLogEntry`)

7. **`lib/audit/decisions.ts`** (NEW)
   - Decision creation (`createDecision`)
   - Decision signing (`signDecision`)
   - Threshold checking (auto-authorizes when threshold met)
   - Decision message canonicalization for signing
   - Decision message includes: `decision_id`, `incident_id`, `action_type`, `scope`, `created_at`, `previous_decision_hash`

8. **`lib/audit/keyManagement.ts`** (NEW)
   - User registration with Ed25519 keys (`registerUser`)
   - Key rotation (`rotateUserKey`)
   - Key revocation (`revokeUserKey`)
   - Key status checking (`isKeyActive`)

9. **`lib/audit/ed25519.ts`** (NEW)
   - Ed25519 key pair generation (`generateKeyPair`)
   - Message signing (`signMessage`)
   - Signature verification (`verifySignature`)
   - **Note**: Placeholder implementation - integrate with `@noble/ed25519` in production

## API Endpoints

10. **`app/api/decisions/create/route.ts`** (NEW)
    - `POST /api/decisions/create`
    - Creates decision with policy (threshold, required, signers)
    - Logs `DECISION_CREATED` to audit log
    - All endpoints write audit log entries

11. **`app/api/decisions/sign/route.ts`** (NEW)
    - `POST /api/decisions/sign`
    - Accepts Ed25519 signature over decision message
    - Verifies key is active
    - Checks threshold, auto-authorizes when met
    - Logs `DECISION_SIGNED` and `DECISION_AUTHORIZED` to audit log

## Database Schema Updates

12. **`lib/db/index.ts`** (MODIFIED)
    - Updated `audit_log` table schema (added `prev_hash`, `entry_hash`, `signer_id`, `signature`, `key_id`)
    - Added `decisions` table
    - Added `decision_signatures` table
    - Added `user_key_history` table
    - Added `checkpoints` table
    - Added indexes for performance

## Testing

13. **`lib/audit/__tests__/auditLog.test.ts`** (NEW)
    - Tests canonical JSON serialization
    - Tests hash chaining
    - Tests chain tamper detection
    - Tests Ed25519 signature validation
    - Tests threshold approval (1-of-1, 2-of-3)
    - Tests key rotation and revocation
    - Tests checkpoint export

## Documentation

14. **`README.md`** (MODIFIED)
    - Added "Audit Log Integrity Model" section
    - Explains hash chain, signature verification, checkpoints
    - Documents threat model and attack scenarios
    - Includes database schema documentation

15. **`docs/AUDIT_LOG_INTEGRITY.md`** (NEW)
    - Comprehensive documentation of audit log integrity model
    - Threat model and attack scenarios
    - Security guarantees
    - Production considerations

16. **`IMPLEMENTATION_SUMMARY.md`** (NEW)
    - Summary of all changes
    - Next steps for production deployment

## Brief Notes

### Hash Chaining
- Each entry: `entry_hash = SHA-256(canonical(payload) + prev_hash)`
- Genesis entry: `entry_hash = SHA-256(canonical(payload))`
- Chain verification detects tampering and reordering

### Canonical JSON
- Stable key ordering for deterministic hashing
- Recursive sorting of nested objects
- Ensures same object always produces same hash

### Ed25519 Signatures
- Digital signatures on audit log entries
- Signature over: `entry_hash:signer_id:key_id`
- Key rotation support via `key_id` and `key_status`

### Decision Workflow
- `CreateDecision`: Creates decision with M-of-N policy
- `SignDecision`: Accepts Ed25519 signature over decision message
- Auto-authorization when threshold met
- Decision message includes all required fields

### Key Management
- User registration with Ed25519 public keys
- Key rotation (old key marked ROTATED, new key ACTIVE)
- Key revocation (key marked REVOKED, cannot sign)
- Key history tracking

### Checkpoints
- Export checkpoint: `chain_head_hash + timestamp + sequence_number`
- Checkpoint hash for integrity
- Enables efficient verification and archival

### All Endpoints Write Audit Log
- `CreateDecision` → logs `DECISION_CREATED`
- `SignDecision` → logs `DECISION_SIGNED`
- Authorization → logs `DECISION_AUTHORIZED`
- Key operations → logs `USER_REGISTERED`, `KEY_ROTATED`, `KEY_REVOKED`
