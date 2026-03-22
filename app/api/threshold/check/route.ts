/**
 * GET /api/threshold/check
 * Run threshold monitor against normalized timeseries.
 * Returns breached thresholds and triggered playbooks.
 * Auto-creates alerts when thresholds are breached.
 */
import { NextResponse } from 'next/server';
import { join } from 'path';
import { getPythonPath } from '@/lib/serverUtils';
import { getDb } from '@/lib/db';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function sanitizeInput(input: string): string {
  if (/[;&|`$(){}[\]<>!#"'\\]/.test(input)) {
    throw new Error('Invalid input');
  }
  return input;
}

export async function GET() {
  try {
    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();
    const script = `
from threshold_monitor import run_threshold_check
import json
result = run_threshold_check()
print(json.dumps(result))
`;
    const { stdout } = await execFileAsync(
      pythonPath, ['-c', script],
      { cwd: engineDir, timeout: 10000, env: { ...process.env, PYTHONPATH: '.' } }
    );
    const result = JSON.parse(stdout.trim());
    // Auto-create alerts when thresholds breached
    if (result.breached && result.breached.length > 0) {
      try {
        const db = getDb();
        const insert = db.prepare(`
          INSERT INTO notifications (id, type, severity, title, message, resource_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const b of result.breached) {
          const id = crypto.randomUUID();
          insert.run(
            id,
            'threshold_breach',
            'high',
            `Threshold breached: ${b.node_id}`,
            `${b.node_id} value ${b.value} exceeded ${b.condition} ${b.threshold}`,
            b.playbook_id || null
          );
        }
      } catch (e) {
        console.warn('Failed to create breach alerts:', e);
      }
    }
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Threshold check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Threshold check failed',
        breached: [],
        triggered_playbooks: [],
      },
      { status: 500 }
    );
  }
}
