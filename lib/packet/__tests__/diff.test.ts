import { diffPackets } from '../diff';
import type { AuthorisationPacket } from '../types';

const packetV1: AuthorisationPacket = {
  id: 'test-v1', version: 1, createdTs: '2025-10-10T10:00:00Z', status: 'draft',
  scope: { regions: ['sector_4'], nodeIds: ['substation_A', 'pump_station_7'] },
  situationSummary: 'Initial detection', proposedAction: 'Monitor', regulatoryBasis: 'CCA 2004',
  playbookId: 'flood.yaml', evidenceRefs: ['ev_001'],
  uncertainty: { overall: 0.62, notes: ['Low confidence'] },
  technicalVerification: { simulatedSuccessProb: 0.78, constraintsSatisfied: ['backup_available'], constraintsFailed: [] },
};

const packetV2: AuthorisationPacket = {
  id: 'test-v2', version: 2, createdTs: '2025-10-10T10:06:00Z', status: 'ready',
  scope: { regions: ['sector_4', 'sector_3'], nodeIds: ['substation_A', 'pump_station_7', 'hospital_cumberland'] },
  situationSummary: 'Cascade confirmed', proposedAction: 'Isolate and release', regulatoryBasis: 'CCA 2004, FWMA 2010',
  playbookId: 'flood.yaml', evidenceRefs: ['ev_001', 'ev_002', 'ev_003'],
  uncertainty: { overall: 0.82, notes: ['High confidence'] },
  technicalVerification: { simulatedSuccessProb: 0.94, constraintsSatisfied: ['backup_available', 'gate_operational'], constraintsFailed: [] },
  multiSig: { required: 3, threshold: 2, currentSignatures: 0 },
};

describe('Packet Diff Engine', () => {
  it('detects status change', () => {
    const diff = diffPackets(packetV1, packetV2);
    expect(diff.changedFields).toContain('status');
    expect(diff.summary.some(s => s.includes('draft') && s.includes('ready'))).toBe(true);
  });

  it('detects confidence improvement', () => {
    const diff = diffPackets(packetV1, packetV2);
    expect(diff.riskDelta.direction).toBe('improved');
    expect(diff.riskDelta.confidenceAfter).toBeGreaterThan(diff.riskDelta.confidenceBefore);
  });

  it('detects scope expansion', () => {
    const diff = diffPackets(packetV1, packetV2);
    expect(diff.scopeDelta.nodesAdded).toContain('hospital_cumberland');
    expect(diff.scopeDelta.regionsAdded).toContain('sector_3');
  });

  it('detects new evidence', () => {
    const diff = diffPackets(packetV1, packetV2);
    expect(diff.evidenceDelta.added.length).toBe(2);
  });

  it('detects new constraints satisfied', () => {
    const diff = diffPackets(packetV1, packetV2);
    expect(diff.riskDelta.constraintsAdded).toContain('gate_operational');
  });

  it('produces human-readable summary', () => {
    const diff = diffPackets(packetV1, packetV2);
    expect(diff.summary.length).toBeGreaterThan(0);
  });

  it('handles identical packets', () => {
    const diff = diffPackets(packetV1, packetV1);
    expect(diff.changedFields).toHaveLength(0);
    expect(diff.riskDelta.direction).toBe('unchanged');
  });
});
