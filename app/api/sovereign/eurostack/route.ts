import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { getPythonPath } from '@/lib/serverUtils';

const execFileAsync = promisify(execFile);

function sanitizeInput(input: string): string {
  if (/[;&|`$(){}[\]<>!#"'\\]/.test(input)) {
    throw new Error('Invalid input');
  }
  return input;
}

/**
 * GET /api/sovereign/eurostack
 *
 * Get EuroStack sovereignty audit report.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = sanitizeInput(searchParams.get('nodeId') || 'default_node');
    const action = searchParams.get('action') || 'report';

    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();

    if (action === 'report') {
      const script = `
import sys
from pathlib import Path
sys.path.insert(0, str(Path(r'${engineDir}').absolute()))
from eurostack_sovereign import create_eurostack_sovereign_node, DependencyType, DependencyOrigin
import json

node = create_eurostack_sovereign_node(
    node_id='${nodeId}',
    jurisdiction='EU',
    location={'country': 'Germany', 'region': 'Bavaria'},
    compliance_frameworks=['EU_Cloud_Act', 'GDPR', 'AI_Act']
)

audit = node.run_sovereignty_audit('system')
report = node.get_sovereignty_report()

print(json.dumps(report))
`;

      const { stdout } = await execFileAsync(
        pythonPath, ['-c', script],
        { cwd: engineDir, timeout: 10000 }
      );
      const report = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        report,
      });
    } else if (action === 'audit') {
      const script = `
import sys
from pathlib import Path
sys.path.insert(0, str(Path(r'${engineDir}').absolute()))
from eurostack_sovereign import create_eurostack_sovereign_node
import json

node = create_eurostack_sovereign_node(
    node_id='${nodeId}',
    jurisdiction='EU',
    location={'country': 'Germany'},
    compliance_frameworks=['EU_Cloud_Act', 'GDPR']
)

audit = node.run_sovereignty_audit('api_auditor')
print(json.dumps({
    'auditId': audit.audit_id,
    'sovereigntyLevel': audit.sovereignty_level.value,
    'totalDependencies': audit.total_dependencies,
    'foreignDependencies': audit.foreign_dependencies,
    'criticalForeignDependencies': audit.critical_foreign_dependencies,
    'certificationStatus': audit.certification_status,
    'timestamp': audit.audit_timestamp
}))
`;

      const { stdout } = await execFileAsync(
        pythonPath, ['-c', script],
        { cwd: engineDir, timeout: 10000 }
      );
      const audit = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        audit,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('EuroStack audit error:', error);
    return NextResponse.json(
      { error: 'EuroStack audit failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sovereign/eurostack
 *
 * Add dependency or run custom audit.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, nodeId, dependency } = body;

    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();

    if (action === 'add_dependency' && dependency) {
      // Sanitize all user inputs
      const safeNodeId = sanitizeInput(nodeId || 'default_node');
      const safeName = sanitizeInput(dependency.name);
      const safeVersion = sanitizeInput(dependency.version);
      const safeType = sanitizeInput(dependency.type || 'SOFTWARE_LIBRARY');
      const safeOrigin = sanitizeInput(dependency.origin || 'UNKNOWN');
      const safeLicense = sanitizeInput(dependency.license || 'unknown');
      const safeJurisdiction = sanitizeInput(dependency.jurisdiction || 'UNKNOWN');

      const script = `
import sys
from pathlib import Path
sys.path.insert(0, str(Path(r'${engineDir}').absolute()))
from eurostack_sovereign import create_eurostack_sovereign_node, DependencyType, DependencyOrigin
import json

node = create_eurostack_sovereign_node(
    node_id='${safeNodeId}',
    jurisdiction='EU',
    location={'country': 'Germany'},
    compliance_frameworks=['EU_Cloud_Act']
)

dep = node.add_dependency(
    name='${safeName}',
    version='${safeVersion}',
    dependency_type=DependencyType.${safeType},
    origin=DependencyOrigin.${safeOrigin},
    license='${safeLicense}',
    is_proprietary=${dependency.isProprietary || false},
    jurisdiction='${safeJurisdiction}',
    cloud_act_risk=${dependency.cloudActRisk || false}
)

print(json.dumps({
    'name': dep.name,
    'version': dep.version,
    'origin': dep.origin.value,
    'jurisdiction': dep.jurisdiction
}))
`;

      const { stdout } = await execFileAsync(
        pythonPath, ['-c', script],
        { cwd: engineDir, timeout: 10000 }
      );
      const result = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        dependency: result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('EuroStack operation error:', error);
    return NextResponse.json(
      { error: 'EuroStack operation failed' },
      { status: 500 }
    );
  }
}
