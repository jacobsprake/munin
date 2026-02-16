/**
 * Role-Based Access Control (RBAC) utilities
 * Enforces zero-trust architecture for Munin
 */

export type Role = 
  | 'admin'                    // Full system access
  | 'operator'                 // Can create/sign decisions, authorize packets
  | 'viewer'                   // Read-only access
  | 'ministry_of_defense'      // CMI Protocol authorization
  | 'defense'                  // Defense operations
  | 'water_authority'          // Water sector operations
  | 'power_grid_operator'      // Power sector operations
  | 'regulatory_compliance'    // Regulatory oversight
  | 'emergency_services';      // Emergency response

export interface Permission {
  resource: string;
  action: string;
}

/**
 * Permission matrix: role -> permissions
 */
const PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: '*', action: '*' }, // Full access
  ],
  operator: [
    { resource: 'decisions', action: 'create' },
    { resource: 'decisions', action: 'sign' },
    { resource: 'decisions', action: 'view' },
    { resource: 'packets', action: 'view' },
    { resource: 'packets', action: 'authorize' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
    { resource: 'simulation', action: 'run' },
  ],
  viewer: [
    { resource: 'decisions', action: 'view' },
    { resource: 'packets', action: 'view' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
  ],
  ministry_of_defense: [
    { resource: 'decisions', action: 'create' },
    { resource: 'decisions', action: 'sign' },
    { resource: 'decisions', action: 'view' },
    { resource: 'packets', action: 'view' },
    { resource: 'packets', action: 'authorize' },
    { resource: 'cmi', action: 'activate' },
    { resource: 'cmi', action: 'authorize' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
  ],
  defense: [
    { resource: 'decisions', action: 'create' },
    { resource: 'decisions', action: 'sign' },
    { resource: 'decisions', action: 'view' },
    { resource: 'packets', action: 'view' },
    { resource: 'packets', action: 'authorize' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
  ],
  water_authority: [
    { resource: 'decisions', action: 'create' },
    { resource: 'decisions', action: 'sign' },
    { resource: 'decisions', action: 'view' },
    { resource: 'packets', action: 'view' },
    { resource: 'packets', action: 'authorize' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
    { resource: 'water', action: '*' },
  ],
  power_grid_operator: [
    { resource: 'decisions', action: 'create' },
    { resource: 'decisions', action: 'sign' },
    { resource: 'decisions', action: 'view' },
    { resource: 'packets', action: 'view' },
    { resource: 'packets', action: 'authorize' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
    { resource: 'power', action: '*' },
  ],
  regulatory_compliance: [
    { resource: 'decisions', action: 'view' },
    { resource: 'decisions', action: 'sign' },
    { resource: 'packets', action: 'view' },
    { resource: 'audit', action: 'view' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
  ],
  emergency_services: [
    { resource: 'decisions', action: 'create' },
    { resource: 'decisions', action: 'sign' },
    { resource: 'decisions', action: 'view' },
    { resource: 'packets', action: 'view' },
    { resource: 'packets', action: 'authorize' },
    { resource: 'incidents', action: 'view' },
    { resource: 'graph', action: 'view' },
    { resource: 'simulation', action: 'run' },
  ],
};

/**
 * Check if a role has permission for a resource/action
 */
export function hasPermission(role: Role, resource: string, action: string): boolean {
  const permissions = PERMISSIONS[role] || [];
  
  // Admin has all permissions
  if (role === 'admin') {
    return true;
  }

  // Check for exact match
  const exactMatch = permissions.some(
    p => p.resource === resource && p.action === action
  );
  if (exactMatch) return true;

  // Check for wildcard resource
  const resourceWildcard = permissions.some(
    p => p.resource === '*' && p.action === action
  );
  if (resourceWildcard) return true;

  // Check for wildcard action
  const actionWildcard = permissions.some(
    p => p.resource === resource && p.action === '*'
  );
  if (actionWildcard) return true;

  // Check for full wildcard
  const fullWildcard = permissions.some(
    p => p.resource === '*' && p.action === '*'
  );
  if (fullWildcard) return true;

  return false;
}

/**
 * Require permission (throws if not authorized)
 */
export function requirePermission(role: Role, resource: string, action: string): void {
  if (!hasPermission(role, resource, action)) {
    throw new Error(`Permission denied: ${role} cannot ${action} on ${resource}`);
  }
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return PERMISSIONS[role] || [];
}
