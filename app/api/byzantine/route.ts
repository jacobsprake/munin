/**
 * Byzantine Multi-Sig API
 * Endpoints for managing decentralized multi-signature requirements
 * for high-consequence actions (treason-proofing).
 */

import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getPythonPath } from '@/lib/serverUtils';

const execFileAsync = promisify(execFile);

// Shell metacharacters that must not appear in user input
const SHELL_METACHAR_PATTERN = /[;&|`$(){}[\]!#~<>\\'"*?\n\r]/;

function containsShellMetachars(value: string): boolean {
  return SHELL_METACHAR_PATTERN.test(value);
}

export async function POST(request: Request) {
  try {
    const { action, packetId, ministry, signerId, publicKey, signature, location, ministrySeal } = await request.json();

    if (action === 'add_signature') {
      if (!packetId || !ministry || !signerId || !publicKey || !signature || !location || !ministrySeal) {
        return NextResponse.json(
          { error: 'Missing required fields for adding signature' },
          { status: 400 }
        );
      }

      // Input validation: reject shell metacharacters in all string fields
      const fields: Record<string, string> = { packetId, ministry, signerId, publicKey, signature, location, ministrySeal };
      for (const [field, value] of Object.entries(fields)) {
        if (typeof value === 'string' && containsShellMetachars(value)) {
          return NextResponse.json(
            { error: `Invalid characters in field: ${field}` },
            { status: 400 }
          );
        }
      }

      // Call Python engine using execFile (no shell interpolation)
      const scriptPath = join(process.cwd(), 'engine', 'byzantine_resilience.py');
      const pythonPath = getPythonPath();

      try {
        const { stdout, stderr } = await execFileAsync(
          pythonPath,
          [scriptPath, 'add_signature', packetId, ministry, signerId, publicKey, signature, location, ministrySeal],
          { timeout: 10000 }
        );
        const result = JSON.parse(stdout);

        return NextResponse.json({
          success: true,
          authorized: result.authorized,
          signaturesReceived: result.signaturesReceived,
          thresholdRequired: result.thresholdRequired,
          ministriesSigned: result.ministriesSigned,
          ministriesMissing: result.ministriesMissing
        });
      } catch (error: any) {
        console.error('Byzantine add_signature error:', error.stderr || error.message);
        return NextResponse.json(
          { error: 'Failed to add signature' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const packetId = searchParams.get('packetId');
    const action = searchParams.get('action');

    if (action === 'verify') {
      if (!packetId) {
        return NextResponse.json({ error: 'Missing packetId' }, { status: 400 });
      }

      // Input validation
      if (containsShellMetachars(packetId)) {
        return NextResponse.json(
          { error: 'Invalid characters in packetId' },
          { status: 400 }
        );
      }

      // Call Python engine using execFile (no shell interpolation)
      const scriptPath = join(process.cwd(), 'engine', 'byzantine_resilience.py');
      const pythonPath = getPythonPath();

      try {
        const { stdout } = await execFileAsync(
          pythonPath,
          [scriptPath, 'verify', packetId],
          { timeout: 10000 }
        );
        const result = JSON.parse(stdout);

        return NextResponse.json(result);
      } catch (error: any) {
        console.error('Byzantine verify error:', error.stderr || error.message);
        return NextResponse.json(
          { error: 'Failed to verify' },
          { status: 500 }
        );
      }
    }

    if (action === 'pending') {
      // Get all pending actions requiring signatures
      const scriptPath = join(process.cwd(), 'engine', 'byzantine_resilience.py');
      const pythonPath = getPythonPath();

      try {
        const { stdout } = await execFileAsync(
          pythonPath,
          [scriptPath, 'pending'],
          { timeout: 10000 }
        );
        const result = JSON.parse(stdout);

        return NextResponse.json(result);
      } catch (error: any) {
        console.error('Byzantine pending error:', error.stderr || error.message);
        return NextResponse.json(
          { error: 'Failed to get pending actions' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
