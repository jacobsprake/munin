import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { evidenceWindowsRepo } from '@/lib/db/repositories';
import { syncEvidenceToDb } from '@/lib/engine/sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const edgeId = searchParams.get('edgeId');

    // Try to get from database first
    let dbWindows;
    if (edgeId) {
      dbWindows = evidenceWindowsRepo.getByEdgeId(edgeId);
    } else {
      dbWindows = evidenceWindowsRepo.getAll();
    }

    if (dbWindows.length > 0) {
      const windows = dbWindows.map(win => ({
        id: win.id,
        edgeId: win.edgeId,
        startTs: win.startTs.toISOString(),
        endTs: win.endTs.toISOString(),
        correlation: win.correlation,
        lagSeconds: win.lagSeconds,
        robustness: win.robustness,
        notes: win.notes,
        qualityContext: win.missingness !== null || win.noiseScore !== null || win.driftScore !== null ? {
          missingness: win.missingness,
          noiseScore: win.noiseScore,
          driftScore: win.driftScore
        } : undefined,
        supportType: win.supportType
      }));

      return NextResponse.json({ windows });
    }

    // Fallback to file-based approach
    const filePath = join(process.cwd(), 'engine', 'out', 'evidence.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContents);
    
    // Sync to database for next time
    try {
      await syncEvidenceToDb();
    } catch (syncError) {
      console.warn('Failed to sync evidence to database:', syncError);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading evidence.json:', error);
    return NextResponse.json({ windows: [] }, { status: 200 });
  }
}

