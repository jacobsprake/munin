export type Sector = "power" | "water" | "telecom" | "wastewater" | "other";
export type NodeKind = "substation" | "pump" | "tower" | "reservoir" | "plant" | "service";
export type HealthStatus = "ok" | "degraded" | "warning";
export type IncidentType = "flood" | "drought" | "power_instability" | "unknown";
export type PacketStatus = "draft" | "ready" | "authorized" | "executed" | "verified" | "closed";

export interface Node {
  id: string;
  sector: Sector;
  label: string;
  kind: NodeKind;
  region: string;
  lat?: number;
  lon?: number;
  health: {
    score: number;
    status: HealthStatus;
  };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  confidenceScore: number;
  inferredLagSeconds: number;
  condition?: string;
  evidenceRefs: string[];
}

export interface EvidenceWindow {
  id: string;
  edgeId: string;
  startTs: string;
  endTs: string;
  correlation: number;
  lagSeconds: number;
  robustness: number;
  notes?: string;
}

export interface Incident {
  id: string;
  title: string;
  type: IncidentType;
  startTs: string;
  timeline: Array<{
    ts: string;
    impactedNodeIds: string[];
    confidence: number;
  }>;
}

export interface HandshakePacket {
  id: string;
  version: number;
  createdTs: string;
  status: PacketStatus;
  scope: {
    regions: string[];
    nodeIds: string[];
    services?: string[];
  };
  situationSummary: string;
  proposedAction: string;
  regulatoryBasis: string;
  playbookId: string;
  evidenceRefs: string[];
  uncertainty: {
    overall: number;
    notes: string[];
  };
  approvals: Array<{
    role: string;
    signerId?: string;
    signedTs?: string;
    signatureHash?: string;
  }>;
  provenance: {
    modelVersion: string;
    configHash: string;
    dataHash: string;
  };
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface EvidenceData {
  windows: EvidenceWindow[];
}

export interface IncidentsData {
  incidents: Incident[];
}

