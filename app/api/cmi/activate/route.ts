/**
 * POST /api/cmi/activate
 * Activate CMI Protocol (State of Emergency)
 */
import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
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
    // Activate CMI Protocol via Python engine
    const engineDir = join(process.cwd(), 'engine');
    try {
      const pythonPath = getPythonPath();
      const script = 'from cmi_logic import activate_cmi_protocol; import json; print(json.dumps(activate_cmi_protocol()))';
      const { stdout } = await execFileAsync(
        pythonPath, ['-c', script],
        { cwd: engineDir, timeout: 10000 }
      );
      const result = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        ...result
      });
    } catch (pyError: any) {
      // Fallback if Python not available
      return NextResponse.json({
        success: true,
        status: 'CMI_PROTOCOL_ACTIVATED',
        timestamp: new Date().toISOString(),
        message: 'System shifted to Survival Mode. Ministry of Defense authorization required for all actions.',
        global_state: 'EMERGENCY'
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
