/**
 * Session Management API
 *
 * GET    /api/auth/session  — Validate current session (returns operator info)
 * DELETE /api/auth/session  — Logout (revoke current session)
 *
 * Air-gap safe: uses HMAC-SHA256 tokens stored in SQLite.
 * No cloud JWT providers, no external auth services.
 */
import { NextResponse } from 'next/server';
import { validateSession, revokeSession, extractToken } from '@/lib/auth/sessions';

export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'No session token provided', authenticated: false },
        { status: 401 }
      );
    }

    const session = validateSession(token);
    if (!session.valid) {
      return NextResponse.json(
        { error: session.reason, authenticated: false },
        { status: 401 }
      );
    }

    // Look up ministry info if affiliated
    let ministry = null;
    if (session.ministryId) {
      const { getDb } = require('@/lib/db');
      const db = getDb();
      ministry = db.prepare('SELECT id, name, code, type FROM ministries WHERE id = ?')
        .get(session.ministryId);
    }

    return NextResponse.json({
      authenticated: true,
      operator: {
        id: session.operatorId,
        role: session.role,
        ministryId: session.ministryId,
      },
      ministry,
      sessionId: session.sessionId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Session validation failed', authenticated: false },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: 'No session token' }, { status: 400 });
    }

    const session = validateSession(token);
    if (session.valid && session.sessionId) {
      revokeSession(session.sessionId);
    }

    return NextResponse.json({ success: true, message: 'Session revoked' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
