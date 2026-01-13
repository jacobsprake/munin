/**
 * POST /api/auth/users
 * Create a new user (admin only in production)
 */
import { NextResponse } from 'next/server';
import { createUser, userExists } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { operatorId, passphrase, role } = await request.json();

    if (!operatorId || !passphrase) {
      return NextResponse.json(
        { error: 'Missing operatorId or passphrase' },
        { status: 400 }
      );
    }

    if (userExists(operatorId)) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    const user = await createUser(operatorId, passphrase, role || 'operator');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        operatorId: user.operatorId,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}


