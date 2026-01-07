/**
 * POST /api/physical-verification
 * Verify digital SCADA readings against physical signals (RF, acoustic)
 * 
 * This endpoint implements "Return to Atoms" - verifying digital data
 * against physical reality to detect sensor tampering or SCADA compromise.
 */
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { assetId, assetType, digitalReading, physicalSignal } = await request.json();
    
    if (!assetId || !assetType || !digitalReading || !physicalSignal) {
      return NextResponse.json(
        { error: 'Missing required fields: assetId, assetType, digitalReading, physicalSignal' },
        { status: 400 }
      );
    }

    const engineDir = join(process.cwd(), 'engine');
    
    // Create temporary verification data file
    const verificationData = {
      asset_id: assetId,
      asset_type: assetType,
      digital_reading: digitalReading,
      physical_signal: physicalSignal
    };
    
    const dataPath = join(engineDir, 'out', 'temp_verification.json');
    const { writeFile, mkdir } = await import('fs/promises');
    await mkdir(join(engineDir, 'out'), { recursive: true });
    await writeFile(dataPath, JSON.stringify(verificationData, null, 2));
    
    // Run physical verification
    const pythonCmd = `python3 -c "
import sys
from pathlib import Path
sys.path.insert(0, '${engineDir}')
from physical_verification import PhysicalVerificationEngine, DigitalReading, PhysicalSignal, PhysicalSignalType
import json
from datetime import datetime

data = json.load(open('${dataPath}'))
engine = PhysicalVerificationEngine()

# Convert to proper types
digital = DigitalReading(
    timestamp=data['digital_reading']['timestamp'],
    parameter=data['digital_reading']['parameter'],
    value=data['digital_reading']['value'],
    unit=data['digital_reading']['unit'],
    source=data['digital_reading']['source'],
    sensor_id=data['digital_reading']['sensor_id']
)

physical = PhysicalSignal(
    signal_type=PhysicalSignalType[data['physical_signal']['signal_type']],
    timestamp=data['physical_signal']['timestamp'],
    frequency_hz=data['physical_signal']['frequency_hz'],
    amplitude=data['physical_signal']['amplitude'],
    harmonics=data['physical_signal']['harmonics'],
    noise_level=data['physical_signal']['noise_level'],
    sensor_id=data['physical_signal']['sensor_id'],
    location=data['physical_signal']['location']
)

verification = engine.verify_digital_reading(
    asset_id=data['asset_id'],
    asset_type=data['asset_type'],
    digital_reading=digital,
    physical_signal=physical
)

result = {
    'asset_id': verification.asset_id,
    'verification_result': verification.verification_result.value,
    'confidence': verification.confidence,
    'discrepancy': verification.discrepancy,
    'reasoning': verification.reasoning,
    'timestamp': verification.timestamp
}

print(json.dumps(result))
"`;
    
    try {
      const { stdout, stderr } = await execAsync(pythonCmd, {
        cwd: engineDir
      });
      
      if (stderr && !stderr.includes('Warning')) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout.trim());
      
      return NextResponse.json({
        success: true,
        verification: result
      });
    } catch (execError: any) {
      console.error('Physical verification error:', execError);
      return NextResponse.json(
        { error: 'Failed to verify physical signal', details: execError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in physical verification endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

