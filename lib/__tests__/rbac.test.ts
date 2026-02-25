import {
  hasPermission,
  getRolePermissions,
  canApprovePacket,
  canViewSensitiveData,
  canConfigureSystem,
} from '../rbac';

describe('RBAC System', () => {
  describe('getRolePermissions', () => {
    it('returns permissions for all roles', () => {
      const roles = ['operator', 'supervisor', 'regulator', 'sovereign_architect'] as const;
      for (const role of roles) {
        const perms = getRolePermissions(role);
        expect(perms.role).toBe(role);
        expect(Array.isArray(perms.permissions)).toBe(true);
      }
    });
  });

  describe('hasPermission', () => {
    it('grants operators dashboard read', () => {
      expect(hasPermission('operator', 'dashboard', 'read')).toBe(true);
    });

    it('grants operators graph read', () => {
      expect(hasPermission('operator', 'graph', 'read')).toBe(true);
    });

    it('sovereign_architect has all permissions', () => {
      expect(hasPermission('sovereign_architect', 'system', 'admin')).toBe(true);
    });
  });

  describe('canApprovePacket', () => {
    it('returns boolean for all roles', () => {
      expect(typeof canApprovePacket('operator')).toBe('boolean');
      expect(typeof canApprovePacket('supervisor')).toBe('boolean');
      expect(typeof canApprovePacket('sovereign_architect')).toBe('boolean');
    });
  });

  describe('canViewSensitiveData', () => {
    it('returns boolean', () => {
      expect(typeof canViewSensitiveData('operator')).toBe('boolean');
      expect(typeof canViewSensitiveData('sovereign_architect')).toBe('boolean');
    });
  });

  describe('canConfigureSystem', () => {
    it('sovereign_architect can configure', () => {
      expect(canConfigureSystem('sovereign_architect')).toBe(true);
    });
  });
});
