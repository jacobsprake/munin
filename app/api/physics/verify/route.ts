/**
 * Physics Verification API
 * Verify digital SCADA signals against physical reality
 * (acoustic vibration and RF fingerprinting).
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getPythonPath } from '@/lib/serverUtils';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { sensorId, digitalSignal, acousticSignal, rfSignal } = await request.json();
    
    if (!sensorId || !digitalSignal) {
      return NextResponse.json(
        { error: 'Missing required fields: sensorId, digitalSignal' },
        { status: 400 }
      );
    }
    
    // Call Python engine to verify signals
    const scriptPath = process.cwd() + '/engine/physics_ingest.py';
    const pythonPath = getPythonPath();
    const command = `${pythonPath} "${scriptPath}" verify "${sensorId}" "${JSON.stringify(digitalSignal)}" "${JSON.stringify(acousticSignal || {})}" "${JSON.stringify(rfSignal || {})}"`;
    
    try {
      const { stdout } = await execAsync(command);
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
      return NextResponse.json(
        { error: `Failed to verify: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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
      const command = `${pythonPath} "${scriptPath}" statistics`;
      
      try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        return NextResponse.json(result);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to get statistics: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


