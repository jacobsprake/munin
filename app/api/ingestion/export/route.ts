/**
 * GET /api/ingestion/export
 * Export sensor_readings to CSV for engine ingestion.
 * Writes to engine/sample_data/live/readings.csv
 */
import { NextResponse } from 'next/server';
import { sensorReadingsRepo } from '@/lib/db/repositories';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '168', 10); // default 7 days

    const readings = sensorReadingsRepo.getRecentForExport(hours);
    if (readings.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        path: null,
        message: 'No sensor readings to export',
      });
    }

    const csvLines = ['timestamp,node_id,value'];
    for (const r of readings) {
      const ts = r.timestamp.toISOString().replace('T', ' ').slice(0, 19);
      csvLines.push(`${ts},${r.nodeId},${r.value}`);
    }
    const csv = csvLines.join('\n');

    const liveDir = join(process.cwd(), 'engine', 'sample_data', 'live');
    await mkdir(liveDir, { recursive: true });
    const outPath = join(liveDir, 'readings.csv');
    await writeFile(outPath, csv, 'utf-8');

    return NextResponse.json({
      success: true,
      count: readings.length,
      path: 'engine/sample_data/live/readings.csv',
      hoursBack: hours,
    });
  } catch (error: any) {
    console.error('Export failed:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
