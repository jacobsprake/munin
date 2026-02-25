/**
 * Immutable Audit Log Library
 * Tamper-evident, append-only audit log with cryptographic hash chaining
 * 
 * Features:
 * - Canonical JSON serialization (stable key ordering)
 * - Merkle hash chaining (entry_hash = SHA-256(canonical_payload + prev_hash))
 * - Ed25519 signature verification
 * - Chain integrity verification
 * - Checkpoint export
 */

import { createHash, randomBytes } from 'crypto';
import { getDb } from '../db/index';
import { verifySignature as verifyEd25519 } from './ed25519';

// Note: This implementation uses SQLite (via getDb) for compatibility
// PostgreSQL migrations are provided in migrations/ directory
// In production, use PostgreSQL with the provided migrations

// Expanded event types for sovereign, physics, and CMI events
export type AuditEventType =
  // Core events
  | 'DECISION_CREATED'
  | 'DECISION_SIGNED'
  | 'DECISION_AUTHORIZED'
  | 'DECISION_REJECTED'
  | 'DECISION_EXECUTED'
  | 'PACKET_CREATED'
  | 'PACKET_AUTHORIZED'
  | 'PACKET_EXECUTED'
  // Sovereign events
  | 'TEE_SIGNATURE_GENERATED'
  | 'TEE_ATTESTATION_VERIFIED'
  | 'PQC_KEY_ROTATED'
  | 'PQC_SIGNATURE_GENERATED'
  | 'BYZANTINE_QUORUM_CREATED'
  | 'BYZANTINE_SIGNATURE_ADDED'
  | 'BYZANTINE_QUORUM_MET'
  | 'BIOMETRIC_HANDSHAKE_VERIFIED'
  | 'AIR_GAP_VERIFIED'
  // Physics events
  | 'PHYSICS_VERIFICATION_PERFORMED'
  | 'HARDWARE_HACK_DETECTED'
  | 'PHYSICAL_SIGNAL_MISMATCH'
  | 'LOGIC_LOCK_VIOLATION'
  | 'LOGIC_LOCK_COMMAND_BLOCKED'
  | 'LOGIC_LOCK_COMMAND_ALLOWED'
  // CMI events
  | 'CMI_MODE_ACTIVATED'
  | 'CMI_MODE_DEACTIVATED'
  | 'CMI_ASSET_PRIORITIZED'
  | 'CMI_LOAD_SHEDDING_EXECUTED'
  | 'CMI_TIER_UPDATED'
  // Shadow mode events
  | 'SHADOW_ACTION_RECORDED'
  | 'SHADOW_PREDICTION_GENERATED'
  | 'SHADOW_COMPARISON_COMPUTED'
  | 'SHADOW_REPORT_GENERATED'
  // Other
  | 'USER_REGISTERED'
  | 'USER_KEY_ROTATED'
  | 'CONFIG_UPDATED'
  | 'SYSTEM_ERROR';

export interface AuditLogEntry {
  id: string;
  ts: Date;
  event_type: AuditEventType | string; // Allow string for backward compatibility
  payload_json: Record<string, any>;
  prev_hash: string | null;
  entry_hash: string;
  signer_id?: string;
  signature?: string;
  key_id?: string;
}

export interface Checkpoint {
  chain_head_hash: string;
  timestamp: Date;
  sequence_number: number;
  checkpoint_hash: string;
}

/**
 * Canonicalize JSON (stable key ordering)
 * Ensures consistent serialization for hash computation
 */
export function canonicalizeJSON(obj: Record<string, any>): string {
  // Sort keys recursively
  const sorted = (value: any): any => {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(sorted);
    }
    const sortedObj: Record<string, any> = {};
    Object.keys(value)
      .sort()
      .forEach(key => {
        sortedObj[key] = sorted(value[key]);
      });
    return sortedObj;
  };
  
  return JSON.stringify(sorted(obj), null, 0);
}

/**
 * Compute entry hash: SHA-256(canonical_payload + prev_hash)
 */
export function computeEntryHash(
  canonicalPayload: string,
  prevHash: string | null
): string {
  const combined = prevHash 
    ? `${canonicalPayload}:${prevHash}`
    : canonicalPayload;
  
  return createHash('sha256')
    .update(combined, 'utf8')
    .digest('hex');
}

/**
 * Get the previous entry hash (for chaining)
 */
export function getPreviousEntryHash(): string | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT entry_hash 
    FROM audit_log 
    ORDER BY ts DESC, sequence_number DESC 
    LIMIT 1
  `).get() as { entry_hash: string } | undefined;
  
  return row?.entry_hash || null;
}

/**
 * Get current sequence number
 */
export function getCurrentSequenceNumber(): number {
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count 
    FROM audit_log
  `).get() as { count: number };
  
  return row.count;
}

/**
 * Append entry to audit log (append-only)
 */
export function appendAuditLogEntry(
  eventType: AuditEventType | string,
  payload: Record<string, any>,
  signerId?: string,
  signature?: string,
  keyId?: string
): AuditLogEntry {
  const db = getDb();
  
  // Canonicalize payload
  const canonicalPayload = canonicalizeJSON(payload);
  
  // Get previous hash
  const prevHash = getPreviousEntryHash();
  
  // Compute entry hash
  const entryHash = computeEntryHash(canonicalPayload, prevHash);
  
  // Insert entry
  const id = randomBytes(16).toString('hex');
  const ts = new Date();
  
  const sequenceNumber = getCurrentSequenceNumber() + 1;
  
  db.prepare(`
    INSERT INTO audit_log (
      id, ts, event_type, payload_json, prev_hash, entry_hash, 
      signer_id, signature, key_id, sequence_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    ts.toISOString(),
    eventType,
    canonicalPayload,
    prevHash,
    entryHash,
    signerId || null,
    signature || null,
    keyId || null,
    sequenceNumber
  );
  
  return {
    id,
    ts,
    event_type: eventType,
    payload_json: payload,
    prev_hash: prevHash,
    entry_hash: entryHash,
    signer_id: signerId,
    signature,
    key_id: keyId
  };
}

/**
 * Verify chain integrity from genesis to head
 */
export function verifyChainIntegrity(): {
  valid: boolean;
  errors: string[];
  entriesChecked: number;
} {
  const db = getDb();
  const entries = db.prepare(`
    SELECT * FROM audit_log 
    ORDER BY sequence_number ASC, ts ASC
  `).all() as any[];
  
  const errors: string[] = [];
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Canonicalize payload (stored as JSON string in DB, parse first)
    const payloadObj = typeof entry.payload_json === 'string' 
      ? JSON.parse(entry.payload_json) 
      : entry.payload_json;
    const canonicalPayload = canonicalizeJSON(payloadObj);
    
    // Recompute entry hash
    const expectedEntryHash = computeEntryHash(
      canonicalPayload,
      entry.prev_hash
    );
    
    if (expectedEntryHash !== entry.entry_hash) {
      errors.push(
        `Entry ${i + 1} (id: ${entry.id}): Entry hash mismatch. ` +
        `Expected: ${expectedEntryHash}, Got: ${entry.entry_hash}`
      );
    }
    
    // Verify chain continuity
    if (i > 0) {
      const prevEntry = entries[i - 1];
      if (entry.prev_hash !== prevEntry.entry_hash) {
        errors.push(
          `Entry ${i + 1} (id: ${entry.id}): Chain broken. ` +
          `Previous hash ${entry.prev_hash} does not match ` +
          `previous entry hash ${prevEntry.entry_hash}`
        );
      }
    } else {
      // First entry should have null prev_hash
      if (entry.prev_hash !== null) {
        errors.push(
          `Entry 1 (id: ${entry.id}): Genesis entry should have null prev_hash`
        );
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    entriesChecked: entries.length
  };
}

/**
 * Verify Ed25519 signature on an entry
 */
export function verifySignature(
  entry: AuditLogEntry,
  publicKey: string
): boolean {
  if (!entry.signature || !entry.signer_id) {
    return false; // No signature to verify
  }
  
  // The signature should be over: entry_hash + signer_id + key_id
  const message = `${entry.entry_hash}:${entry.signer_id}:${entry.key_id || ''}`;
  
  // Verify Ed25519 signature
  return verifyEd25519(message, entry.signature, publicKey);
}

/**
 * Export checkpoint: chain_head_hash + timestamp + sequence_number
 */
export function exportCheckpoint(): Checkpoint {
  const db = getDb();
  
  // Get chain head (latest entry)
  const headEntry = db.prepare(`
    SELECT entry_hash, ts 
    FROM audit_log 
    ORDER BY ts DESC, id DESC 
    LIMIT 1
  `).get() as { entry_hash: string; ts: string } | undefined;
  
  if (!headEntry) {
    throw new Error('No entries in audit log to checkpoint');
  }
  
  const sequenceNumber = getCurrentSequenceNumber();
  const timestamp = new Date();
  
  // Compute checkpoint hash
  const checkpointData = {
    chain_head_hash: headEntry.entry_hash,
    timestamp: timestamp.toISOString(),
    sequence_number: sequenceNumber
  };
  const checkpointHash = createHash('sha256')
    .update(JSON.stringify(checkpointData))
    .digest('hex');
  
  // Save checkpoint to database
  const checkpointId = randomBytes(16).toString('hex');
  db.prepare(`
    INSERT INTO checkpoints (
      id, chain_head_hash, timestamp, sequence_number, checkpoint_hash
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    checkpointId,
    headEntry.entry_hash,
    timestamp.toISOString(),
    sequenceNumber,
    checkpointHash
  );
  
  return {
    chain_head_hash: headEntry.entry_hash,
    timestamp,
    sequence_number: sequenceNumber,
    checkpoint_hash: checkpointHash
  };
}

/**
 * Get entries with optional filters
 */
export function getAuditLogEntries(options: {
  eventType?: string;
  signerId?: string;
  limit?: number;
  offset?: number;
}): AuditLogEntry[] {
  const db = getDb();
  
  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params: any[] = [];
  
  if (options.eventType) {
    query += ' AND event_type = ?';
    params.push(options.eventType);
  }
  
  if (options.signerId) {
    query += ' AND signer_id = ?';
    params.push(options.signerId);
  }
  
  query += ' ORDER BY ts DESC, id DESC';
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    ts: new Date(row.ts),
    event_type: row.event_type,
    payload_json: typeof row.payload_json === 'string' 
      ? JSON.parse(row.payload_json) 
      : row.payload_json,
    prev_hash: row.prev_hash,
    entry_hash: row.entry_hash,
    signer_id: row.signer_id,
    signature: row.signature,
    key_id: row.key_id
  }));
}
