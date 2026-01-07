import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { packetsRepo } from '@/lib/db/repositories';
import { syncPacketsToDb } from '@/lib/engine/sync';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const packetId = searchParams.get('id');
    const status = searchParams.get('status');

    // Try to get from database first
    let dbPackets;
    if (packetId) {
      const packet = packetsRepo.getById(packetId);
      dbPackets = packet ? [packet] : [];
    } else {
      dbPackets = packetsRepo.getAll();
    }

    // Filter by status if provided
    if (status && dbPackets.length > 0) {
      dbPackets = dbPackets.filter(p => p.status === status);
    }

    if (dbPackets.length > 0) {
      const packets = dbPackets.map(p => ({
        id: p.id,
        version: p.version,
        createdTs: p.createdTs.toISOString(),
        status: p.status,
        scope: JSON.parse(p.scope),
        situationSummary: p.situationSummary,
        proposedAction: p.proposedAction,
        regulatoryBasis: p.regulatoryBasis,
        playbookId: p.playbookId,
        evidenceRefs: JSON.parse(p.evidenceRefs),
        uncertainty: JSON.parse(p.uncertainty),
        approvals: JSON.parse(p.approvals),
        provenance: JSON.parse(p.provenance),
        technicalVerification: p.technicalVerification ? JSON.parse(p.technicalVerification) : undefined,
        actuatorBoundary: p.actuatorBoundary ? JSON.parse(p.actuatorBoundary) : undefined,
        audit: p.audit ? JSON.parse(p.audit) : undefined
      }));

      return NextResponse.json(packets);
    }

    // Fallback to file-based approach
    try {
      const packetsDir = join(process.cwd(), 'engine', 'out', 'packets');
      const files = await readdir(packetsDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      const packets = [];
      for (const file of jsonFiles) {
        const filePath = join(packetsDir, file);
        const contents = await readFile(filePath, 'utf-8');
        packets.push(JSON.parse(contents));
      }
      packets.sort((a, b) => new Date(b.createdTs).getTime() - new Date(a.createdTs).getTime());
      
      // Sync to database for next time
      try {
        await syncPacketsToDb();
      } catch (syncError) {
        console.warn('Failed to sync packets to database:', syncError);
      }
      
      return NextResponse.json(packets);
    } catch (error: any) {
      // If directory doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return NextResponse.json([], { status: 200 });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error reading packets:', error);
    return NextResponse.json([], { status: 200 });
  }
}

