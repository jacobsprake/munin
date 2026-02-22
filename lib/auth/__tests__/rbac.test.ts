/**
 * Lib test: auth/RBAC – permission checks
 */
import { hasPermission, requirePermission, getRolePermissions, type Role } from '../rbac';

describe('auth/rbac', () => {
  describe('hasPermission', () => {
    it('admin has all permissions', () => {
      expect(hasPermission('admin', 'decisions', 'create')).toBe(true);
      expect(hasPermission('admin', 'anything', 'anything')).toBe(true);
    });

    it('operator can create and sign decisions', () => {
      expect(hasPermission('operator', 'decisions', 'create')).toBe(true);
      expect(hasPermission('operator', 'decisions', 'sign')).toBe(true);
      expect(hasPermission('operator', 'packets', 'authorize')).toBe(true);
    });

    it('viewer cannot create or sign decisions', () => {
      expect(hasPermission('viewer', 'decisions', 'create')).toBe(false);
      expect(hasPermission('viewer', 'decisions', 'sign')).toBe(false);
      expect(hasPermission('viewer', 'decisions', 'view')).toBe(true);
    });

    it('water_authority has water wildcard', () => {
      expect(hasPermission('water_authority', 'water', 'read')).toBe(true);
      expect(hasPermission('water_authority', 'water', 'manage')).toBe(true);
    });

    it('regulatory_compliance can view audit', () => {
      expect(hasPermission('regulatory_compliance', 'audit', 'view')).toBe(true);
    });
  });

  describe('requirePermission', () => {
    it('throws when permission denied', () => {
      expect(() => requirePermission('viewer', 'decisions', 'create')).toThrow(/permission denied|cannot create/i);
    });

    it('does not throw when allowed', () => {
      expect(() => requirePermission('operator', 'decisions', 'create')).not.toThrow();
    });
  });

  describe('getRolePermissions', () => {
    it('returns array of permissions for role', () => {
      const perms = getRolePermissions('operator');
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.some(p => p.resource === 'decisions' && p.action === 'create')).toBe(true);
    });

    it('admin has wildcard permission', () => {
      const perms = getRolePermissions('admin');
      expect(perms.some(p => p.resource === '*' && p.action === '*')).toBe(true);
    });
  });
});
