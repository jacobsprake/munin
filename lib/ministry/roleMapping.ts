/**
 * Maps RBAC roles and playbook approval_required to ministry types/codes.
 * Used to resolve which ministries must sign for a given decision.
 *
 * Wedge ministries (flood/water):
 * - EA (Environment Agency) → water_authority
 * - NGESO (National Grid ESO) → power_grid_operator
 * - MOD (Ministry of Defence) → ministry_of_defense / national_security
 */
import type { Role } from '@/lib/auth/rbac';

/** Ministry type values used by Byzantine engine and packets */
export type MinistryTypeCode =
  | 'water_authority'
  | 'power_grid_operator'
  | 'national_security'
  | 'defense_coordination'
  | 'regulatory_compliance'
  | 'emergency_services';

/** Map RBAC role → ministry type code (for Byzantine multi-sig) */
export const ROLE_TO_MINISTRY_TYPE: Record<Role, MinistryTypeCode | null> = {
  admin: null,
  operator: null,
  viewer: null,
  ministry_of_defense: 'national_security',
  defense: 'defense_coordination',
  water_authority: 'water_authority',
  power_grid_operator: 'power_grid_operator',
  regulatory_compliance: 'regulatory_compliance',
  emergency_services: 'emergency_services',
};

/** Map playbook approval_required.role or authority → ministry type code */
export const APPROVAL_ROLE_TO_MINISTRY: Record<string, MinistryTypeCode> = {
  'Senior Operator': 'water_authority',
  'Regulatory Compliance Officer': 'regulatory_compliance',
  'Emergency Operations': 'emergency_services',
  'emergency_operations': 'emergency_services',
  'regulatory_approval': 'regulatory_compliance',
  'Defense Coordinator': 'defense_coordination',
  'Power Grid Operator': 'power_grid_operator',
  'Water Authority': 'water_authority',
  'National Security': 'national_security',
};

/** Map ministry type code → preferred ministry codes (EA, NGESO, MOD for wedge) */
export const MINISTRY_TYPE_TO_CODES: Record<MinistryTypeCode, string[]> = {
  water_authority: ['EA'],
  power_grid_operator: ['NGESO'],
  national_security: ['MOD'],
  defense_coordination: ['MOD'],
  regulatory_compliance: ['EA', 'NGESO'], // EA has regulatory; NGESO for grid
  emergency_services: ['EA', 'MOD'],
};

/** Map Byzantine engine requiredMinistries (water_authority etc) → wedge ministry codes */
export const BYZANTINE_TYPE_TO_CODES: Record<string, string> = {
  water_authority: 'EA',
  power_grid_operator: 'NGESO',
  national_security: 'MOD',
  defense_coordination: 'MOD',
  regulatory_compliance: 'EA',
  emergency_services: 'EA',
};

/**
 * Resolve required ministry codes from playbook approval_required.
 * Returns unique ministry codes that must sign.
 */
export function resolveMinistryCodesFromApproval(
  approvalRequired: Array<{ role?: string; authority?: string }>
): string[] {
  const codes = new Set<string>();
  for (const a of approvalRequired || []) {
    for (const field of [a?.role, a?.authority]) {
      if (!field) continue;
      const ministryType = APPROVAL_ROLE_TO_MINISTRY[field];
      if (ministryType) {
        for (const code of MINISTRY_TYPE_TO_CODES[ministryType] || []) {
          codes.add(code);
        }
      }
    }
  }
  return Array.from(codes);
}
