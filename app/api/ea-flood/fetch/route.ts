/**
 * POST /api/ea-flood/fetch
 * Fetch Environment Agency flood monitoring data and ingest into Munin
 */
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      stationIds,
      startDate,
      endDate,
      nodeIds
    } = body;

    if (!stationIds || !Array.isArray(stationIds) || stationIds.length === 0) {
      return NextResponse.json(
        { error: 'stationIds array is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required (YYYY-MM-DD format)' },
        { status: 400 }
      );
    }

    // Run Python script to fetch EA data
    const engineDir = join(process.cwd(), 'engine');
    const scriptPath = join(engineDir, 'ea_flood_client.py');
    
    // For now, return instructions to use the Python script directly
    // In production, you'd want to call the Python client here
    return NextResponse.json({
      success: true,
      message: 'Use Python script directly: python engine/carlisle_demo.py',
      instructions: {
        fetchData: 'python engine/ea_flood_client.py',
        runDemo: 'python engine/carlisle_demo.py',
        apiEndpoint: 'https://environment.data.gov.uk/flood-monitoring'
      },
      stations: stationIds,
      dateRange: { startDate, endDate }
    });

  } catch (error: any) {
    console.error('Error fetching EA flood data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch EA flood data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ea-flood/fetch
 * Get information about available EA flood monitoring stations
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');

    if (stationId) {
      // Return station info
      return NextResponse.json({
        stationId,
        info: {
          apiUrl: `https://environment.data.gov.uk/flood-monitoring/id/stations/${stationId}.json`,
          measuresUrl: `https://environment.data.gov.uk/flood-monitoring/id/stations/${stationId}/measures.json`,
          readingsUrl: `https://environment.data.gov.uk/flood-monitoring/id/measures/{measureId}/readings.json`
        },
        carlisleStations: {
          eden_sands_centre: {
            stationId: '762600',
            label: 'River Eden at Sands Centre, Carlisle'
          },
          petteril_botcherby: {
            stationId: '764070',
            label: 'River Petteril at Botcherby Bridge, Carlisle'
          }
        }
      });
    }

    // Return general info
    return NextResponse.json({
      apiBase: 'https://environment.data.gov.uk/flood-monitoring',
      documentation: 'https://environment.data.gov.uk/flood-monitoring/doc/reference',
      carlisleDemo: {
        stations: ['762600', '764070'],
        stormDesmond: {
          startDate: '2015-12-05',
          endDate: '2015-12-07',
          description: 'Storm Desmond - Record flood levels in Carlisle'
        }
      },
      usage: {
        fetchData: 'python engine/carlisle_demo.py',
        configFile: 'engine/carlisle_config.py',
        playbook: 'playbooks/carlisle_flood_gate_coordination.yaml'
      }
    });

  } catch (error: any) {
    console.error('Error getting EA flood info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get EA flood info' },
      { status: 500 }
    );
  }
}
