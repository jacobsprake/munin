/**
 * Air-Gap Safe Session Management
 *
 * Uses HMAC-SHA256 tokens stored in SQLite — no cloud JWT providers,
 * no external auth services, no internet required.
 *
 * Session flow:
 * 1. Operator authenticates with passphrase
 * 2. Server generates a random 256-bit session token
 * 3. Token hash is stored in DB; raw token is returned to client
 * 4. Client sends token in Authorization header on subsequent requests
 * 5. Server validates by hashing the token and looking up the session
 * 6. Sessions expire after configurable TTL (default 8 hours)
 */
import { createHmac, randomBytes } from 'crypto';
import { getDb } from '../db';

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || '8', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

export interface Session {
  id: string;
  operatorId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

function hashToken(token: string): string {
  return createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}

export function createSession(
  operatorId: string,
  ipAddress?: string,
  userAgent?: string
): Session {
  const db = getDb();
  const id = randomBytes(16).toString('hex');
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 3600 * 1000);

  db.prepare(`
    INSERT INTO sessions (id, operator_id, token_hash, ip_address, user_agent, created_at, expires_at, last_activity_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, operatorId, tokenHash, ipAddress || null, userAgent || null, now.toISOString(), expiresAt.toISOString(), now.toISOString());

  return { id, operatorId, token, expiresAt, createdAt: now };
}

export function validateSession(token: string): {
  valid: boolean;
  operatorId?: string;
  sessionId?: string;
  role?: string;
  ministryId?: string;
  reason?: string;
} {
  const db = getDb();
  const tokenHash = hashToken(token);

  const row = db.prepare(`
    SELECT s.id, s.operator_id, s.expires_at, s.revoked_at,
           o.role, o.ministry_id, o.status as operator_status
    FROM sessions s
    JOIN operators o ON o.id = s.operator_id
    WHERE s.token_hash = ?
  `).get(tokenHash) as any;

  if (!row) {
    return { valid: false, reason: 'Session not found' };
  }

  if (row.revoked_at) {
    return { valid: false, reason: 'Session revoked' };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: 'Session expired' };
  }

  if (row.operator_status !== 'active') {
    return { valid: false, reason: 'Operator account disabled' };
  }

  // Update last activity
  db.prepare('UPDATE sessions SET last_activity_at = ? WHERE id = ?')
    .run(new Date().toISOString(), row.id);

  return {
    valid: true,
    operatorId: row.operator_id,
    sessionId: row.id,
    role: row.role,
    ministryId: row.ministry_id,
  };
}

export function revokeSession(sessionId: string): void {
  const db = getDb();
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
    .run(new Date().toISOString(), sessionId);
}

export function revokeAllSessions(operatorId: string): void {
  const db = getDb();
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE operator_id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), operatorId);
}

export function cleanExpiredSessions(): number {
  const db = getDb();
  const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?')
    .run(new Date().toISOString());
  return result.changes;
}

/**
 * Extract session token from Authorization header.
 * Supports: "Bearer <token>" or raw token.
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return authHeader;
}
