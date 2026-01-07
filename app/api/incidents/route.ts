import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { incidentsRepo } from '@/lib/db/repositories';
import { syncIncidentsToDb } from '@/lib/engine/sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('id');
    const type = searchParams.get('type');

    // Try to get from database first
    let dbIncidents;
    if (incidentId) {
      const incident = incidentsRepo.getById(incidentId);
      dbIncidents = incident ? [incident] : [];
    } else {
      dbIncidents = incidentsRepo.getAll();
    }

    // Filter by type if provided
    if (type && dbIncidents.length > 0) {
      dbIncidents = dbIncidents.filter(inc => inc.type === type);
    }

    if (dbIncidents.length > 0) {
      const incidents = dbIncidents.map(inc => ({
        id: inc.id,
        title: inc.title,
        type: inc.type,
        startTs: inc.startTs.toISOString(),
        timeline: JSON.parse(inc.timeline),
        scenarioControls: inc.scenarioControls ? JSON.parse(inc.scenarioControls) : undefined
      }));

      return NextResponse.json({ incidents });
    }

    // Fallback to file-based approach
    const filePath = join(process.cwd(), 'engine', 'out', 'incidents.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContents);
    
    // Sync to database for next time
    try {
      await syncIncidentsToDb();
    } catch (syncError) {
      console.warn('Failed to sync incidents to database:', syncError);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading incidents.json:', error);
    return NextResponse.json({ incidents: [] }, { status: 200 });
  }
}

