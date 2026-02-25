/**
 * Authentication utilities
 * Basic authentication system for Munin
 */
import { sha256 } from '../hash';
import { getDb } from '../db';
import { randomUUID } from 'crypto';

export interface AuthUser {
  id: string;
  operatorId: string;
  role: string;
}

/**
 * Hash a passphrase
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  return sha256(passphrase);
}

/**
 * Verify a passphrase against a hash
 */
export async function verifyPassphrase(passphrase: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassphrase(passphrase);
  return computedHash === hash;
}

/**
 * Authenticate a user
 */
export async function authenticate(operatorId: string, passphrase: string): Promise<AuthUser | null> {
  const db = getDb();
  const user: any = db.prepare('SELECT * FROM operators WHERE operator_id = ?').get(operatorId);
  
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
 * Create a new user
 */
export async function createUser(operatorId: string, passphrase: string, role: string = 'operator'): Promise<AuthUser> {
  const db = getDb();
  const passphraseHash = await hashPassphrase(passphrase);
  const id = randomUUID();

  db.prepare(`
    INSERT INTO operators (id, operator_id, role, passphrase_hash)
    VALUES (?, ?, ?, ?)
  `).run(id, operatorId, role, passphraseHash);

  return {
    id,
    operatorId,
    role
  };
}

/**
 * Check if user exists
 */
export function userExists(operatorId: string): boolean {
  const db = getDb();
  const user: any = db.prepare('SELECT id FROM operators WHERE operator_id = ?').get(operatorId);
  return !!user;
}

/**
 * Get user by operator ID
 */
export function getUser(operatorId: string): AuthUser | null {
  const db = getDb();
  const user: any = db.prepare('SELECT * FROM operators WHERE operator_id = ?').get(operatorId);
  
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    operatorId: user.operator_id,
    role: user.role
  };
}


