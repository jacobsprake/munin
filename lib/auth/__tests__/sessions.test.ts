import { createSession, validateSession, revokeSession, revokeAllSessions, cleanExpiredSessions } from '../sessions';

describe('Air-Gap Session Management', () => {
  const testOperatorId = 'test_session_operator';

  beforeEach(() => {
    // Ensure a test operator exists
    const { getDb } = require('../../db');
    const db = getDb();
    const exists = db.prepare('SELECT id FROM operators WHERE id = ?').get(testOperatorId);
    if (!exists) {
      const { hashPassphrase } = require('../index');
      // Synchronous hash for test setup
      const hash = require('crypto').createHash('sha256').update('test_pass').digest('hex');
      db.prepare(
        "INSERT OR IGNORE INTO operators (id, operator_id, role, passphrase_hash, status) VALUES (?, ?, 'operator', ?, 'active')"
      ).run(testOperatorId, 'test_op_session', hash);
    }
  });

  it('creates a session with valid token', () => {
    const session = createSession(testOperatorId, '127.0.0.1', 'Jest');
    expect(session.token).toBeTruthy();
    expect(session.token).toHaveLength(64); // 32 bytes hex
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('validates a valid session', () => {
    const session = createSession(testOperatorId);
    const result = validateSession(session.token);
    expect(result.valid).toBe(true);
    expect(result.operatorId).toBe(testOperatorId);
    expect(result.role).toBe('operator');
  });

  it('rejects invalid token', () => {
    const result = validateSession('invalid_token_that_does_not_exist');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not found');
  });

  it('revokes a session', () => {
    const session = createSession(testOperatorId);
    revokeSession(session.id);
    const result = validateSession(session.token);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('revoked');
  });

  it('revokes all sessions for an operator', () => {
    const s1 = createSession(testOperatorId);
    const s2 = createSession(testOperatorId);
    revokeAllSessions(testOperatorId);
    expect(validateSession(s1.token).valid).toBe(false);
    expect(validateSession(s2.token).valid).toBe(false);
  });

  it('cleans expired sessions', () => {
    const count = cleanExpiredSessions();
    expect(typeof count).toBe('number');
  });
});
