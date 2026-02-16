import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { getPythonPath } from '@/lib/utils';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('report') || 'status';

    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();

    if (reportType === 'optimization') {
      // Get optimization report
      const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from green_ai_orchestration import GreenAIOrchestrator, ResourceType, DataCenterLoad
import json

orchestrator = GreenAIOrchestrator()
# Register default resources
orchestrator.register_resource(ResourceType.POWER_GRID, 1000.0, 0.75, 0.90, None, 'MW')
orchestrator.register_resource(ResourceType.WATER_SUPPLY, 500.0, 0.75, 0.90, None, 'L/s')
orchestrator.register_resource(ResourceType.COOLING_CAPACITY, 5000.0, 0.80, 0.95, 50.0, 'kW')

report = orchestrator.get_optimization_report()
print(json.dumps(report))
"`;

      const { stdout } = await execAsync(command);
      const report = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        ...report,
      });
    }

    // Get nexus status
    const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from green_ai_orchestration import GreenAIOrchestrator, ResourceType
import json

orchestrator = GreenAIOrchestrator()
orchestrator.register_resource(ResourceType.POWER_GRID, 1000.0, 0.75, 0.90, None, 'MW')
orchestrator.register_resource(ResourceType.WATER_SUPPLY, 500.0, 0.75, 0.90, None, 'L/s')
orchestrator.register_resource(ResourceType.COOLING_CAPACITY, 5000.0, 0.80, 0.95, 50.0, 'kW')

status = orchestrator.get_nexus_status()
print(json.dumps(status))
"`;

    const { stdout } = await execAsync(command);
    const status = JSON.parse(stdout.trim());

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('Green AI status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get Green AI status', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();

    if (action === 'optimize') {
      // Run optimization
      const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from green_ai_orchestration import GreenAIOrchestrator, ResourceType, DataCenterLoad
import json

orchestrator = GreenAIOrchestrator()
orchestrator.register_resource(ResourceType.POWER_GRID, 1000.0, 0.75, 0.90, None, 'MW')
orchestrator.register_resource(ResourceType.WATER_SUPPLY, 500.0, 0.75, 0.90, None, 'L/s')

# Update usage if provided
if ${params.powerUsage || 0} > 0:
    orchestrator.update_resource_usage(ResourceType.POWER_GRID, ${params.powerUsage || 0})
if ${params.waterUsage || 0} > 0:
    orchestrator.update_resource_usage(ResourceType.WATER_SUPPLY, ${params.waterUsage || 0})

actions = orchestrator.optimize_ai_energy_water_nexus()
print(json.dumps([{
    'actionId': a.action_id,
    'actionType': a.action_type,
    'targetDataCenter': a.target_data_center,
    'powerReductionMW': a.power_reduction_mw,
    'waterReductionLPS': a.water_reduction_lps,
    'estimatedSavings': a.estimated_savings
} for a in actions]))
"`;

      const { stdout } = await execAsync(command);
      const actions = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        actionsGenerated: actions.length,
        actions,
        message: 'Optimization complete',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'register_resource') {
      const { resourceType, capacity, thresholdWarning, thresholdCritical, unit } = params;

      if (!resourceType || !capacity) {
        return NextResponse.json(
          { error: 'Missing required parameters: resourceType, capacity' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        resourceType,
        capacity,
        message: 'Resource registered',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'register_data_center') {
      const { dataCenterId, powerDemandMW, coolingDemandLPS, priority } = params;

      if (!dataCenterId || !powerDemandMW) {
        return NextResponse.json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        dataCenterId,
        message: 'Data center registered',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Green AI operation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}


