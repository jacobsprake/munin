/**
 * GET /api/users - List users
 * POST /api/users - Create user
 */
import { NextResponse } from 'next/server';
import { getUser, createUser, userExists } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, operator_id, role, created_at, last_login_at FROM users ORDER BY created_at DESC').all() as any[];
    
    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        operator_id: u.operator_id,
        role: u.role,
        created_at: u.created_at,
        last_login_at: u.last_login_at
      }))
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operator_id, passphrase, role } = body;

    if (!operator_id || !passphrase || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: operator_id, passphrase, role' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['operator', 'admin', 'viewer', 'ministry_of_defense', 'defense', 'water_authority', 'power_grid_operator', 'regulatory_compliance', 'emergency_services'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (userExists(operator_id)) {
      return NextResponse.json(
        { error: 'User with this operator_id already exists' },
        { status: 409 }
      );
    }

    // Create user
    const user = await createUser(operator_id, passphrase, role);

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
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
