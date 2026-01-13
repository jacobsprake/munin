/**
 * POST /api/sensors/data
 * Ingest real-time sensor telemetry data
 */
import { NextResponse } from 'next/server';
import { sensorReadingsRepo } from '@/lib/db/repositories';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Support both single reading and batch
    const readings = Array.isArray(body) ? body : [body];
    
    // Validate and transform
    const validatedReadings = readings.map((r: any) => {
      if (!r.nodeId || !r.timestamp || typeof r.value !== 'number') {
        throw new Error('Invalid reading: missing nodeId, timestamp, or value');
      }
      return {
        nodeId: r.nodeId,
        timestamp: new Date(r.timestamp),
        value: r.value,
        sourceFile: r.sourceFile || null
      };
    });

    // Insert into database
    if (validatedReadings.length === 1) {
      sensorReadingsRepo.insert(validatedReadings[0]);
    } else {
      sensorReadingsRepo.insertBatch(validatedReadings);
    }

    return NextResponse.json({ 
      success: true, 
      count: validatedReadings.length 
    });
  } catch (error: any) {
    console.error('Error ingesting sensor data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to ingest sensor data' },
      { status: 400 }
    );
  }
}

/**
 * GET /api/sensors/data
 * Query sensor readings with filters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '1000');

    if (!nodeId) {
      return NextResponse.json(
        { error: 'nodeId parameter is required' },
        { status: 400 }
      );
    }

    const startDate = start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    const readings = sensorReadingsRepo.getByNodeAndTimeRange(nodeId, startDate, endDate);
    
    return NextResponse.json({
      readings: readings.slice(0, limit),
      count: readings.length
    });
  } catch (error: any) {
    console.error('Error querying sensor data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to query sensor data' },
      { status: 500 }
    );
  }
}


