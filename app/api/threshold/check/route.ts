/**
 * GET /api/threshold/check
 * Run threshold monitor against normalized timeseries.
 * Returns breached thresholds and triggered playbooks.
 */
import { NextResponse } from 'next/server';
import { join } from 'path';
import { getPythonPath } from '@/lib/serverUtils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();
    const { stdout } = await execAsync(
      `cd ${engineDir} && PYTHONPATH=. ${pythonPath} -c "
from threshold_monitor import run_threshold_check
import json
result = run_threshold_check()
print(json.dumps(result))
"`
    );
    const result = JSON.parse(stdout.trim());
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Threshold check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Threshold check failed',
        breached: [],
        triggered_playbooks: [],
      },
      { status: 500 }
    );
  }
}
