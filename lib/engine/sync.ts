/**
 * Sync utilities to import data from Python engine output files into database
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
import { nodesRepo, edgesRepo, evidenceWindowsRepo, incidentsRepo, packetsRepo } from '../db/repositories';
import type { Node, Edge, EvidenceWindow, Incident, HandshakePacket } from '../db/schema';
import type { GraphData, EvidenceData, IncidentsData, HandshakePacket as HandshakePacketType } from '../types';

/**
 * Sync graph data from JSON file to database
 */
export async function syncGraphToDb(): Promise<void> {
  try {
    const filePath = join(process.cwd(), 'engine', 'out', 'graph.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const graph: GraphData = JSON.parse(fileContents);

    // Sync nodes
    for (const node of graph.nodes) {
      nodesRepo.upsert({
        id: node.id,
        sector: node.sector,
        label: node.label,
        kind: node.kind,
        region: node.region,
        lat: node.lat,
        lon: node.lon,
        healthScore: node.health.score,
        healthStatus: node.health.status,
        observabilityScore: node.observability?.score,
        observabilityDrivers: node.observability?.drivers ? JSON.stringify(node.observability.drivers) : undefined
      });
    }

    // Sync edges
    for (const edge of graph.edges) {
      edgesRepo.upsert({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        confidenceScore: edge.confidenceScore,
        inferredLagSeconds: edge.inferredLagSeconds,
        condition: edge.condition,
        evidenceRefs: edge.evidenceRefs ? JSON.stringify(edge.evidenceRefs) : undefined,
        isShadowLink: edge.isShadowLink,
        stabilityScore: edge.stabilityScore,
        evidenceWindowCount: edge.evidenceWindowCount,
        confounderNotes: edge.confounderNotes ? JSON.stringify(edge.confounderNotes) : undefined
      });
    }
  } catch (error) {
    console.error('Error syncing graph to database:', error);
    throw error;
  }
}

/**
 * Sync evidence data from JSON file to database
 */
export async function syncEvidenceToDb(): Promise<void> {
  try {
    const filePath = join(process.cwd(), 'engine', 'out', 'evidence.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const evidence: EvidenceData = JSON.parse(fileContents);

    // Clear existing evidence windows for edges (optional - you might want to keep historical)
    // For now, we'll just insert new ones

    const windows: Omit<EvidenceWindow, 'createdAt'>[] = evidence.windows.map(win => ({
      id: win.id,
      edgeId: win.edgeId,
      startTs: new Date(win.startTs),
      endTs: new Date(win.endTs),
      correlation: win.correlation,
      lagSeconds: win.lagSeconds,
      robustness: win.robustness,
      notes: win.notes,
      missingness: win.qualityContext?.missingness,
      noiseScore: win.qualityContext?.noiseScore,
      driftScore: win.qualityContext?.driftScore,
      supportType: win.supportType
    }));

    evidenceWindowsRepo.insertBatch(windows);
  } catch (error) {
    console.error('Error syncing evidence to database:', error);
    throw error;
  }
}

/**
 * Sync incidents data from JSON file to database
 */
export async function syncIncidentsToDb(): Promise<void> {
  try {
    const filePath = join(process.cwd(), 'engine', 'out', 'incidents.json');
    const fileContents = await readFile(filePath, 'utf-8');
    const incidents: IncidentsData = JSON.parse(fileContents);

    for (const incident of incidents.incidents) {
      incidentsRepo.upsert({
        id: incident.id,
        title: incident.title,
        type: incident.type,
        startTs: new Date(incident.startTs),
        timeline: JSON.stringify(incident.timeline),
        scenarioControls: incident.scenarioControls ? JSON.stringify(incident.scenarioControls) : undefined
      });
    }
  } catch (error) {
    console.error('Error syncing incidents to database:', error);
    throw error;
  }
}

/**
 * Sync packets from directory to database
 */
export async function syncPacketsToDb(): Promise<void> {
  try {
    const { readdir, readFile } = await import('fs/promises');
    const packetsDir = join(process.cwd(), 'engine', 'out', 'packets');
    
    try {
      const files = await readdir(packetsDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = join(packetsDir, file);
        const contents = await readFile(filePath, 'utf-8');
        const packet: HandshakePacketType = JSON.parse(contents);

        const packetData: any = {
          id: packet.id,
          version: packet.version,
          createdTs: new Date(packet.createdTs),
          status: packet.status,
          scope: JSON.stringify(packet.scope),
          situationSummary: packet.situationSummary,
          proposedAction: packet.proposedAction,
          regulatoryBasis: packet.regulatoryBasis,
          playbookId: packet.playbookId,
          evidenceRefs: JSON.stringify(packet.evidenceRefs),
          uncertainty: JSON.stringify(packet.uncertainty),
          approvals: JSON.stringify(packet.approvals),
          provenance: JSON.stringify(packet.provenance),
          technicalVerification: packet.technicalVerification ? JSON.stringify(packet.technicalVerification) : undefined,
          actuatorBoundary: packet.actuatorBoundary ? JSON.stringify(packet.actuatorBoundary) : undefined,
          audit: packet.audit ? JSON.stringify(packet.audit) : undefined
        };
        
        // Add Merkle and multi-sig fields if present
        if ((packet as any).merkle) {
          packetData.merkle = (packet as any).merkle;
        }
        if ((packet as any).multiSig) {
          packetData.multiSig = (packet as any).multiSig;
        }
        
        packetsRepo.upsert(packetData);
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist yet, that's okay
    }
  } catch (error) {
    console.error('Error syncing packets to database:', error);
    throw error;
  }
}

/**
 * Sync all engine outputs to database
 */
export async function syncAllEngineOutputs(): Promise<void> {
  await syncGraphToDb();
  await syncEvidenceToDb();
  await syncIncidentsToDb();
  await syncPacketsToDb();
}

