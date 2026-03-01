/**
 * POST /api/auth/login
 *
 * Authenticate an operator and create a session.
 * Returns an HMAC session token (air-gap safe, no cloud JWT).
 *
 * Request:  { operatorId, passphrase }
 * Response: { success, token, expiresAt, operator: { id, role, ministry } }
 */
import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createSession } from '@/lib/auth/sessions';
import { appendAuditLogEntry } from '@/lib/audit/auditLog';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operatorId, passphrase } = body;

    if (!operatorId || !passphrase) {
      return NextResponse.json(
        { error: 'Missing operatorId or passphrase' },
        { status: 400 }
      );
    }

    const user = await authenticate(operatorId, passphrase);

    if (!user) {
      // Audit failed login attempt
      try {
        appendAuditLogEntry('LOGIN_FAILED', {
          operatorId,
          reason: 'invalid_credentials',
          timestamp: new Date().toISOString(),
        });
      } catch { /* audit is best-effort */ }

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Look up ministry affiliation
    const db = getDb();
    const operator = db.prepare(
      'SELECT ministry_id FROM operators WHERE id = ?'
    ).get(user.id) as any;

    let ministry = null;
    if (operator?.ministry_id) {
      ministry = db.prepare(
        'SELECT id, name, code, type FROM ministries WHERE id = ?'
      ).get(operator.ministry_id);
    }

    // Create session
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const session = createSession(user.id, ipAddress, userAgent);

    // Audit successful login
    try {
      appendAuditLogEntry('LOGIN_SUCCESS', {
        operatorId: user.operatorId,
        role: user.role,
        ministryId: operator?.ministry_id || null,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });
    } catch { /* audit is best-effort */ }

    return NextResponse.json({
      success: true,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      operator: {
        id: user.id,
        operatorId: user.operatorId,
        role: user.role,
        ministryId: operator?.ministry_id || null,
      },
      ministry,
    });
  } catch (error: any) {
    console.error('Error authenticating:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
