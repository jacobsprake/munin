/**
 * POST /api/auth/login
 * Authenticate a user
 */
import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { operatorId, passphrase } = await request.json();

    if (!operatorId || !passphrase) {
      return NextResponse.json(
        { error: 'Missing operatorId or passphrase' },
        { status: 400 }
      );
    }

    const user = await authenticate(operatorId, passphrase);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // In production, you'd generate a JWT token here
    // For now, return user info (client should store securely)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        operatorId: user.operatorId,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Error authenticating:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

