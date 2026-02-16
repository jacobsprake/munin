/**
 * Role-Based Access Control (RBAC) System
 * 
 * Defines roles and permissions for different user types:
 * - operator: Day-to-day operations, can approve low-consequence actions
 * - supervisor: Can approve medium-consequence actions, view all data
 * - regulator: Read-only access to compliance and audit data
 * - sovereign_architect: Full system access, configuration changes
 */

export type UserRole = 'operator' | 'supervisor' | 'regulator' | 'sovereign_architect';

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'execute' | 'approve' | 'configure';
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  operator: {
    role: 'operator',
    description: 'Day-to-day operations staff',
    permissions: [
      { resource: 'dashboard', action: 'read' },
      { resource: 'incidents', action: 'read' },
      { resource: 'packets', action: 'read' },
      { resource: 'packets', action: 'approve' }, // Low-consequence only
      { resource: 'sensors', action: 'read' },
      { resource: 'graph', action: 'read' },
      { resource: 'simulation', action: 'read' },
      { resource: 'shadow_reports', action: 'read' },
    ],
  },
  supervisor: {
    role: 'supervisor',
    description: 'Supervisory staff with elevated permissions',
    permissions: [
      { resource: 'dashboard', action: 'read' },
      { resource: 'incidents', action: 'read' },
      { resource: 'incidents', action: 'write' },
      { resource: 'packets', action: 'read' },
      { resource: 'packets', action: 'approve' }, // All consequence levels
      { resource: 'packets', action: 'write' },
      { resource: 'sensors', action: 'read' },
      { resource: 'graph', action: 'read' },
      { resource: 'simulation', action: 'read' },
      { resource: 'simulation', action: 'execute' },
      { resource: 'shadow_reports', action: 'read' },
      { resource: 'audit_log', action: 'read' },
      { resource: 'metrics', action: 'read' },
    ],
  },
  regulator: {
    role: 'regulator',
    description: 'Regulatory compliance staff (read-only)',
    permissions: [
      { resource: 'dashboard', action: 'read' },
      { resource: 'incidents', action: 'read' },
      { resource: 'packets', action: 'read' },
      { resource: 'audit_log', action: 'read' },
      { resource: 'zkp_audits', action: 'read' },
      { resource: 'compliance_reports', action: 'read' },
      { resource: 'shadow_reports', action: 'read' },
    ],
  },
  sovereign_architect: {
    role: 'sovereign_architect',
    description: 'System architects with full access',
    permissions: [
      { resource: '*', action: 'read' },
      { resource: '*', action: 'write' },
      { resource: '*', action: 'execute' },
      { resource: '*', action: 'approve' },
      { resource: '*', action: 'configure' },
    ],
  },
};

export function hasPermission(
  role: UserRole,
  resource: string,
  action: Permission['action']
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;

  // Sovereign architect has all permissions
  if (role === 'sovereign_architect') return true;

  // Check for wildcard resource match
  const hasWildcard = rolePerms.permissions.some(
    (p) => p.resource === '*' && p.action === action
  );
  if (hasWildcard) return true;

  // Check for exact match
  return rolePerms.permissions.some(
    (p) => (p.resource === resource || p.resource === '*') && p.action === action
  );
}

export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

export function canApprovePacket(role: UserRole, consequenceLevel?: string): boolean {
  if (role === 'sovereign_architect' || role === 'supervisor') {
    return true; // Can approve all consequence levels
  }
  if (role === 'operator') {
    // Operators can only approve low-consequence actions
    return consequenceLevel === 'LOW' || !consequenceLevel;
  }
  return false;
}

export function canViewSensitiveData(role: UserRole): boolean {
  return role === 'supervisor' || role === 'sovereign_architect';
}

export function canConfigureSystem(role: UserRole): boolean {
  return role === 'sovereign_architect';
}
