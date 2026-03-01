/**
 * Authoritative Handshake State Machine
 *
 * Implements the packet lifecycle as a deterministic state machine.
 * Every transition is logged, creating an auditable trail of how
 * a packet moves from detection to execution.
 *
 * States:
 *   INIT → AWAITING_MINISTRY_SIGS → TEE_ATTEST → SIGNED → READY_TO_EXECUTE → CLOSED
 *
 * Transitions are triggered by events from ministries, TEE, and operators.
 */

export type HandshakeState =
  | 'INIT'
  | 'AWAITING_MINISTRY_SIGS'
  | 'TEE_ATTEST'
  | 'SIGNED'
  | 'READY_TO_EXECUTE'
  | 'EXECUTED'
  | 'CLOSED'
  | 'REJECTED';

export type HandshakeEvent =
  | { type: 'packet_created'; packetId: string; createdBy: string }
  | { type: 'submit_for_signing'; packetId: string }
  | { type: 'receive_ministry_signature'; ministry: string; signerId: string; signature: string }
  | { type: 'quorum_met'; signaturesReceived: number; threshold: number }
  | { type: 'tee_attested'; platform: string; enclaveId: string; quote: string }
  | { type: 'execution_confirmed'; executedBy: string; timestamp: string }
  | { type: 'rejected'; reason: string; rejectedBy: string }
  | { type: 'closed'; closedBy: string };

export interface HandshakeTransition {
  from: HandshakeState;
  event: HandshakeEvent;
  to: HandshakeState;
  timestamp: string;
  durationMs?: number;
}

export interface HandshakeContext {
  packetId: string;
  currentState: HandshakeState;
  transitions: HandshakeTransition[];
  signatures: Array<{ ministry: string; signerId: string; timestamp: string }>;
  requiredSignatures: number;
  threshold: number;
  startedAt: string;
  teeAttestation?: { platform: string; enclaveId: string; quote: string };
}

/**
 * Create a new handshake context for a packet.
 */
export function initHandshake(
  packetId: string,
  requiredSignatures: number,
  threshold: number,
  createdBy: string
): HandshakeContext {
  const now = new Date().toISOString();
  const ctx: HandshakeContext = {
    packetId,
    currentState: 'INIT',
    transitions: [],
    signatures: [],
    requiredSignatures,
    threshold,
    startedAt: now,
  };

  return applyEvent(ctx, {
    type: 'packet_created',
    packetId,
    createdBy,
  });
}

/**
 * Apply an event to the handshake state machine.
 * Returns the updated context (immutable pattern).
 */
export function applyEvent(ctx: HandshakeContext, event: HandshakeEvent): HandshakeContext {
  const now = new Date().toISOString();
  const from = ctx.currentState;
  let to: HandshakeState = from;

  // State transition logic
  switch (from) {
    case 'INIT':
      if (event.type === 'packet_created') to = 'INIT';
      if (event.type === 'submit_for_signing') to = 'AWAITING_MINISTRY_SIGS';
      break;

    case 'AWAITING_MINISTRY_SIGS':
      if (event.type === 'receive_ministry_signature') {
        ctx = {
          ...ctx,
          signatures: [...ctx.signatures, {
            ministry: event.ministry,
            signerId: event.signerId,
            timestamp: now,
          }],
        };
        to = 'AWAITING_MINISTRY_SIGS';
      }
      if (event.type === 'quorum_met') to = 'TEE_ATTEST';
      if (event.type === 'rejected') to = 'REJECTED';
      break;

    case 'TEE_ATTEST':
      if (event.type === 'tee_attested') {
        ctx = {
          ...ctx,
          teeAttestation: {
            platform: event.platform,
            enclaveId: event.enclaveId,
            quote: event.quote,
          },
        };
        to = 'SIGNED';
      }
      break;

    case 'SIGNED':
      to = 'READY_TO_EXECUTE';
      break;

    case 'READY_TO_EXECUTE':
      if (event.type === 'execution_confirmed') to = 'EXECUTED';
      if (event.type === 'rejected') to = 'REJECTED';
      break;

    case 'EXECUTED':
      if (event.type === 'closed') to = 'CLOSED';
      break;
  }

  const transition: HandshakeTransition = { from, event, to, timestamp: now };

  return {
    ...ctx,
    currentState: to,
    transitions: [...ctx.transitions, transition],
  };
}

/**
 * Check if the quorum threshold is met.
 */
export function isQuorumMet(ctx: HandshakeContext): boolean {
  return ctx.signatures.length >= ctx.threshold;
}

/**
 * Get a human-readable timeline of the handshake.
 */
export function getTimeline(ctx: HandshakeContext): string[] {
  return ctx.transitions.map(t => {
    const eventDesc = t.event.type.replace(/_/g, ' ');
    return `[${t.timestamp}] ${t.from} → ${t.to} (${eventDesc})`;
  });
}
