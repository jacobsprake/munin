/**
 * Regulatory Compliance Mapping
 *
 * Maps Munin playbook actions to relevant regulatory frameworks for
 * informational purposes. Regulatory mapping is informational only
 * and does not constitute legal certification or liability protection.
 *
 * Consult qualified legal counsel for compliance determinations.
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
  regulatoryRelevance: {
    level: 'HIGH' | 'MODERATE' | 'LOW';
    conditions: string[];
    notes?: string[];
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

export interface ComplianceReport {
  reportId: string;
  issuedAt: string;
  packetId: string;
  playbookId: string;
  operatorId: string;
  operatorRole: string;

  // Regulatory mapping
  regulatoryMapping: Array<{
    statute: NationalStatute;
    actionCovered: string;
    relevanceLevel: 'HIGH' | 'MODERATE' | 'LOW';
  }>;

  // Regulatory context
  regulatoryContext: {
    level: 'HIGH' | 'MODERATE' | 'LOW';
    statement: string;
    conditions: string[];
    notes?: string[];
  };

  // Referenced authority
  referencedAuthority: {
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

  // Report statement
  reportStatement: string;

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
    id: 'EU-CER-2022/2557',
    actName: 'EU Critical Entities Resilience Directive',
    jurisdiction: 'EU',
    section: 'Article 12',
    title: 'Resilience of Critical Entities',
    requirement: 'Ensure continuity of essential services during disruptions',
    authority: 'Framework for resilience measures by critical entities',
    emergencyScope: ['flood', 'water_emergency'],
    actions: [
      'isolate_affected_systems',
      'activate_backup_systems',
      'reroute_services',
      'divert_flow'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Entity designated as critical under CER Directive',
        'Resilience plan in place per Article 13',
        'Member State notification requirements met'
      ]
    },
    lastUpdated: '2023-01-16',
    citation: 'Directive (EU) 2022/2557, Art. 12'
  },
  {
    id: 'UK-FWMA-2010',
    actName: 'UK Flood and Water Management Act 2010',
    jurisdiction: 'UK',
    section: 'Part 1',
    title: 'Flood and Coastal Erosion Risk Management',
    requirement: 'Manage flood risk and water quality',
    authority: 'Framework for flood risk management authorities',
    emergencyScope: ['contamination', 'water_quality', 'flood'],
    actions: [
      'isolate_affected_systems',
      'activate_backup_systems',
      'divert_flow'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Applicable to lead local flood authorities',
        'Flood risk management plan in effect',
        'Coordination with Environment Agency'
      ]
    },
    lastUpdated: '2010-04-08',
    citation: 'Flood and Water Management Act 2010, c.29'
  },
  {
    id: 'EU-NIS2-2022/2555',
    actName: 'NIS2 Directive',
    jurisdiction: 'EU',
    section: 'Article 21',
    title: 'Cybersecurity Risk-Management Measures',
    requirement: 'Implement measures to manage risks to network and information systems',
    authority: 'Framework for cybersecurity of essential and important entities',
    emergencyScope: ['power_instability', 'cascading_failure', 'critical_infrastructure'],
    actions: [
      'load_shedding',
      'frequency_stabilization',
      'cross_sector_coordination',
      'emergency_shutdown'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Entity classified as essential or important under NIS2',
        'Risk management measures per Article 21 in place',
        'Incident reporting per Article 23 requirements met'
      ]
    },
    lastUpdated: '2023-01-16',
    citation: 'Directive (EU) 2022/2555, Art. 21'
  },
  {
    id: 'US-NSM-22',
    actName: 'US National Security Memorandum 22',
    jurisdiction: 'US',
    section: 'Section 3',
    title: 'Critical Infrastructure Security and Resilience',
    requirement: 'Strengthen security and resilience of critical infrastructure',
    authority: 'Framework for sector-specific risk management',
    emergencyScope: ['drought', 'water_shortage'],
    actions: [
      'reservoir_diversion',
      'priority_allocation',
      'conservation_measures'
    ],
    regulatoryRelevance: {
      level: 'MODERATE',
      conditions: [
        'Applicable to designated critical infrastructure sectors',
        'Coordination with Sector Risk Management Agencies',
        'Alignment with National Infrastructure Protection Plan'
      ],
      notes: [
        'Specific actions require authorization from relevant agencies',
        'State and local authority may vary'
      ]
    },
    lastUpdated: '2024-04-30',
    citation: 'NSM-22 (April 30, 2024), Sec. 3'
  },
  {
    id: 'US-NERC-CIP',
    actName: 'NERC Critical Infrastructure Protection Standards',
    jurisdiction: 'US/Canada',
    section: 'CIP-001 through CIP-014',
    title: 'Critical Infrastructure Protection',
    requirement: 'Protect bulk electric system cyber assets and ensure reliability',
    authority: 'Mandatory reliability standards for bulk power system',
    emergencyScope: ['multi_sector', 'national_emergency', 'cyber_attack'],
    actions: [
      'cross_sector_coordination',
      'emergency_shutdown',
      'isolation_protocols',
      'backup_activation'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Applicable to registered entities in NERC registry',
        'Compliance monitored by Regional Entities',
        'FERC enforcement authority'
      ]
    },
    lastUpdated: '2024-01-01',
    citation: 'NERC CIP Standards (CIP-001 through CIP-014)'
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
    } as ComplianceMapping['actions'][number];
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
 * Generate a compliance report mapping actions to relevant regulatory frameworks.
 * This report is informational only and does not constitute legal advice.
 */
export async function generateComplianceReport(
  packetId: string,
  playbookId: string,
  playbookTitle: string,
  operatorId: string,
  operatorRole: string,
  actions: Array<{ step: number; actionName: string }>,
  evidenceRefs: string[],
  hasTechnicalVerification: boolean,
  hasTEEAttestation: boolean
): Promise<ComplianceReport> {
  const complianceMapping = mapPlaybookToStatutes(playbookId, playbookTitle, actions);

  // Collect all applicable statutes
  const allStatutes = Array.from(
    new Set(
      complianceMapping.actions.flatMap(a => a.statutes)
    )
  );

  // Determine relevance level (use highest level from applicable statutes)
  const relevanceLevels = allStatutes.map(s => s.regulatoryRelevance.level);
  const highestRelevance = relevanceLevels.includes('HIGH')
    ? 'HIGH'
    : relevanceLevels.includes('MODERATE')
    ? 'MODERATE'
    : 'LOW';

  // Collect all conditions
  const allConditions = Array.from(
    new Set(
      allStatutes.flatMap(s => s.regulatoryRelevance.conditions)
    )
  );

  // Collect all notes
  const allNotes = Array.from(
    new Set(
      allStatutes
        .filter(s => s.regulatoryRelevance.notes)
        .flatMap(s => s.regulatoryRelevance.notes || [])
    )
  );

  // Build regulatory mapping
  const regulatoryMapping = complianceMapping.actions
    .filter(a => a.statutes.length > 0)
    .flatMap(a =>
      a.statutes.map(statute => ({
        statute,
        actionCovered: a.actionName,
        relevanceLevel: statute.regulatoryRelevance.level as 'HIGH' | 'MODERATE' | 'LOW'
      }))
    );

  // Build report statement
  const statuteCitations = allStatutes.map(s => s.citation).join(', ');
  const reportStatement = `This report maps operational actions to relevant regulatory frameworks for informational purposes. It does not constitute legal advice. Consult qualified legal counsel for compliance determinations.

Referenced regulations: ${statuteCitations}

The operator (${operatorId}, ${operatorRole}) executed the playbook "${playbookTitle}".
Actions have been mapped to potentially relevant regulatory frameworks listed above.

Regulatory relevance: ${highestRelevance}

This report is generated for record-keeping and audit trail purposes.
Regulatory compliance status should be confirmed by qualified legal counsel.`.trim();

  // Generate report hash
  const reportData = JSON.stringify({
    packetId,
    playbookId,
    operatorId,
    regulatoryMapping: regulatoryMapping.map(b => b.statute.id),
    issuedAt: new Date().toISOString()
  });
  const reportHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(reportData)
  );
  const hashArray = Array.from(new Uint8Array(reportHash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const report: ComplianceReport = {
    reportId: `COMPLIANCE-${packetId}-${Date.now()}`,
    issuedAt: new Date().toISOString(),
    packetId,
    playbookId,
    operatorId,
    operatorRole,
    regulatoryMapping,
    regulatoryContext: {
      level: highestRelevance,
      statement: reportStatement,
      conditions: allConditions,
      notes: allNotes.length > 0 ? allNotes : undefined
    },
    referencedAuthority: {
      scope: complianceMapping.requiredAuthorities,
      limitations: allNotes,
      expiration: undefined
    },
    auditTrail: {
      playbookExecuted: playbookTitle,
      actionsTaken: actions.map(a => a.actionName),
      evidenceRefs,
      technicalVerification: hasTechnicalVerification,
      teeAttestation: hasTEEAttestation
    },
    reportStatement,
    signature: {
      algorithm: 'SHA-256',
      hash: hashHex,
      timestamp: new Date().toISOString()
    }
  };

  return report;
}

/** @deprecated Use generateComplianceReport instead */
export const generateLegalCertificate = generateComplianceReport;

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

