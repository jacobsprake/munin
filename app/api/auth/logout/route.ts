/**
 * POST /api/auth/logout — Revoke current session (government-grade: explicit logout)
 * Accepts Bearer token; revokes session in DB.
 */
import { NextResponse } from 'next/server';
import { validateSession, revokeSession, extractToken } from '@/lib/auth/sessions';

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ success: true, message: 'No session to revoke' });
    }

    const session = validateSession(token);
    if (session.valid && session.sessionId) {
      revokeSession(session.sessionId);
    }

    return NextResponse.json({ success: true, message: 'Session revoked' });
  } catch {
    return NextResponse.json({ success: true, message: 'Logout completed' });
  }
}
