import { initHandshake, applyEvent, isQuorumMet, getTimeline } from '../handshake_state_machine';

describe('Handshake State Machine', () => {
  it('initializes in INIT state', () => {
    const ctx = initHandshake('pkt-001', 3, 2, 'operator_01');
    expect(ctx.currentState).toBe('INIT');
    expect(ctx.packetId).toBe('pkt-001');
    expect(ctx.threshold).toBe(2);
  });

  it('transitions to AWAITING_MINISTRY_SIGS on submit', () => {
    let ctx = initHandshake('pkt-001', 3, 2, 'operator_01');
    ctx = applyEvent(ctx, { type: 'submit_for_signing', packetId: 'pkt-001' });
    expect(ctx.currentState).toBe('AWAITING_MINISTRY_SIGS');
  });

  it('collects ministry signatures', () => {
    let ctx = initHandshake('pkt-001', 3, 2, 'operator_01');
    ctx = applyEvent(ctx, { type: 'submit_for_signing', packetId: 'pkt-001' });
    ctx = applyEvent(ctx, { type: 'receive_ministry_signature', ministry: 'EA', signerId: 'ea_01', signature: 'sig1' });
    expect(ctx.signatures).toHaveLength(1);
    expect(isQuorumMet(ctx)).toBe(false);

    ctx = applyEvent(ctx, { type: 'receive_ministry_signature', ministry: 'NGESO', signerId: 'ng_01', signature: 'sig2' });
    expect(ctx.signatures).toHaveLength(2);
    expect(isQuorumMet(ctx)).toBe(true);
  });

  it('transitions through full lifecycle', () => {
    let ctx = initHandshake('pkt-001', 3, 2, 'operator_01');
    ctx = applyEvent(ctx, { type: 'submit_for_signing', packetId: 'pkt-001' });
    ctx = applyEvent(ctx, { type: 'receive_ministry_signature', ministry: 'EA', signerId: 'ea_01', signature: 'sig1' });
    ctx = applyEvent(ctx, { type: 'receive_ministry_signature', ministry: 'NGESO', signerId: 'ng_01', signature: 'sig2' });
    ctx = applyEvent(ctx, { type: 'quorum_met', signaturesReceived: 2, threshold: 2 });
    expect(ctx.currentState).toBe('TEE_ATTEST');

    ctx = applyEvent(ctx, { type: 'tee_attested', platform: 'INTEL_SGX', enclaveId: 'enc-001', quote: 'quote-001' });
    expect(ctx.currentState).toBe('SIGNED');
    expect(ctx.teeAttestation?.platform).toBe('INTEL_SGX');

    // SIGNED auto-transitions to READY_TO_EXECUTE on next event
    ctx = applyEvent(ctx, { type: 'execution_confirmed', executedBy: 'operator_01', timestamp: new Date().toISOString() });
    expect(ctx.currentState).toBe('READY_TO_EXECUTE');
  });

  it('supports rejection', () => {
    let ctx = initHandshake('pkt-001', 3, 2, 'operator_01');
    ctx = applyEvent(ctx, { type: 'submit_for_signing', packetId: 'pkt-001' });
    ctx = applyEvent(ctx, { type: 'rejected', reason: 'Insufficient evidence', rejectedBy: 'minister_01' });
    expect(ctx.currentState).toBe('REJECTED');
  });

  it('generates readable timeline', () => {
    let ctx = initHandshake('pkt-001', 3, 2, 'operator_01');
    ctx = applyEvent(ctx, { type: 'submit_for_signing', packetId: 'pkt-001' });
    const timeline = getTimeline(ctx);
    expect(timeline.length).toBe(2);
    expect(timeline[0]).toContain('INIT');
  });
});
