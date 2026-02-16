/**
 * GET /api/decisions
 * List decisions with optional filters
 */
import { NextResponse } from 'next/server';
import { listDecisions, getDecision } from '@/lib/audit/decisions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const decisionId = searchParams.get('id');
    const status = searchParams.get('status') as 'PENDING' | 'AUTHORIZED' | 'REJECTED' | 'EXECUTED' | null;
    const incidentId = searchParams.get('incident_id');
    const playbookId = searchParams.get('playbook_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If specific decision ID requested, return single decision
    if (decisionId) {
      const decision = getDecision(decisionId);
      if (!decision) {
        return NextResponse.json(
          { error: 'Decision not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, decision });
    }

    // List decisions with filters
    const decisions = listDecisions({
      status: status || undefined,
      incident_id: incidentId || undefined,
      playbook_id: playbookId || undefined,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      decisions,
      count: decisions.length
    });

  } catch (error: any) {
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch decisions' },
      { status: 500 }
    );
  }
}
