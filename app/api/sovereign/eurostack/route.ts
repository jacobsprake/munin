import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { getPythonPath } from '@/lib/server-utils';

const execAsync = promisify(exec);

/**
 * GET /api/sovereign/eurostack
 * 
 * Get EuroStack sovereignty audit report.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId') || 'default_node';
    const action = searchParams.get('action') || 'report';

    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();

    if (action === 'report') {
      // Get sovereignty report
      const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from eurostack_sovereign import create_eurostack_sovereign_node, DependencyType, DependencyOrigin
import json

# Create or load node
node = create_eurostack_sovereign_node(
    node_id='${nodeId}',
    jurisdiction='EU',
    location={'country': 'Germany', 'region': 'Bavaria'},
    compliance_frameworks=['EU_Cloud_Act', 'GDPR', 'AI_Act']
)

# Run audit
audit = node.run_sovereignty_audit('system')
report = node.get_sovereignty_report()

print(json.dumps(report))
"`;

      const { stdout } = await execAsync(command);
      const report = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        report,
      });
    } else if (action === 'audit') {
      // Run new audit
      const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
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
"`;

      const { stdout } = await execAsync(command);
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
      { error: 'EuroStack audit failed', details: error.message },
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
      const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from eurostack_sovereign import create_eurostack_sovereign_node, DependencyType, DependencyOrigin
import json

node = create_eurostack_sovereign_node(
    node_id='${nodeId || 'default_node'}',
    jurisdiction='EU',
    location={'country': 'Germany'},
    compliance_frameworks=['EU_Cloud_Act']
)

dep = node.add_dependency(
    name='${dependency.name}',
    version='${dependency.version}',
    dependency_type=DependencyType.${dependency.type || 'SOFTWARE_LIBRARY'},
    origin=DependencyOrigin.${dependency.origin || 'UNKNOWN'},
    license='${dependency.license || 'unknown'}',
    is_proprietary=${dependency.isProprietary || false},
    jurisdiction='${dependency.jurisdiction || 'UNKNOWN'}',
    cloud_act_risk=${dependency.cloudActRisk || false}
)

print(json.dumps({
    'name': dep.name,
    'version': dep.version,
    'origin': dep.origin.value,
    'jurisdiction': dep.jurisdiction
}))
"`;

      const { stdout } = await execAsync(command);
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
      { error: 'EuroStack operation failed', details: error.message },
      { status: 500 }
    );
  }
}
