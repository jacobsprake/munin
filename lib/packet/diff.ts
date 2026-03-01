/**
 * Packet Diff Engine
 *
 * Computes structured diffs between two authorisation packets,
 * enabling operators to see exactly what changed and why.
 */
import type { AuthorisationPacket } from './types';

export interface PacketDiff {
  changedFields: string[];
  riskDelta: {
    confidenceBefore: number;
    confidenceAfter: number;
    direction: 'improved' | 'degraded' | 'unchanged';
    constraintsAdded: string[];
    constraintsRemoved: string[];
    failedConstraintsAdded: string[];
    failedConstraintsRemoved: string[];
  };
  scopeDelta: {
    nodesAdded: string[];
    nodesRemoved: string[];
    regionsAdded: string[];
    regionsRemoved: string[];
  };
  evidenceDelta: {
    added: string[];
    removed: string[];
  };
  summary: string[];
}

export function diffPackets(before: AuthorisationPacket, after: AuthorisationPacket): PacketDiff {
  const changedFields: string[] = [];
  const summary: string[] = [];

  // Status change
  if (before.status !== after.status) {
    changedFields.push('status');
    summary.push(`Status changed from ${before.status} to ${after.status}`);
  }

  // Uncertainty/confidence delta
  const confBefore = before.uncertainty?.overall ?? 0;
  const confAfter = after.uncertainty?.overall ?? 0;
  const confDelta = confAfter - confBefore;
  let direction: 'improved' | 'degraded' | 'unchanged' = 'unchanged';
  if (confDelta > 0.01) {
    direction = 'improved';
    summary.push(`Confidence increased from ${(confBefore * 100).toFixed(0)}% to ${(confAfter * 100).toFixed(0)}%`);
  } else if (confDelta < -0.01) {
    direction = 'degraded';
    summary.push(`Confidence decreased from ${(confBefore * 100).toFixed(0)}% to ${(confAfter * 100).toFixed(0)}%`);
  }
  if (confDelta !== 0) changedFields.push('uncertainty.overall');

  // Constraints delta
  const satBeforeArr = before.technicalVerification?.constraintsSatisfied || [];
  const satAfterArr = after.technicalVerification?.constraintsSatisfied || [];
  const failBeforeArr = before.technicalVerification?.constraintsFailed || [];
  const failAfterArr = after.technicalVerification?.constraintsFailed || [];
  const satBeforeSet = new Set(satBeforeArr);
  const satAfterSet = new Set(satAfterArr);
  const failBeforeSet = new Set(failBeforeArr);
  const failAfterSet = new Set(failAfterArr);

  const constraintsAdded = satAfterArr.filter(c => !satBeforeSet.has(c));
  const constraintsRemoved = satBeforeArr.filter(c => !satAfterSet.has(c));
  const failedAdded = failAfterArr.filter(c => !failBeforeSet.has(c));
  const failedRemoved = failBeforeArr.filter(c => !failAfterSet.has(c));

  if (constraintsAdded.length) summary.push(`New constraints satisfied: ${constraintsAdded.join(', ')}`);
  if (failedAdded.length) summary.push(`New constraints FAILED: ${failedAdded.join(', ')}`);
  if (failedRemoved.length) summary.push(`Constraints no longer failing: ${failedRemoved.join(', ')}`);

  // Scope delta
  const nodesBefore = before.scope?.nodeIds || [];
  const nodesAfter = after.scope?.nodeIds || [];
  const nodesBeforeSet = new Set(nodesBefore);
  const nodesAfterSet = new Set(nodesAfter);
  const nodesAdded = nodesAfter.filter(n => !nodesBeforeSet.has(n));
  const nodesRemoved = nodesBefore.filter(n => !nodesAfterSet.has(n));
  const regionsBefore = before.scope?.regions || [];
  const regionsAfter = after.scope?.regions || [];
  const regionsBeforeSet = new Set(regionsBefore);
  const regionsAfterSet = new Set(regionsAfter);
  const regionsAdded = regionsAfter.filter(r => !regionsBeforeSet.has(r));
  const regionsRemoved = regionsBefore.filter(r => !regionsAfterSet.has(r));

  if (nodesAdded.length) {
    changedFields.push('scope.nodeIds');
    summary.push(`Scope expanded: +${nodesAdded.join(', ')}`);
  }
  if (nodesRemoved.length) summary.push(`Scope reduced: -${nodesRemoved.join(', ')}`);

  // Evidence delta
  const evBeforeArr = before.evidenceRefs || [];
  const evAfterArr = after.evidenceRefs || [];
  const evBeforeSet = new Set(evBeforeArr);
  const evAfterSet = new Set(evAfterArr);
  const evAdded = evAfterArr.filter(e => !evBeforeSet.has(e));
  const evRemoved = evBeforeArr.filter(e => !evAfterSet.has(e));
  if (evAdded.length) summary.push(`New evidence added: ${evAdded.length} references`);
  if (evRemoved.length) summary.push(`Evidence removed: ${evRemoved.length} references`);

  // Multi-sig changes
  if (before.multiSig?.currentSignatures !== after.multiSig?.currentSignatures) {
    changedFields.push('multiSig.currentSignatures');
    summary.push(`Signatures: ${before.multiSig?.currentSignatures || 0} → ${after.multiSig?.currentSignatures || 0}`);
  }

  // Other field changes
  if (before.proposedAction !== after.proposedAction) { changedFields.push('proposedAction'); summary.push('Proposed action updated'); }
  if (before.regulatoryBasis !== after.regulatoryBasis) { changedFields.push('regulatoryBasis'); summary.push('Regulatory basis updated'); }
  if (before.situationSummary !== after.situationSummary) { changedFields.push('situationSummary'); summary.push('Situation summary updated'); }

  return {
    changedFields,
    riskDelta: {
      confidenceBefore: confBefore,
      confidenceAfter: confAfter,
      direction,
      constraintsAdded,
      constraintsRemoved,
      failedConstraintsAdded: failedAdded,
      failedConstraintsRemoved: failedRemoved,
    },
    scopeDelta: { nodesAdded, nodesRemoved, regionsAdded, regionsRemoved },
    evidenceDelta: { added: evAdded, removed: evRemoved },
    summary,
  };
}
