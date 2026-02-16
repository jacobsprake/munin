/**
 * Decision and Signature Management
 * Handles decision creation, signing, and threshold-based authorization
 */

import { createHash, randomBytes } from 'crypto';
import { getDb } from '../db/index';
import { appendAuditLogEntry } from './auditLog';
import { signMessage, verifySignature } from './ed25519';

export interface Decision {
  decision_id: string;
  incident_id: string;
  playbook_id: string;
  step_id?: string;
  status: 'PENDING' | 'AUTHORIZED' | 'REJECTED' | 'EXECUTED';
  policy_json: {
    threshold: number; // M (minimum signatures required)
    required: number; // N (total signers)
    signers: string[]; // List of required signer IDs
  };
  created_at: Date;
  authorized_at?: Date;
  previous_decision_hash?: string;
}

export interface DecisionSignature {
  id: string;
  decision_id: string;
  signer_id: string;
  signature: string; // Ed25519 signature
  signed_at: Date;
  key_id: string;
}

/**
 * Create canonical decision message for signing
 * Must include: decision_id, incident_id, action_type, scope, created_at, previous_decision_hash
 * 
 * This message is what gets signed with Ed25519. The signature proves:
 * - The signer authorized this specific decision
 * - The decision content (action_type, scope) is what was signed
 * - The decision is part of a chain (previous_decision_hash)
 */
export function createDecisionMessage(decision: Decision, actionType: string, scope: Record<string, any>): string {
  const message = {
    decision_id: decision.decision_id,
    incident_id: decision.incident_id,
    action_type: actionType,
    scope: scope,
    created_at: decision.created_at.toISOString(),
    previous_decision_hash: decision.previous_decision_hash || null
  };
  
  // Canonicalize (stable key ordering) for deterministic signing
  // Sort keys recursively to ensure consistent serialization
  const sorted = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sorted);
    const sortedObj: Record<string, any> = {};
    Object.keys(obj).sort().forEach(key => {
      sortedObj[key] = sorted(obj[key]);
    });
    return sortedObj;
  };
  
  return JSON.stringify(sorted(message), null, 0);
}

/**
 * Create a new decision
 */
export function createDecision(
  incidentId: string,
  playbookId: string,
  stepId: string | undefined,
  policy: { threshold: number; required: number; signers: string[] },
  previousDecisionHash?: string
): Decision {
  const db = getDb();
  const decisionId = randomBytes(16).toString('hex');
  const createdAt = new Date();
  
  // Insert decision
  db.prepare(`
    INSERT INTO decisions (
      decision_id, incident_id, playbook_id, step_id, status, 
      policy_json, created_at, previous_decision_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    decisionId,
    incidentId,
    playbookId,
    stepId || null,
    'PENDING',
    JSON.stringify(policy),
    createdAt.toISOString(),
    previousDecisionHash || null
  );
  
  const decision: Decision = {
    decision_id: decisionId,
    incident_id: incidentId,
    playbook_id: playbookId,
    step_id: stepId,
    status: 'PENDING',
    policy_json: policy,
    created_at: createdAt,
    previous_decision_hash: previousDecisionHash
  };
  
  // Log decision creation to audit log
  appendAuditLogEntry(
    'DECISION_CREATED',
    {
      decision_id: decisionId,
      incident_id: incidentId,
      playbook_id: playbookId,
      policy: policy
    }
  );
  
  return decision;
}

/**
 * Sign a decision with Ed25519 signature
 * Note: This function is async because Ed25519 verification is async
 */
export async function signDecision(
  decisionId: string,
  signerId: string,
  signature: string, // Ed25519 signature over decision message
  keyId: string,
  actionType: string,
  scope: Record<string, any>
): DecisionSignature {
  const db = getDb();
  
  // Get decision
  const decisionRow = db.prepare(`
    SELECT * FROM decisions WHERE decision_id = ?
  `).get(decisionId) as any;
  
  if (!decisionRow) {
    throw new Error(`Decision ${decisionId} not found`);
  }
  
  const decision: Decision = {
    decision_id: decisionRow.decision_id,
    incident_id: decisionRow.incident_id,
    playbook_id: decisionRow.playbook_id,
    step_id: decisionRow.step_id,
    status: decisionRow.status as Decision['status'],
    policy_json: typeof decisionRow.policy_json === 'string'
      ? JSON.parse(decisionRow.policy_json)
      : decisionRow.policy_json,
    created_at: new Date(decisionRow.created_at),
    authorized_at: decisionRow.authorized_at ? new Date(decisionRow.authorized_at) : undefined,
    previous_decision_hash: decisionRow.previous_decision_hash
  };
  
  // Check if already signed by this signer
  const existingSig = db.prepare(`
    SELECT * FROM decision_signatures 
    WHERE decision_id = ? AND signer_id = ?
  `).get(decisionId, signerId) as any;
  
  if (existingSig) {
    throw new Error(`Decision ${decisionId} already signed by ${signerId}`);
  }
  
  // Verify signer is in policy
  if (!decision.policy_json.signers.includes(signerId)) {
    throw new Error(`Signer ${signerId} not in policy signers list`);
  }
  
  // Verify key is active
  const user = db.prepare(`
    SELECT key_status FROM users WHERE user_id = ? OR key_id = ?
  `).get(signerId, keyId) as { key_status: string } | undefined;
  
  if (!user || user.key_status !== 'ACTIVE') {
    throw new Error(`Key ${keyId} is not active for signer ${signerId}`);
  }
  
  // Create decision message for verification
  const decisionMessage = createDecisionMessage(decision, actionType, scope);
  
  // Verify Ed25519 signature
  const user = db.prepare(`
    SELECT public_key FROM users WHERE user_id = ? OR key_id = ?
  `).get(signerId, keyId) as { public_key: string } | undefined;
  
  if (!user) {
    throw new Error(`User or key not found: ${signerId}/${keyId}`);
  }
  
  // Verify signature (async, but we'll use sync version for compatibility)
  const isValid = await verifySignature(decisionMessage, signature, user.public_key);
  if (!isValid) {
    throw new Error('Invalid signature');
  }
  
  // Insert signature
  const sigId = randomBytes(16).toString('hex');
  const signedAt = new Date();
  
  db.prepare(`
    INSERT INTO decision_signatures (
      id, decision_id, signer_id, signature, signed_at, key_id
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    sigId,
    decisionId,
    signerId,
    signature,
    signedAt.toISOString(),
    keyId
  );
  
  const decisionSig: DecisionSignature = {
    id: sigId,
    decision_id: decisionId,
    signer_id: signerId,
    signature,
    signed_at: signedAt,
    key_id: keyId
  };
  
  // Log signature to audit log
  appendAuditLogEntry(
    'DECISION_SIGNED',
    {
      decision_id: decisionId,
      signer_id: signerId,
      key_id: keyId
    },
    signerId,
    signature,
    keyId
  );
  
  // Check if threshold is met
  const signatureCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM decision_signatures 
    WHERE decision_id = ?
  `).get(decisionId) as { count: number };
  
  if (signatureCount.count >= decision.policy_json.threshold) {
    // Mark as authorized
    db.prepare(`
      UPDATE decisions 
      SET status = 'AUTHORIZED', authorized_at = ?
      WHERE decision_id = ?
    `).run(new Date().toISOString(), decisionId);
    
    // Log authorization to audit log
    appendAuditLogEntry(
      'DECISION_AUTHORIZED',
      {
        decision_id: decisionId,
        signatures_received: signatureCount.count,
        threshold: decision.policy_json.threshold
      }
    );
  }
  
  return decisionSig;
}

/**
 * Get decision with signatures
 */
export function getDecision(decisionId: string): Decision & { signatures: DecisionSignature[] } | null {
  const db = getDb();
  
  const decisionRow = db.prepare(`
    SELECT * FROM decisions WHERE decision_id = ?
  `).get(decisionId) as any;
  
  if (!decisionRow) {
    return null;
  }
  
  const signatures = db.prepare(`
    SELECT * FROM decision_signatures 
    WHERE decision_id = ? 
    ORDER BY signed_at ASC
  `).all(decisionId) as any[];
  
  return {
    decision_id: decisionRow.decision_id,
    incident_id: decisionRow.incident_id,
    playbook_id: decisionRow.playbook_id,
    step_id: decisionRow.step_id,
    status: decisionRow.status as Decision['status'],
    policy_json: typeof decisionRow.policy_json === 'string'
      ? JSON.parse(decisionRow.policy_json)
      : decisionRow.policy_json,
    created_at: new Date(decisionRow.created_at),
    authorized_at: decisionRow.authorized_at ? new Date(decisionRow.authorized_at) : undefined,
    previous_decision_hash: decisionRow.previous_decision_hash,
    signatures: signatures.map(sig => ({
      id: sig.id,
      decision_id: sig.decision_id,
      signer_id: sig.signer_id,
      signature: sig.signature,
      signed_at: new Date(sig.signed_at),
      key_id: sig.key_id
    }))
  };
}

/**
 * List decisions with optional filters
 */
export function listDecisions(filters?: {
  status?: Decision['status'];
  incident_id?: string;
  playbook_id?: string;
  limit?: number;
  offset?: number;
}): (Decision & { signature_count: number })[] {
  const db = getDb();
  const { status, incident_id, playbook_id, limit = 100, offset = 0 } = filters || {};
  
  let query = `
    SELECT 
      d.*,
      COUNT(ds.id) as signature_count
    FROM decisions d
    LEFT JOIN decision_signatures ds ON d.decision_id = ds.decision_id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }
  if (incident_id) {
    query += ' AND d.incident_id = ?';
    params.push(incident_id);
  }
  if (playbook_id) {
    query += ' AND d.playbook_id = ?';
    params.push(playbook_id);
  }
  
  query += ' GROUP BY d.decision_id ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const rows = db.prepare(query).all(...params) as any[];
  
  return rows.map(row => ({
    decision_id: row.decision_id,
    incident_id: row.incident_id,
    playbook_id: row.playbook_id,
    step_id: row.step_id,
    status: row.status as Decision['status'],
    policy_json: typeof row.policy_json === 'string'
      ? JSON.parse(row.policy_json)
      : row.policy_json,
    created_at: new Date(row.created_at),
    authorized_at: row.authorized_at ? new Date(row.authorized_at) : undefined,
    previous_decision_hash: row.previous_decision_hash,
    signature_count: row.signature_count || 0
  }));
}
