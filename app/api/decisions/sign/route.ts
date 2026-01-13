/**
 * POST /api/decisions/sign
 * Sign a decision with Ed25519 signature
 */
import { NextResponse } from 'next/server';
import { signDecision, getDecision } from '@/lib/audit/decisions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      decision_id,
      signer_id,
      signature, // Ed25519 signature (base64 encoded)
      key_id,
      action_type,
      scope
    } = body;

    // Validate required fields
    if (!decision_id || !signer_id || !signature || !key_id || !action_type) {
      return NextResponse.json(
        { error: 'Missing required fields: decision_id, signer_id, signature, key_id, action_type' },
        { status: 400 }
      );
    }

    // Sign decision (async)
    const decisionSignature = await signDecision(
      decision_id,
      signer_id,
      signature,
      key_id,
      action_type,
      scope || {}
    );

    // Get updated decision status
    const decision = getDecision(decision_id);

    return NextResponse.json({
      success: true,
      signature: {
        id: decisionSignature.id,
        signer_id: decisionSignature.signer_id,
        signed_at: decisionSignature.signed_at,
        key_id: decisionSignature.key_id
      },
      decision: {
        decision_id: decision?.decision_id,
        status: decision?.status,
        signatures_received: decision?.signatures.length || 0,
        threshold: decision?.policy_json.threshold || 0,
        authorized: decision?.status === 'AUTHORIZED'
      }
    });

  } catch (error: any) {
    console.error('Error signing decision:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign decision' },
      { status: 500 }
    );
  }
}
