/**
 * Key Management
 * Handles Ed25519 key generation, rotation, and status management
 */

import { randomBytes } from 'crypto';
import { getDb } from '../db/index';
import { appendAuditLogEntry } from './auditLog';

export interface UserKey {
  user_id: string;
  name: string;
  role: string;
  public_key: string; // Ed25519 public key (base64 encoded)
  key_id: string;
  key_status: 'ACTIVE' | 'REVOKED' | 'ROTATED';
  created_at: Date;
  revoked_at?: Date;
}

/**
 * Register a new user with Ed25519 public key
 */
export function registerUser(
  name: string,
  role: string,
  publicKey: string, // Ed25519 public key (base64 encoded)
  keyId?: string
): UserKey {
  const db = getDb();
  const userId = randomBytes(16).toString('hex');
  const finalKeyId = keyId || randomBytes(16).toString('hex');
  const createdAt = new Date();
  
  // Insert user
  db.prepare(`
    INSERT INTO users (
      user_id, name, role, public_key, key_id, key_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    name,
    role,
    publicKey,
    finalKeyId,
    'ACTIVE',
    createdAt.toISOString()
  );
  
  // Insert into key history
  db.prepare(`
    INSERT INTO user_key_history (
      user_id, key_id, public_key, status, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    userId,
    finalKeyId,
    publicKey,
    'ACTIVE',
    createdAt.toISOString()
  );
  
  const userKey: UserKey = {
    user_id: userId,
    name,
    role,
    public_key: publicKey,
    key_id: finalKeyId,
    key_status: 'ACTIVE',
    created_at: createdAt
  };
  
  // Log to audit
  appendAuditLogEntry(
    'USER_REGISTERED',
    {
      user_id: userId,
      name,
      role,
      key_id: finalKeyId
    }
  );
  
  return userKey;
}

/**
 * Rotate user key (create new key, mark old as ROTATED)
 */
export function rotateUserKey(
  userId: string,
  newPublicKey: string,
  newKeyId?: string
): UserKey {
  const db = getDb();
  
  // Get current user
  const user = db.prepare(`
    SELECT * FROM users WHERE user_id = ?
  `).get(userId) as any;
  
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  
  const oldKeyId = user.key_id;
  const newKeyIdFinal = newKeyId || randomBytes(16).toString('hex');
  const rotatedAt = new Date();
  
  // Update user with new key
  db.prepare(`
    UPDATE users 
    SET public_key = ?, key_id = ?, key_status = 'ACTIVE'
    WHERE user_id = ?
  `).run(newPublicKey, newKeyIdFinal, userId);
  
  // Mark old key as ROTATED in history
  db.prepare(`
    UPDATE user_key_history 
    SET status = 'ROTATED', rotated_to_key_id = ?
    WHERE user_id = ? AND key_id = ?
  `).run(newKeyIdFinal, userId, oldKeyId);
  
  // Add new key to history
  db.prepare(`
    INSERT INTO user_key_history (
      user_id, key_id, public_key, status, created_at, rotated_to_key_id
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    newKeyIdFinal,
    newPublicKey,
    'ACTIVE',
    rotatedAt.toISOString(),
    null
  );
  
  const updatedUser: UserKey = {
    user_id: user.user_id,
    name: user.name,
    role: user.role,
    public_key: newPublicKey,
    key_id: newKeyIdFinal,
    key_status: 'ACTIVE',
    created_at: new Date(user.created_at)
  };
  
  // Log to audit
  appendAuditLogEntry(
    'KEY_ROTATED',
    {
      user_id: userId,
      old_key_id: oldKeyId,
      new_key_id: newKeyIdFinal
    }
  );
  
  return updatedUser;
}

/**
 * Revoke user key
 */
export function revokeUserKey(userId: string, keyId: string): void {
  const db = getDb();
  const revokedAt = new Date();
  
  // Update user key status
  db.prepare(`
    UPDATE users 
    SET key_status = 'REVOKED', revoked_at = ?
    WHERE user_id = ? AND key_id = ?
  `).run(revokedAt.toISOString(), userId, keyId);
  
  // Update key history
  db.prepare(`
    UPDATE user_key_history 
    SET status = 'REVOKED', revoked_at = ?
    WHERE user_id = ? AND key_id = ?
  `).run(revokedAt.toISOString(), userId, keyId);
  
  // Log to audit
  appendAuditLogEntry(
    'KEY_REVOKED',
    {
      user_id: userId,
      key_id: keyId
    }
  );
}

/**
 * Get user by key_id
 */
export function getUserByKeyId(keyId: string): UserKey | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM users WHERE key_id = ?
  `).get(keyId) as any;
  
  if (!row) {
    return null;
  }
  
  return {
    user_id: row.user_id,
    name: row.name,
    role: row.role,
    public_key: row.public_key,
    key_id: row.key_id,
    key_status: row.key_status as UserKey['key_status'],
    created_at: new Date(row.created_at),
    revoked_at: row.revoked_at ? new Date(row.revoked_at) : undefined
  };
}

/**
 * Verify key is active
 */
export function isKeyActive(keyId: string): boolean {
  const user = getUserByKeyId(keyId);
  return user !== null && user.key_status === 'ACTIVE';
}
