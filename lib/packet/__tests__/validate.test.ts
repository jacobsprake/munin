import { validatePacket, lintPacket } from '../validate';
import type { AuthorisationPacket } from '../types';

const validPacket: AuthorisationPacket = {
  id: 'test-packet-001',
  version: 1,
  createdTs: '2025-10-10T10:00:00Z',
  status: 'ready',
  scope: { regions: ['sector_4'], nodeIds: ['substation_A', 'pump_station_7'] },
  situationSummary: 'Substation A tripped, cascade detected',
  proposedAction: 'Isolate pump station',
  regulatoryBasis: 'CCA 2004 Section 2',
  playbookId: 'flood_event_pump_isolation.yaml',
  evidenceRefs: ['ev_001', 'ev_002'],
  uncertainty: { overall: 0.85, notes: ['High confidence'] },
};

describe('Packet Validation', () => {
  it('validates a correct packet', () => {
    const result = validatePacket(validPacket);
    expect(result.ok).toBe(true);
    expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('rejects missing situationSummary', () => {
    const result = validatePacket({ ...validPacket, situationSummary: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects missing regulatoryBasis', () => {
    const result = validatePacket({ ...validPacket, regulatoryBasis: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects uncertainty out of range', () => {
    const result = validatePacket({ ...validPacket, uncertainty: { overall: 1.5, notes: [] } });
    expect(result.ok).toBe(false);
  });

  it('warns on low confidence', () => {
    const result = validatePacket({ ...validPacket, uncertainty: { overall: 0.3, notes: ['Low'] } });
    expect(result.errors.some(e => e.severity === 'warning')).toBe(true);
  });

  it('rejects authorized packet without sufficient signatures', () => {
    const result = validatePacket({
      ...validPacket,
      status: 'authorized',
      multiSig: { required: 3, threshold: 2, currentSignatures: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it('accepts authorized packet with sufficient signatures', () => {
    const result = validatePacket({
      ...validPacket,
      status: 'authorized',
      multiSig: { required: 3, threshold: 2, currentSignatures: 2 },
    });
    expect(result.ok).toBe(true);
  });

  it('lintPacket returns human-readable strings', () => {
    const lines = lintPacket({ ...validPacket, regulatoryBasis: '' });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain('regulatoryBasis');
  });
});
