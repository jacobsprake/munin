export type Sector = "power" | "water" | "telecom" | "wastewater" | "other";
export type NodeKind = "substation" | "pump" | "tower" | "reservoir" | "plant" | "service";
export type HealthStatus = "ok" | "degraded" | "warning";
export type IncidentType = "flood" | "drought" | "power_instability" | "unknown";
export type PacketStatus = "draft" | "ready" | "authorized" | "executed" | "verified" | "closed";
export type DeploymentMode = "on_prem_ot" | "sovereign_cloud" | "lab_demo";
export type ConnectivityState = "connected" | "degraded" | "disconnected";
export type SupportType = "support" | "counterexample";

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
  observability?: {
    score: number;
    drivers: string[];
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
  isShadowLink?: boolean;
  stabilityScore?: number;
  evidenceWindowCount?: number;
  confounderNotes?: string[];
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
  qualityContext?: {
    missingness: number;
    noiseScore: number;
    driftScore: number;
  };
  supportType?: SupportType;
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
    timeToImpact?: number;
    confidenceBand?: {
      lower: number;
      upper: number;
    };
  }>;
  scenarioControls?: {
    degradationMode?: string;
    connectivityMode?: string;
  };
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
  technicalVerification?: {
    simulatedSuccessProb: number;
    constraintsSatisfied: string[];
    constraintsFailed?: string[];
  };
  actuatorBoundary?: {
    writesToHardware: false;
    notes: string;
  };
  audit?: {
    lastAuditHash: string;
    previousAuditHash?: string;
  };
}

export interface SystemStatus {
  deploymentMode: DeploymentMode;
  connectivityState: ConnectivityState;
  localNodes: Array<{
    nodeId: string;
    region: string;
    lastSyncTs: string;
    health: HealthStatus;
  }>;
  dataIntegrity: {
    status: "ok" | "warning" | "degraded";
    lastUpdate: string;
    sensorWarnings: number;
  };
  modelVersion: string;
  auditStatus: {
    verified: boolean;
    lastAuditHash: string;
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

export interface Playbook {
  id: string;
  triggers: string[];
  recommendedActions: string[];
  constraints: string[];
  verificationSteps: string[];
  regulatoryBasisTemplate: Record<string, string>;
  requiredRoles: string[];
}

export interface LocalNode {
  nodeId: string;
  region: string;
  lastSyncTs: string;
  health: HealthStatus;
}

export interface ProtocolFrame {
  timestamp: string;
  hex: string;
  protocol: string;
  address: string;
  functionCode: string;
  payload: string;
  retries?: number;
}

export interface ExpansionStep {
  step: number;
  sector: Sector;
  dataSources: string[];
  inferenceCoverageTarget: number;
  expectedShadowLinkTypes: string[];
  regulatoryFrameworks: string[];
  approvalFlows: string[];
}

