/**
 * Packet Validation Engine
 *
 * Validates authorisation packets against structural rules,
 * regulatory requirements, and consistency checks.
 */
import type { AuthorisationPacket, PacketStatus } from './types';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

const KNOWN_REGULATORY_REFS = [
  'CCA-2004', 'CCA-SECTION-2', 'NIS2-ARTICLE-21', 'NERC-CIP-008',
  'FWMA-2010', 'EA-OPERATIONAL', 'LRF-COORDINATION',
  'EMERGENCY-POWERS-ACT', 'CIVIL-CONTINGENCIES',
];

const STATUS_ORDER: PacketStatus[] = ['draft', 'ready', 'authorized', 'executed', 'verified', 'closed'];

export function validatePacket(packet: AuthorisationPacket): {
  ok: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  // Required fields
  if (!packet.id) errors.push({ field: 'id', message: 'Missing packet ID', severity: 'error' });
  if (!packet.situationSummary) errors.push({ field: 'situationSummary', message: 'Missing situation summary', severity: 'error' });
  if (!packet.proposedAction) errors.push({ field: 'proposedAction', message: 'Missing proposed action', severity: 'error' });
  if (!packet.playbookId) errors.push({ field: 'playbookId', message: 'Missing playbook ID', severity: 'error' });

  // Regulatory basis
  if (!packet.regulatoryBasis || packet.regulatoryBasis.trim() === '') {
    errors.push({ field: 'regulatoryBasis', message: 'Missing regulatory basis — packet cannot be legally defensible', severity: 'error' });
  }

  // Uncertainty validation
  if (packet.uncertainty) {
    if (packet.uncertainty.overall < 0 || packet.uncertainty.overall > 1) {
      errors.push({ field: 'uncertainty.overall', message: `Confidence ${packet.uncertainty.overall} out of range [0,1]`, severity: 'error' });
    }
    if (packet.uncertainty.overall < 0.5) {
      errors.push({ field: 'uncertainty.overall', message: `Low confidence (${packet.uncertainty.overall}) — requires additional evidence`, severity: 'warning' });
    }
  } else {
    errors.push({ field: 'uncertainty', message: 'Missing uncertainty block', severity: 'error' });
  }

  // Technical verification consistency
  if (packet.technicalVerification) {
    const tv = packet.technicalVerification;
    if (tv.simulatedSuccessProb < 0 || tv.simulatedSuccessProb > 1) {
      errors.push({ field: 'technicalVerification.simulatedSuccessProb', message: 'Success probability out of range', severity: 'error' });
    }
    if (tv.constraintsFailed && tv.constraintsFailed.length > 0 && tv.simulatedSuccessProb > 0.8) {
      errors.push({ field: 'technicalVerification', message: 'Failed constraints with high success probability — inconsistent', severity: 'warning' });
    }
  }

  // Multi-sig enforcement for authorized+ packets
  if (STATUS_ORDER.indexOf(packet.status) >= STATUS_ORDER.indexOf('authorized')) {
    if (!packet.multiSig) {
      errors.push({ field: 'multiSig', message: 'Authorized packet must have multiSig block', severity: 'error' });
    } else if (packet.multiSig.currentSignatures < packet.multiSig.threshold) {
      errors.push({ field: 'multiSig', message: `Insufficient signatures: ${packet.multiSig.currentSignatures}/${packet.multiSig.threshold}`, severity: 'error' });
    }
  }

  // Scope validation
  if (!packet.scope || !packet.scope.nodeIds || packet.scope.nodeIds.length === 0) {
    errors.push({ field: 'scope.nodeIds', message: 'Packet scope must include at least one node', severity: 'error' });
  }

  // Evidence refs
  if (!packet.evidenceRefs || packet.evidenceRefs.length === 0) {
    errors.push({ field: 'evidenceRefs', message: 'No evidence references — packet is unsupported', severity: 'warning' });
  }

  return {
    ok: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Lint a packet and return human-readable warnings.
 */
export function lintPacket(packet: AuthorisationPacket): string[] {
  const { errors } = validatePacket(packet);
  return errors.map(e => {
    const icon = e.severity === 'error' ? '✗' : '⚠';
    return `${icon} [${e.field}] ${e.message}`;
  });
}
