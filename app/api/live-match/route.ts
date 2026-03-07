/**
 * GET /api/live-match
 * Returns the live-matched scenario from the engine pipeline (crisis-time lookup).
 * When the engine runs, it matches current telemetry to the nearest pre-simulated scenario.
 */
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'engine', 'out', 'live_matched_scenario.json');
    const contents = await readFile(filePath, 'utf-8');
    const data = JSON.parse(contents);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json(
        { matched_incident: null, live_state_keys: [], note: 'Run engine pipeline to generate live match' },
        { status: 200 }
      );
    }
    console.error('Error reading live_matched_scenario.json:', error);
    return NextResponse.json(
      { matched_incident: null, live_state_keys: [], error: 'Failed to load live match' },
      { status: 200 }
    );
  }
}
