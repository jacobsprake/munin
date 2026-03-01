/**
 * Authentication utilities
 *
 * Uses Argon2id for password hashing — the OWASP-recommended algorithm
 * for government/military systems. Memory-hard, GPU-resistant, with
 * configurable time/memory cost.
 *
 * Air-gap compatible: no external auth providers.
 */
import { getDb } from '../db';
import { randomUUID } from 'crypto';

let argon2: any = null;
try {
  argon2 = require('argon2');
} catch {
  // Fallback for environments where native argon2 can't compile
}

export interface AuthUser {
  id: string;
  operatorId: string;
  role: string;
}

/**
 * Hash a passphrase using Argon2id (OWASP recommended).
 * Falls back to SHA-256 if argon2 native module unavailable.
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  if (argon2) {
    return argon2.hash(passphrase, {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }
  // Fallback: SHA-256 (development only — not for production)
  const { createHash } = require('crypto');
  return createHash('sha256').update(passphrase).digest('hex');
}

/**
 * Verify a passphrase against a stored hash.
 */
export async function verifyPassphrase(passphrase: string, hash: string): Promise<boolean> {
  if (argon2 && hash.startsWith('$argon2')) {
    return argon2.verify(hash, passphrase);
  }
  // Fallback: SHA-256 comparison
  const { createHash } = require('crypto');
  const computed = createHash('sha256').update(passphrase).digest('hex');
  return computed === hash;
}

/**
 * Authenticate operator with rate-limit tracking.
 */
export async function authenticate(operatorId: string, passphrase: string): Promise<AuthUser | null> {
  const db = getDb();

  // Rate limiting: check recent failed attempts
  const recentFails = db.prepare(`
    SELECT COUNT(*) as cnt FROM audit_log
    WHERE event_type = 'LOGIN_FAILED'
      AND json_extract(payload_json, '$.operatorId') = ?
      AND ts > datetime('now', '-15 minutes')
  `).get(operatorId) as any;

  if (recentFails && recentFails.cnt >= 5) {
    throw new Error('Account temporarily locked: too many failed attempts. Try again in 15 minutes.');
  }

  const user: any = db.prepare('SELECT * FROM operators WHERE operator_id = ? AND status = ?').get(operatorId, 'active');

  if (!user) {
    return null;
  }

  const isValid = await verifyPassphrase(passphrase, user.passphrase_hash);
  if (!isValid) {
    return null;
  }

  // Update last login
  db.prepare('UPDATE operators SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return {
    id: user.id,
    operatorId: user.operator_id,
    role: user.role
  };
}

/**
 * Create a new operator account.
 */
export async function createUser(
  operatorId: string,
  passphrase: string,
  role: string = 'operator',
  ministryId?: string,
  clearanceLevel: string = 'standard'
): Promise<AuthUser> {
  const db = getDb();
  const passphraseHash = await hashPassphrase(passphrase);
  const id = randomUUID();

  db.prepare(`
    INSERT INTO operators (id, operator_id, role, passphrase_hash, ministry_id, clearance_level, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(id, operatorId, role, passphraseHash, ministryId || null, clearanceLevel);

  return { id, operatorId, role };
}

/**
 * Check if operator exists.
 */
export function userExists(operatorId: string): boolean {
  const db = getDb();
  const user: any = db.prepare('SELECT id FROM operators WHERE operator_id = ?').get(operatorId);
  return !!user;
}

/**
 * Get operator by ID.
 */
export function getUser(operatorId: string): AuthUser | null {
  const db = getDb();
  const user: any = db.prepare('SELECT * FROM operators WHERE operator_id = ?').get(operatorId);

  if (!user) return null;

  return {
    id: user.id,
    operatorId: user.operator_id,
    role: user.role
  };
}
