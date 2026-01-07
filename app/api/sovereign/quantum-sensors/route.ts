import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      // Get quantum sensor network status
      const sensorsPath = join(process.cwd(), 'engine', 'out', 'quantum_sensors.json');
      
      try {
        const sensorsData = await readFile(sensorsPath, 'utf-8');
        const sensors = JSON.parse(sensorsData);
        return NextResponse.json({
          status: 'ok',
          network: sensors.networkStatus || {},
          sensors: sensors.sensors || []
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json({
            status: 'not_initialized',
            message: 'Quantum sensor network not initialized'
          });
        }
        throw error;
      }
    }

    if (action === 'sensor' && searchParams.get('sensorId')) {
      // Get specific sensor status
      const sensorId = searchParams.get('sensorId');
      
      // In production, would fetch from database or sensor network
      return NextResponse.json({
        status: 'ok',
        sensor: {
          sensorId,
          status: 'active',
          pqcAlgorithm: 'KYBER-768',
          hardwarePQC: true
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get quantum sensor status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'collect_reading') {
      // Collect encrypted reading from sensor
      const { sensorId, value } = params;
      
      if (!sensorId || value === undefined) {
        return NextResponse.json(
          { error: 'Missing sensorId or value' },
          { status: 400 }
        );
      }

      // In production, this would collect from actual sensor with PQC encryption
      const encryptedReading = {
        id: `reading_${Date.now()}`,
        sensorId,
        encryptedData: `PQC-ENC-KYBER-768-${Date.now()}`,
        pqcAlgorithm: 'KYBER-768',
        publicKey: `PQCPUB-KYBER-768-${sensorId}`,
        timestamp: new Date().toISOString(),
        hardwarePQC: true
      };

      return NextResponse.json({
        status: 'ok',
        reading: encryptedReading
      });
    }

    if (action === 'initialize_network') {
      // Initialize quantum sensor network from graph
      const scriptPath = join(process.cwd(), 'engine', 'quantum_sensors.py');
      
      // Run Python script to create sensor network
      const { stdout, stderr } = await execAsync(
        `python3 "${scriptPath}"`,
        { cwd: process.cwd() }
      );

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Quantum sensor network initialized',
        output: stdout
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process quantum sensor request' },
      { status: 500 }
    );
  }
}

