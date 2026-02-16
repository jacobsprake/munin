import { NextRequest, NextResponse } from 'next/server';
import { UserRole, getRolePermissions } from '@/lib/rbac';

/**
 * GET /api/auth/role
 * 
 * Get permissions for a user role.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as UserRole;

    if (!role) {
      return NextResponse.json(
        { error: 'Role parameter required' },
        { status: 400 }
      );
    }

    const permissions = getRolePermissions(role);

    return NextResponse.json({
      success: true,
      role: permissions.role,
      description: permissions.description,
      permissions: permissions.permissions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get role permissions', details: error.message },
      { status: 500 }
    );
  }
}
