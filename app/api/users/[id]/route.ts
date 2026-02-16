/**
 * PUT /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassphrase } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { role, passphrase } = body;
    const userId = params.id;

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update role if provided
    if (role) {
      const validRoles = ['operator', 'admin', 'viewer', 'ministry_of_defense', 'defense', 'water_authority', 'power_grid_operator', 'regulatory_compliance', 'emergency_services'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        );
      }
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    }

    // Update passphrase if provided
    if (passphrase) {
      const passphraseHash = await hashPassphrase(passphrase);
      db.prepare('UPDATE users SET passphrase_hash = ? WHERE id = ?').run(passphraseHash, userId);
    }

    const updatedUser = db.prepare('SELECT id, operator_id, role, created_at, last_login_at FROM users WHERE id = ?').get(userId) as any;

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        operator_id: updatedUser.operator_id,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
        last_login_at: updatedUser.last_login_at
      }
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
