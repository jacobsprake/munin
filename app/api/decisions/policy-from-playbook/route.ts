/**
 * GET /api/decisions/policy-from-playbook?playbook_id=...
 * Derive M-of-N policy from playbook approval_required for ministry wedge.
 */
import { NextResponse } from 'next/server';
import { resolveMinistryCodesFromApproval } from '@/lib/ministry/roleMapping';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playbookId = searchParams.get('playbook_id');
    if (!playbookId) {
      return NextResponse.json(
        { error: 'Missing playbook_id' },
        { status: 400 }
      );
    }

    const playbookPath = join(process.cwd(), 'playbooks', playbookId.endsWith('.yaml') ? playbookId : `${playbookId}.yaml`);
    if (!existsSync(playbookPath)) {
      return NextResponse.json(
        { error: `Playbook not found: ${playbookId}` },
        { status: 404 }
      );
    }

    const content = readFileSync(playbookPath, 'utf-8');
    const yamlDoc = yaml.load(content) as Record<string, unknown>;
    const approvalRequired = (yamlDoc?.approval_required || []) as Array<{ role?: string; authority?: string }>;

    const ministryCodes = resolveMinistryCodesFromApproval(approvalRequired);

    // Wedge default: 2-of-3 for flood playbooks if we have EA, NGESO, MOD
    const wedgeCodes = ['EA', 'NGESO', 'MOD'];
    const signers = ministryCodes.length > 0 ? ministryCodes : wedgeCodes;
    const threshold = Math.min(2, signers.length);
    const required = signers.length;

    return NextResponse.json({
      success: true,
      policy: {
        threshold,
        required,
        signers,
        source: 'playbook',
        approval_required: approvalRequired,
      },
    });
  } catch (error: any) {
    console.error('Error deriving policy from playbook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to derive policy' },
      { status: 500 }
    );
  }
}
