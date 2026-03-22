import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getPythonPath } from '@/lib/serverUtils';

const execFileAsync = promisify(execFile);

function sanitizeInput(input: string): string {
  if (/[;&|`$(){}[\]<>!#"'\\]/.test(input)) {
    throw new Error('Invalid input');
  }
  return input;
}

export async function POST(request: Request) {
  try {
    const { intervention, targetNodes, timeHorizonMinutes = 60 } = await request.json();

    if (!intervention || !targetNodes || !Array.isArray(targetNodes)) {
      return NextResponse.json(
        { error: 'Missing required fields: intervention, targetNodes' },
        { status: 400 }
      );
    }

    const engineDir = join(process.cwd(), 'engine');
    const outDir = join(engineDir, 'out');

    // Create scenario file
    const scenario = {
      intervention,
      target_nodes: targetNodes,
      time_horizon_minutes: timeHorizonMinutes
    };

    const scenarioPath = join(outDir, 'counterfactual_scenario.json');
    await writeFile(scenarioPath, JSON.stringify(scenario, null, 2), 'utf-8');

    // Run Python counterfactual engine
    const graphPath = join(outDir, 'graph.json');
    const evidencePath = join(outDir, 'evidence.json');
    const dataPath = join(outDir, 'normalized_timeseries.csv');
    const outputPath = join(outDir, 'counterfactual_result.json');

    const pythonPath = getPythonPath();
    const script = `
import sys
from pathlib import Path
sys.path.insert(0, str(Path(r'${engineDir}').absolute()))
from counterfactual import run_counterfactual_simulation
import json

scenario = json.load(open(r'${scenarioPath}'))
run_counterfactual_simulation(
    Path(r'${graphPath}'),
    Path(r'${evidencePath}'),
    Path(r'${dataPath}'),
    scenario,
    Path(r'${outputPath}')
)
`;

    try {
      await execFileAsync(
        pythonPath, ['-c', script],
        { cwd: engineDir, timeout: 10000 }
      );
    } catch (error: any) {
      console.error('Counterfactual simulation error:', error);
      return NextResponse.json(
        { error: 'Simulation failed' },
        { status: 500 }
      );
    }

    // Read result
    const resultContent = await readFile(outputPath, 'utf-8');
    const result = JSON.parse(resultContent);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error running counterfactual simulation:', error);
    return NextResponse.json(
      { error: 'Failed to run simulation' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'Missing scenarioId parameter' },
        { status: 400 }
      );
    }

    // Sanitize scenarioId to prevent path traversal
    const safeScenarioId = sanitizeInput(scenarioId);

    const outputPath = join(
      process.cwd(),
      'engine',
      'out',
      `counterfactual_${safeScenarioId}.json`
    );

    try {
      const resultContent = await readFile(outputPath, 'utf-8');
      const result = JSON.parse(resultContent);
      return NextResponse.json({ success: true, result });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json(
          { error: 'Scenario not found' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching counterfactual result:', error);
    return NextResponse.json(
      { error: 'Failed to fetch result' },
      { status: 500 }
    );
  }
}
