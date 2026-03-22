/**
 * Physics Verification API
 * Verify digital SCADA signals against physical reality
 * (acoustic vibration and RF fingerprinting).
 */

import { NextResponse } from 'next/server';
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
    const { sensorId, digitalSignal, acousticSignal, rfSignal } = await request.json();

    if (!sensorId || !digitalSignal) {
      return NextResponse.json(
        { error: 'Missing required fields: sensorId, digitalSignal' },
        { status: 400 }
      );
    }

    // Input validation: reject shell metacharacters in string fields
    if (typeof sensorId === 'string' && containsShellMetachars(sensorId)) {
      return NextResponse.json(
        { error: 'Invalid characters in sensorId' },
        { status: 400 }
      );
    }

    // Call Python engine to verify signals using execFile (no shell interpolation)
    const scriptPath = process.cwd() + '/engine/physics_ingest.py';
    const pythonPath = getPythonPath();

    try {
      const { stdout } = await execFileAsync(
        pythonPath,
        [
          scriptPath,
          'verify',
          sensorId,
          JSON.stringify(digitalSignal),
          JSON.stringify(acousticSignal || {}),
          JSON.stringify(rfSignal || {})
        ],
        { timeout: 10000 }
      );
      const result = JSON.parse(stdout);

      return NextResponse.json({
        isHackDetected: result.isHackDetected,
        confidence: result.confidence,
        hackType: result.hackType,
        verificationTimeMs: result.verificationTimeMs,
        digitalValue: result.digitalValue,
        physicalValue: result.physicalValue,
        signalsMatch: result.signalsMatch
      });
    } catch (error: any) {
      console.error('Physics verify error:', error.stderr || error.message);
      return NextResponse.json(
        { error: 'Failed to verify signals' },
        { status: 500 }
      );
    }
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
    const action = searchParams.get('action');

    if (action === 'statistics') {
      // Get verification statistics
      const scriptPath = process.cwd() + '/engine/physics_ingest.py';
      const pythonPath = getPythonPath();

      try {
        const { stdout } = await execFileAsync(
          pythonPath,
          [scriptPath, 'statistics'],
          { timeout: 10000 }
        );
        const result = JSON.parse(stdout);

        return NextResponse.json(result);
      } catch (error: any) {
        console.error('Physics statistics error:', error.stderr || error.message);
        return NextResponse.json(
          { error: 'Failed to get statistics' },
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
