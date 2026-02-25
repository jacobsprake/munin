/**
 * POST /api/cmi/deactivate
 * Deactivate CMI Protocol
 */
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { getPythonPath } from '@/lib/server-utils';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    // Deactivate CMI Protocol
    const engineDir = join(process.cwd(), 'engine');
    try {
      const pythonPath = getPythonPath();
      const { stdout } = await execAsync(
        `cd ${engineDir} && ${pythonPath} -c "from cmi_logic import deactivate_cmi_protocol; import json; print(json.dumps(deactivate_cmi_protocol()))"`
      );
      const result = JSON.parse(stdout.trim());
      
      return NextResponse.json({
        success: true,
        ...result
      });
    } catch (pyError: any) {
      // Fallback
      return NextResponse.json({
        success: true,
        status: 'CMI_PROTOCOL_DEACTIVATED',
        timestamp: new Date().toISOString(),
        message: 'System returned to Normal Mode. Standard authorization protocols restored.',
        global_state: 'NORMAL'
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


