/**
 * Lib test: audit/decisions – decision workflow (createDecisionMessage, policy shape)
 */
import { createDecisionMessage } from '../decisions';
import type { Decision } from '../decisions';

describe('audit/decisions', () => {
  describe('createDecisionMessage', () => {
    it('produces deterministic JSON for same decision and action', () => {
      const decision: Decision = {
        decision_id: 'dec_1',
        incident_id: 'inc_1',
        playbook_id: 'pb_1',
        status: 'PENDING',
        policy_json: { threshold: 1, required: 1, signers: ['alice'] },
        created_at: new Date('2025-01-15T12:00:00.000Z'),
        previous_decision_hash: undefined,
      };
      const msg1 = createDecisionMessage(decision, 'FLOOD_GATE', { gate: 'A' });
      const msg2 = createDecisionMessage(decision, 'FLOOD_GATE', { gate: 'A' });
      expect(msg1).toBe(msg2);
    });

    it('includes decision_id, incident_id, action_type, scope, created_at', () => {
      const decision: Decision = {
        decision_id: 'dec_2',
        incident_id: 'inc_2',
        playbook_id: 'pb_2',
        status: 'PENDING',
        policy_json: { threshold: 1, required: 1, signers: ['bob'] },
        created_at: new Date('2025-01-15T12:00:00.000Z'),
      };
      const msg = createDecisionMessage(decision, 'COORDINATION', { sector: 'water' });
      const parsed = JSON.parse(msg);
      expect(parsed.decision_id).toBe('dec_2');
      expect(parsed.incident_id).toBe('inc_2');
      expect(parsed.action_type).toBe('COORDINATION');
      expect(parsed.scope).toEqual({ sector: 'water' });
      expect(parsed.created_at).toBe('2025-01-15T12:00:00.000Z');
    });

    it('uses stable key ordering (sorted keys)', () => {
      const decision: Decision = {
        decision_id: 'd',
        incident_id: 'i',
        playbook_id: 'p',
        status: 'PENDING',
        policy_json: { threshold: 1, required: 1, signers: [] },
        created_at: new Date(),
      };
      const msg = createDecisionMessage(decision, 'ACTION', { z: 1, a: 2 });
      const parsed = JSON.parse(msg);
      expect(Object.keys(parsed.scope)).toEqual(['a', 'z']);
    });
  });
});
