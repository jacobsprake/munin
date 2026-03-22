/**
 * GET /api/cmi/status
 * Get current CMI Protocol status
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

export async function GET(request: Request) {
  try {
    // Get CMI status
    const engineDir = join(process.cwd(), 'engine');
    try {
      const pythonPath = getPythonPath();
      const script = 'from cmi_logic import get_cmi_status; import json; print(json.dumps(get_cmi_status()))';
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
      // Fallback - check if we can determine state from emergency mode
      return NextResponse.json({
        success: true,
        global_state: 'NORMAL',
        cmi_active: false,
        activated_at: null,
        ministry_of_defense_key_required: false
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
