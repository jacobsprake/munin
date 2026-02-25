import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getPythonPath } from '@/lib/serverUtils';

const execAsync = promisify(exec);

/**
 * POST /api/physical-verification
 * 
 * Verify digital SCADA reading against physical RF/acoustic signals.
 */
export async function POST(request: Request) {
  try {
    const { nodeId, scadaReading, rfFingerprint, acousticFingerprint } = await request.json();
    
    if (!nodeId || scadaReading === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: nodeId, scadaReading' },
        { status: 400 }
      );
    }
    
    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();
    
    // Create verification request
    const verificationRequest = {
      sensor_id: nodeId,
      digital_reading: {
        parameter: 'value',
        value: scadaReading,
        unit: 'unknown',
        timestamp: new Date().toISOString(),
        source: 'scada',
        sensor_id: nodeId
      },
      physical_signal_data: {
        signal_type: rfFingerprint ? 'RF_EMISSION' : 'ACOUSTIC',
        timestamp: new Date().toISOString(),
        frequency_hz: rfFingerprint?.frequency || acousticFingerprint?.frequency || 0,
        amplitude: rfFingerprint?.amplitude || acousticFingerprint?.amplitude || 0,
        harmonics: rfFingerprint?.harmonics || acousticFingerprint?.harmonics || [],
        noise_level: rfFingerprint?.noise_level || acousticFingerprint?.noise_level || 0,
        location: ''
      }
    };
    
    const requestPath = join(engineDir, 'out', 'physical_verification_request.json');
    await writeFile(requestPath, JSON.stringify(verificationRequest, null, 2), 'utf-8');
    
    // Run Python physical truth engine
    const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from physical_truth import get_unified_physical_truth_engine
import json

request = json.load(open('${requestPath}'))
engine = get_unified_physical_truth_engine()

result = engine.verify_digital_vs_physical(
    sensor_id=request['sensor_id'],
    digital_reading=request['digital_reading'],
    physical_signal_data=request['physical_signal_data']
)

print(json.dumps(result))
"`;
    
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout.trim());
    
    // Determine if hardware hack detected
    const isHack = !result.verified && 
                   (result.discrepancy_type === 'hardware_hack' || 
                    result.discrepancy_type === 'tampering_detected');
    
    return NextResponse.json({
      verified: result.verified,
      isHardwareHack: isHack,
      confidence: result.confidence,
      discrepancyType: result.discrepancy_type,
      reasoning: result.reasoning,
      verificationTimeMs: result.verification_time_ms || 0,
      digitalValue: scadaReading,
      physicalValue: verificationRequest.physical_signal_data.amplitude,
      discrepancy: Math.abs(scadaReading - verificationRequest.physical_signal_data.amplitude)
    });
  } catch (error: any) {
    console.error('Physical verification error:', error);
    return NextResponse.json(
      { error: 'Physical verification failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/physical-verification
 * 
 * Get physical verification statistics and discrepancies.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const action = searchParams.get('action') || 'statistics';
    
    if (action === 'statistics') {
      // Return statistics about physical vs digital discrepancies
      return NextResponse.json({
        totalVerifications: 0,
        verifiedCount: 0,
        mismatchCount: 0,
        hardwareHackDetections: 0,
        averageConfidence: 0.0,
        topDiscrepancies: []
      });
    }
    
    if (nodeId && action === 'fingerprint') {
      // Return fingerprint for specific node
      return NextResponse.json({
        nodeId,
        fingerprint: {
          expectedFrequencyHz: 60.0,
          expectedAmplitudeRange: [0.8, 1.2],
          expectedHarmonics: [60.0, 120.0, 180.0]
        }
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get physical verification data', details: error.message },
      { status: 500 }
    );
  }
}
