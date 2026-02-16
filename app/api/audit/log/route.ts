/**
 * GET /api/audit/log
 * Fetch immutable audit log entries
 */
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getPythonPath } from '@/lib/utils';

interface AuditLogEntry {
  timestamp: string;
  action: string;
  actor: string;
  packet_id: string;
  previous_hash?: string;
  entry_hash: string;
  receipt_hash: string;
  metadata: Record<string, any>;
  sequence_number: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const packetId = searchParams.get('packetId');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Find audit log file
    const auditPath = join(process.cwd(), 'engine', 'out', 'audit.jsonl');
    
    // Try carlisle demo audit log
    const carlisleAuditPath = join(process.cwd(), 'engine', 'out', 'carlisle_demo', 'audit.jsonl');
    
    let logPath = auditPath;
    if (!existsSync(auditPath) && existsSync(carlisleAuditPath)) {
      logPath = carlisleAuditPath;
    }

    if (!existsSync(logPath)) {
      return NextResponse.json({
        entries: [],
        count: 0,
        message: 'Audit log not found'
      });
    }

    // Read audit log file
    const content = await readFile(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    // Parse entries
    let entries: AuditLogEntry[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AuditLogEntry;
        entries.push(entry);
      } catch (e) {
        console.warn('Failed to parse audit log entry:', e);
      }
    }

    // Filter by packet ID if provided
    if (packetId) {
      entries = entries.filter(e => e.packet_id === packetId);
    }

    // Filter by action if provided
    if (action) {
      entries = entries.filter(e => e.action === action);
    }

    // Sort by sequence number (most recent first)
    entries.sort((a, b) => b.sequence_number - a.sequence_number);

    // Apply limit
    entries = entries.slice(0, limit);

    return NextResponse.json({
      entries,
      count: entries.length,
      total: lines.length
    });

  } catch (error: any) {
    console.error('Error reading audit log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read audit log' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit/log/verify
 * Verify audit log chain integrity
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'verify') {
      // Find audit log file
      const auditPath = join(process.cwd(), 'engine', 'out', 'audit.jsonl');
      const carlisleAuditPath = join(process.cwd(), 'engine', 'out', 'carlisle_demo', 'audit.jsonl');
      
      let logPath = auditPath;
      if (!existsSync(auditPath) && existsSync(carlisleAuditPath)) {
        logPath = carlisleAuditPath;
      }

      if (!existsSync(logPath)) {
        return NextResponse.json({
          valid: false,
          message: 'Audit log not found'
        });
      }

      // Run Python verification script
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const engineDir = join(process.cwd(), 'engine');
      const pythonPath = getPythonPath();
      const cmd = `cd ${engineDir} && ${pythonPath} -c "
from audit_log import get_audit_log
from pathlib import Path
import json

log_path = Path('${logPath}')
log_dir = log_path.parent
audit_log = get_audit_log(log_dir)
result = audit_log.verify_chain()
print(json.dumps(result))
"`;

      const { stdout } = await execAsync(cmd);
      const result = JSON.parse(stdout.trim());

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error verifying audit log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify audit log' },
      { status: 500 }
    );
  }
}
