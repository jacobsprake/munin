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
  },
  {
    id: 'EU-NIS2-2022/2555-Art21',
    actName: 'NIS2 Directive — Article 21 Risk Management Measures',
    jurisdiction: 'EU',
    section: 'Article 21',
    title: 'Cybersecurity Risk-Management Measures (Detailed)',
    requirement: 'Essential and important entities shall take appropriate and proportionate technical, operational, and organisational measures to manage risks posed to the security of network and information systems, including incident handling, supply chain security, business continuity, and crisis management',
    authority: 'Mandates risk management measures including incident handling procedures, supply chain security policies, and crisis management protocols for essential and important entities',
    emergencyScope: ['cyber_attack', 'supply_chain_compromise', 'cascading_failure', 'critical_infrastructure'],
    actions: [
      'incident_handling',
      'supply_chain_verification',
      'crisis_management',
      'cross_sector_coordination',
      'backup_activation',
      'business_continuity'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Entity classified as essential or important under NIS2 Annex I or II',
        'Incident handling and response procedures established per Art. 21(2)(b)',
        'Supply chain security policies in place per Art. 21(2)(d)',
        'Business continuity and crisis management measures per Art. 21(2)(c)'
      ],
      notes: [
        'Member States must ensure entities adopt an all-hazards approach',
        'Measures must be proportionate to the risk, entity size, and likelihood/severity of incidents'
      ]
    },
    lastUpdated: '2023-01-16',
    citation: 'Directive (EU) 2022/2555, Art. 21(1)-(2)'
  },
  {
    id: 'UK-SEMD-2001',
    actName: 'UK Security and Emergency Measures Direction 2001',
    jurisdiction: 'UK',
    section: 'Direction 1-6',
    title: 'Security and Emergency Measures for Water Undertakers',
    requirement: 'Water undertakers must maintain security plans and emergency response measures to protect water supply infrastructure from threats including contamination, terrorism, and natural disasters',
    authority: 'Secretary of State direction requiring water undertakers to prepare, maintain, and test security and emergency plans for safeguarding water supply',
    emergencyScope: ['contamination', 'water_emergency', 'water_quality', 'terrorism', 'flood'],
    actions: [
      'isolate_affected_systems',
      'activate_backup_systems',
      'emergency_shutdown',
      'divert_flow',
      'contamination_response',
      'security_lockdown'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Applicable to all water undertakers in England and Wales',
        'Security plan approved by Defra and reviewed annually',
        'Emergency plans tested through regular exercises',
        'Coordination with Drinking Water Inspectorate and Environment Agency'
      ],
      notes: [
        'Issued under Section 208 of the Water Industry Act 1991',
        'Plans must address both malicious threats and natural hazards'
      ]
    },
    lastUpdated: '2022-06-01',
    citation: 'Security and Emergency Measures Direction 2001 (as amended), issued under WIA 1991 s.208'
  },
  {
    id: 'US-NERC-CIP-008',
    actName: 'NERC CIP-008 Incident Reporting and Response Planning',
    jurisdiction: 'US/Canada',
    section: 'CIP-008-6',
    title: 'Incident Reporting and Response Planning',
    requirement: 'Responsible entities must implement Cyber Security Incident response plans that include procedures for identifying, classifying, and responding to Cyber Security Incidents, and for reporting Reportable Cyber Security Incidents to the Electricity Subsector Coordinating Council (E-ISAC)',
    authority: 'Mandatory reliability standard requiring documented incident response plans, incident classification, response team activation, and mandatory reporting timelines',
    emergencyScope: ['cyber_attack', 'critical_infrastructure', 'power_instability', 'cascading_failure'],
    actions: [
      'incident_handling',
      'isolation_protocols',
      'cross_sector_coordination',
      'emergency_shutdown',
      'backup_activation',
      'forensic_preservation'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Applicable to registered entities with high and medium impact BES Cyber Systems',
        'Incident response plan tested at least once every 15 months',
        'Reportable incidents must be reported to E-ISAC within 1 hour of identification',
        'Compliance monitored by NERC Regional Entities with FERC enforcement'
      ],
      notes: [
        'CIP-008-6 became effective October 1, 2020',
        'Response plan must include roles, communication procedures, and incident handling procedures'
      ]
    },
    lastUpdated: '2020-10-01',
    citation: 'NERC Standard CIP-008-6, Requirements R1-R4'
  },
  {
    id: 'EU-GDPR-Art32',
    actName: 'General Data Protection Regulation — Article 32',
    jurisdiction: 'EU/EEA',
    section: 'Article 32',
    title: 'Security of Processing',
    requirement: 'Controllers and processors shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including pseudonymisation and encryption of personal data, the ability to ensure ongoing confidentiality, integrity, availability and resilience of processing systems, and the ability to restore availability and access to personal data in a timely manner following a physical or technical incident',
    authority: 'Legal obligation for data controllers and processors to implement security measures proportionate to risk, including encryption, resilience, and disaster recovery capabilities',
    emergencyScope: ['data_breach', 'cyber_attack', 'critical_infrastructure', 'cascading_failure'],
    actions: [
      'encryption_enforcement',
      'data_isolation',
      'backup_activation',
      'incident_handling',
      'business_continuity',
      'access_control_enforcement'
    ],
    regulatoryRelevance: {
      level: 'HIGH',
      conditions: [
        'Processing of personal data within EU/EEA or relating to EU/EEA data subjects',
        'Risk assessment conducted per Art. 32(1) considering state of the art and implementation costs',
        'Regular testing and evaluation of security measures per Art. 32(1)(d)',
        'Data sovereignty requirements met for cross-border data processing'
      ],
      notes: [
        'Relevant to Munin deployments processing operator identity or infrastructure telemetry containing personal data',
        'Supervisory authority enforcement with fines up to EUR 10 million or 2% of annual worldwide turnover per Art. 83(4)'
      ]
    },
    lastUpdated: '2018-05-25',
    citation: 'Regulation (EU) 2016/679, Art. 32(1)(a)-(d)'
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

