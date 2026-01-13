/**
 * POST /api/decisions/create
 * Create a new decision for handshake/approval workflow
 */
import { NextResponse } from 'next/server';
import { createDecision } from '@/lib/audit/decisions';
import { appendAuditLogEntry } from '@/lib/audit/auditLog';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      incident_id,
      playbook_id,
      step_id,
      policy, // {threshold: M, required: N, signers: [...]}
      previous_decision_hash
    } = body;

    // Validate required fields
    if (!incident_id || !playbook_id || !policy) {
      return NextResponse.json(
        { error: 'Missing required fields: incident_id, playbook_id, policy' },
        { status: 400 }
      );
    }

    if (!policy.threshold || !policy.required || !policy.signers) {
      return NextResponse.json(
        { error: 'Policy must include: threshold, required, signers' },
        { status: 400 }
      );
    }

    // Create decision
    const decision = createDecision(
      incident_id,
      playbook_id,
      step_id,
      policy,
      previous_decision_hash
    );

    return NextResponse.json({
      success: true,
      decision: {
        decision_id: decision.decision_id,
        incident_id: decision.incident_id,
        playbook_id: decision.playbook_id,
        status: decision.status,
        policy: decision.policy_json,
        created_at: decision.created_at
      }
    });

  } catch (error: any) {
    console.error('Error creating decision:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create decision' },
      { status: 500 }
    );
  }
}
