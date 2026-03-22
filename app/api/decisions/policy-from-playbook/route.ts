/**
 * GET /api/decisions/policy-from-playbook?playbook_id=...
 * Derive M-of-N policy from playbook approval_required for ministry wedge.
 */
import { NextResponse } from 'next/server';
import { resolveMinistryCodesFromApproval } from '@/lib/ministry/roleMapping';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
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

    // Path traversal protection
    if (playbookId.includes('..') || playbookId.includes('/') || playbookId.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid playbook ID' },
        { status: 400 }
      );
    }

    const playbooksDir = join(process.cwd(), 'playbooks');
    const playbookPath = join(playbooksDir, playbookId.endsWith('.yaml') ? playbookId : `${playbookId}.yaml`);

    // Validate resolved path stays within playbooks directory
    const resolvedPath = resolve(playbookPath);
    const resolvedPlaybooksDir = resolve(playbooksDir);
    if (!resolvedPath.startsWith(resolvedPlaybooksDir + '/')) {
      return NextResponse.json(
        { error: 'Invalid playbook ID' },
        { status: 400 }
      );
    }

    if (!existsSync(playbookPath)) {
      return NextResponse.json(
        { error: 'Playbook not found' },
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
      { error: 'Failed to derive policy' },
      { status: 500 }
    );
  }
}
