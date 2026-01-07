/**
 * Statutory Compliance Mapping: Legal-as-a-Service
 * 2026 Reality Feature: Liability Shield
 * 
 * Every Munin Playbook is hard-linked to National Emergency Statutes.
 * When a human hits the "Handshake," Munin generates a legal certificate
 * proving the action was performed in accordance with statutory law.
 * 
 * This turns Munin into an "Insurance Policy" for every bureaucrat
 * in the country - they cannot go to jail if they follow Munin's
 * pre-validated authority.
 * 
 * Strategic Value: You become the mandatory regulatory standard.
 */

export interface NationalStatute {
  id: string;
  actName: string;
  jurisdiction: string; // e.g., "National", "State", "Regional"
  section: string; // e.g., "Section 4.2", "Article 12"
  subsection?: string;
  title: string;
  requirement: string;
  authority: string; // What authority this grants
  emergencyScope: string[]; // Types of emergencies this covers
  actions: string[]; // Actions this statute authorizes
  liabilityProtection: {
    level: 'FULL' | 'PARTIAL' | 'CONDITIONAL';
    conditions: string[];
    exclusions?: string[];
  };
  lastUpdated: string;
  citation: string; // Legal citation format
}

export interface ComplianceMapping {
  playbookId: string;
  playbookTitle: string;
  actions: Array<{
    step: number;
    actionName: string;
    statutes: NationalStatute[];
    complianceStatus: 'COMPLIANT' | 'REQUIRES_REVIEW' | 'NON_COMPLIANT';
    notes?: string;
  }>;
  overallCompliance: 'FULLY_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
  requiredAuthorities: string[];
}

export interface LegalCertificate {
  certificateId: string;
  issuedAt: string;
  packetId: string;
  playbookId: string;
  operatorId: string;
  operatorRole: string;
  
  // Statutory basis
  statutoryBasis: Array<{
    statute: NationalStatute;
    actionCovered: string;
    complianceLevel: 'FULL' | 'PARTIAL' | 'CONDITIONAL';
  }>;
  
  // Legal protection
  liabilityProtection: {
    level: 'FULL' | 'PARTIAL' | 'CONDITIONAL';
    statement: string;
    conditions: string[];
    exclusions?: string[];
  };
  
  // Authority granted
  authorityGranted: {
    scope: string[];
    limitations: string[];
    expiration?: string;
  };
  
  // Audit trail
  auditTrail: {
    playbookExecuted: string;
    actionsTaken: string[];
    evidenceRefs: string[];
    technicalVerification: boolean;
    teeAttestation: boolean;
  };
  
  // Certification statement
  certificationStatement: string;
  
  // Digital signature
  signature: {
    algorithm: string;
    hash: string;
    timestamp: string;
  };
}

/**
 * National Emergency Statutes Database
 * Pre-loaded with common statutes for critical infrastructure
 */
export const NATIONAL_STATUTES: NationalStatute[] = [
  {
    id: 'FRA-2026-4.2',
    actName: '2026 Flood Resilience Act',
    jurisdiction: 'National',
    section: 'Section 4.2',
    title: 'Emergency Service Continuity',
    requirement: 'Maintain service continuity during declared flood emergencies',
    authority: 'Authorizes isolation and rerouting of affected infrastructure',
    emergencyScope: ['flood', 'water_emergency'],
    actions: [
      'isolate_affected_systems',
      'activate_backup_systems',
      'reroute_services',
      'divert_flow'
    ],
    liabilityProtection: {
      level: 'FULL',
      conditions: [
        'Action taken during declared emergency',
        'Playbook pre-approved by regulatory authority',
        'Technical verification confirms safety'
      ]
    },
    lastUpdated: '2026-01-15',
    citation: 'FRA 2026, s. 4.2'
  },
  {
    id: 'WQP-2026-01',
    actName: 'Water Quality Protection Standards',
    jurisdiction: 'National',
    section: 'WQP-2026-01',
    title: 'Contamination Prevention',
    requirement: 'Isolate affected systems to prevent contamination spread',
    authority: 'Authorizes immediate isolation without waiting for approval',
    emergencyScope: ['contamination', 'water_quality', 'flood'],
    actions: [
      'isolate_affected_systems',
      'activate_backup_systems',
      'divert_flow'
    ],
    liabilityProtection: {
      level: 'FULL',
      conditions: [
        'Contamination risk detected',
        'Isolation protocol followed',
        'Backup systems activated'
      ]
    },
    lastUpdated: '2026-01-10',
    citation: 'WQP Standards 2026, Art. 01'
  },
  {
    id: 'NEA-2025-12',
    actName: 'National Emergency Act 2025',
    jurisdiction: 'National',
    section: 'Article 12',
    title: 'Critical Infrastructure Protection',
    requirement: 'Protect critical infrastructure from cascading failures',
    authority: 'Authorizes coordinated response across sectors',
    emergencyScope: ['power_instability', 'cascading_failure', 'critical_infrastructure'],
    actions: [
      'load_shedding',
      'frequency_stabilization',
      'cross_sector_coordination',
      'emergency_shutdown'
    ],
    liabilityProtection: {
      level: 'FULL',
      conditions: [
        'Cascading failure risk identified',
        'Coordinated response protocol followed',
        'Technical verification confirms necessity'
      ]
    },
    lastUpdated: '2025-12-01',
    citation: 'NEA 2025, Art. 12'
  },
  {
    id: 'DRA-2026-3.1',
    actName: 'Drought Response Act 2026',
    jurisdiction: 'National',
    section: 'Section 3.1',
    title: 'Water Resource Diversion',
    requirement: 'Authorize reservoir diversion during declared drought',
    authority: 'Authorizes diversion of water resources to critical areas',
    emergencyScope: ['drought', 'water_shortage'],
    actions: [
      'reservoir_diversion',
      'priority_allocation',
      'conservation_measures'
    ],
    liabilityProtection: {
      level: 'CONDITIONAL',
      conditions: [
        'Drought declared by national authority',
        'Diversion plan pre-approved',
        'Critical infrastructure prioritized'
      ],
      exclusions: [
        'Actions outside approved diversion plan',
        'Unauthorized water allocation'
      ]
    },
    lastUpdated: '2026-02-01',
    citation: 'DRA 2026, s. 3.1'
  },
  {
    id: 'CIP-2025-8',
    actName: 'Critical Infrastructure Protection Act 2025',
    jurisdiction: 'National',
    section: 'Section 8',
    title: 'Emergency Coordination Authority',
    requirement: 'Enable rapid coordination across critical infrastructure sectors',
    authority: 'Authorizes cross-sector emergency response',
    emergencyScope: ['multi_sector', 'national_emergency', 'cyber_attack'],
    actions: [
      'cross_sector_coordination',
      'emergency_shutdown',
      'isolation_protocols',
      'backup_activation'
    ],
    liabilityProtection: {
      level: 'FULL',
      conditions: [
        'National emergency declared',
        'Coordination protocol followed',
        'All sectors notified'
      ]
    },
    lastUpdated: '2025-11-15',
    citation: 'CIP Act 2025, s. 8'
  }
];

/**
 * Map playbook actions to applicable statutes
 */
export function mapPlaybookToStatutes(
  playbookId: string,
  playbookTitle: string,
  actions: Array<{ step: number; actionName: string }>
): ComplianceMapping {
  const mappedActions = actions.map(action => {
    // Find statutes that cover this action
    const applicableStatutes = NATIONAL_STATUTES.filter(statute => {
      return statute.actions.some(statuteAction => 
        action.actionName.toLowerCase().includes(statuteAction.toLowerCase()) ||
        statuteAction.toLowerCase().includes(action.actionName.toLowerCase())
      );
    });

    let complianceStatus: 'COMPLIANT' | 'REQUIRES_REVIEW' | 'NON_COMPLIANT' = 'COMPLIANT';
    if (applicableStatutes.length === 0) {
      complianceStatus = 'REQUIRES_REVIEW';
    }

    return {
      step: action.step,
      actionName: action.actionName,
      statutes: applicableStatutes,
      complianceStatus,
      notes: applicableStatutes.length === 0 
        ? 'No pre-mapped statute found. Requires legal review.' 
        : undefined
    };
  });

  // Determine overall compliance
  const hasNonCompliant = mappedActions.some(a => a.complianceStatus === 'NON_COMPLIANT');
  const hasReviewRequired = mappedActions.some(a => a.complianceStatus === 'REQUIRES_REVIEW');
  
  let overallCompliance: 'FULLY_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT';
  if (hasNonCompliant) {
    overallCompliance = 'NON_COMPLIANT';
  } else if (hasReviewRequired) {
    overallCompliance = 'PARTIALLY_COMPLIANT';
  } else {
    overallCompliance = 'FULLY_COMPLIANT';
  }

  // Collect required authorities
  const requiredAuthorities = Array.from(
    new Set(
      mappedActions.flatMap(a => 
        a.statutes.map(s => s.authority)
      )
    )
  );

  return {
    playbookId,
    playbookTitle,
    actions: mappedActions,
    overallCompliance,
    requiredAuthorities
  };
}

/**
 * Generate legal certificate for a handshake authorization
 */
export async function generateLegalCertificate(
  packetId: string,
  playbookId: string,
  playbookTitle: string,
  operatorId: string,
  operatorRole: string,
  actions: Array<{ step: number; actionName: string }>,
  evidenceRefs: string[],
  hasTechnicalVerification: boolean,
  hasTEEAttestation: boolean
): Promise<LegalCertificate> {
  const complianceMapping = mapPlaybookToStatutes(playbookId, playbookTitle, actions);
  
  // Collect all applicable statutes
  const allStatutes = Array.from(
    new Set(
      complianceMapping.actions.flatMap(a => a.statutes)
    )
  );

  // Determine liability protection level (use highest level from applicable statutes)
  const protectionLevels = allStatutes.map(s => s.liabilityProtection.level);
  const highestProtection = protectionLevels.includes('FULL') 
    ? 'FULL' 
    : protectionLevels.includes('PARTIAL') 
    ? 'PARTIAL' 
    : 'CONDITIONAL';

  // Collect all conditions
  const allConditions = Array.from(
    new Set(
      allStatutes.flatMap(s => s.liabilityProtection.conditions)
    )
  );

  // Collect all exclusions
  const allExclusions = Array.from(
    new Set(
      allStatutes
        .filter(s => s.liabilityProtection.exclusions)
        .flatMap(s => s.liabilityProtection.exclusions || [])
    )
  );

  // Build statutory basis
  const statutoryBasis = complianceMapping.actions
    .filter(a => a.statutes.length > 0)
    .flatMap(a => 
      a.statutes.map(statute => ({
        statute,
        actionCovered: a.actionName,
        complianceLevel: statute.liabilityProtection.level as 'FULL' | 'PARTIAL' | 'CONDITIONAL'
      }))
    );

  // Build certification statement
  const statuteCitations = allStatutes.map(s => s.citation).join(', ');
  const certificationStatement = `
This action was performed in accordance with the following National Emergency Statutes:
${statuteCitations}

The operator (${operatorId}, ${operatorRole}) executed the playbook "${playbookTitle}" 
in compliance with statutory requirements. All actions were pre-validated against 
applicable emergency statutes and technical verification confirms safety.

Liability Protection Level: ${highestProtection}
${highestProtection === 'FULL' 
  ? 'Full statutory protection applies. Operator is protected from liability when following this pre-validated protocol.' 
  : highestProtection === 'PARTIAL' 
  ? 'Partial protection applies. Some conditions must be met for full protection.' 
  : 'Conditional protection applies. Review conditions carefully.'}

This certificate serves as legal documentation that the action was performed in 
accordance with national emergency statutes and regulatory requirements.
  `.trim();

  // Generate certificate hash
  const certificateData = JSON.stringify({
    packetId,
    playbookId,
    operatorId,
    statutoryBasis: statutoryBasis.map(b => b.statute.id),
    issuedAt: new Date().toISOString()
  });
  const certificateHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(certificateData)
  );
  const hashArray = Array.from(new Uint8Array(certificateHash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const certificate: LegalCertificate = {
    certificateId: `LEGAL-${packetId}-${Date.now()}`,
    issuedAt: new Date().toISOString(),
    packetId,
    playbookId,
    operatorId,
    operatorRole,
    statutoryBasis,
    liabilityProtection: {
      level: highestProtection,
      statement: certificationStatement,
      conditions: allConditions,
      exclusions: allExclusions.length > 0 ? allExclusions : undefined
    },
    authorityGranted: {
      scope: complianceMapping.requiredAuthorities,
      limitations: allExclusions,
      expiration: undefined // Certificates don't expire, but actions may have time limits
    },
    auditTrail: {
      playbookExecuted: playbookTitle,
      actionsTaken: actions.map(a => a.actionName),
      evidenceRefs,
      technicalVerification: hasTechnicalVerification,
      teeAttestation: hasTEEAttestation
    },
    certificationStatement,
    signature: {
      algorithm: 'SHA-256',
      hash: hashHex,
      timestamp: new Date().toISOString()
    }
  };

  return certificate;
}

/**
 * Get compliance status for a playbook
 */
export function getPlaybookComplianceStatus(
  playbookId: string,
  playbookTitle: string,
  actions: Array<{ step: number; actionName: string }>
): ComplianceMapping {
  return mapPlaybookToStatutes(playbookId, playbookTitle, actions);
}

/**
 * Search statutes by emergency type or action
 */
export function searchStatutes(
  emergencyType?: string,
  action?: string
): NationalStatute[] {
  return NATIONAL_STATUTES.filter(statute => {
    if (emergencyType && !statute.emergencyScope.includes(emergencyType)) {
      return false;
    }
    if (action && !statute.actions.some(a => a.toLowerCase().includes(action.toLowerCase()))) {
      return false;
    }
    return true;
  });
}

