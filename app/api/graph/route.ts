import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { nodesRepo, edgesRepo } from '@/lib/db/repositories';
import { syncGraphToDb } from '@/lib/engine/sync';

export async function GET() {
  try {
    // Try to get from database first
    const dbNodes = nodesRepo.getAll();
    const dbEdges = edgesRepo.getAll();

    if (dbNodes.length > 0 && dbEdges.length > 0) {
      // Transform to API format
      const nodes = dbNodes.map(node => ({
        id: node.id,
        sector: node.sector,
        label: node.label,
        kind: node.kind,
        region: node.region,
        lat: node.lat,
        lon: node.lon,
        health: {
          score: node.healthScore,
          status: node.healthStatus
        },
        observability: node.observabilityScore !== null ? {
          score: node.observabilityScore,
          drivers: node.observabilityDrivers ? JSON.parse(node.observabilityDrivers) : []
        } : undefined
      }));

      const edges = dbEdges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        confidenceScore: edge.confidenceScore,
        inferredLagSeconds: edge.inferredLagSeconds,
        condition: edge.condition,
        evidenceRefs: edge.evidenceRefs ? JSON.parse(edge.evidenceRefs) : [],
        isShadowLink: edge.isShadowLink,
        stabilityScore: edge.stabilityScore,
        evidenceWindowCount: edge.evidenceWindowCount,
        confounderNotes: edge.confounderNotes ? JSON.parse(edge.confounderNotes) : []
      }));

      return NextResponse.json({ nodes, edges });
    }

    // Fallback to file-based approach
    const filePath = join(process.cwd(), 'engine', 'out', 'graph.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContents);
    
    // Sync to database for next time
    try {
      await syncGraphToDb();
    } catch (syncError) {
      console.warn('Failed to sync graph to database:', syncError);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading graph.json:', error);
    return NextResponse.json({ nodes: [], edges: [] }, { status: 200 });
  }
}

