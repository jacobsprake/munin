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
  zeroTrust?: {
    verified: boolean;
    verificationStatus: 'verified' | 'unverified' | 'expired' | 'revoked' | 'pending';
    lastVerified?: string;
    deviceIdentity?: string;
    certificateExpiry?: string;
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
  merkle?: {
    previousHash?: string; // Links to previous packet in chain
    receiptHash: string; // Hash of this packet's receipt (immutable proof)
  };
  multiSig?: {
    required: number; // Total number of required signers (N)
    threshold: number; // Minimum signatures needed (M-of-N)
    currentSignatures: number; // Current number of signatures
  };
  pqc?: {
    algorithm: 'KYBER-768' | 'DILITHIUM-3';
    publicKey: string;
    signature?: string;
    timestamp?: string;
  };
  tee?: {
    platform: 'INTEL_SGX' | 'ARM_TRUSTZONE' | 'AMD_SEV' | 'SOFTWARE_FALLBACK';
    enclaveId: string;
    quote: string;
    publicKey: string;
    timestamp: string;
    measurement: string;
    signature: string;
    packetHash: string;
    nonce: string;
  };
  statutoryCompliance?: StatutoryCompliance;
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

// Protocol Translator Types
export type ProtocolType = 'modbus' | 'dnp3' | 'profibus' | 'bacnet' | 'opc_ua' | 'iec61850';
export type VendorType = 'Siemens' | 'Schneider' | 'Honeywell' | 'Allen-Bradley' | 'ABB' | 'GE' | 'Johnson Controls' | 'Rockwell' | 'Phoenix Contact' | 'Endress+Hauser' | 'Schweitzer Engineering';

export interface ProtocolFrame {
  timestamp: string;
  hex: string;
  protocol: ProtocolType;
  address: string;
  functionCode: string;
  payload: string;
  retries?: number;
  vendor?: VendorType;
}

export interface ProtocolConnectorConfig {
  version: string;
  created: string;
  protocols: Array<{
    name: ProtocolType;
    enabled: boolean;
    pollingInterval: number;
    supportedVendors: VendorType[];
    dataTypes: string[];
  }>;
  nodeMappings: Record<string, string>;
  pollingIntervals: Record<ProtocolType, number>;
}

// Data Diode / Air-Gap Types
export type DataDiodeMode = 'hardware_diode' | 'software_enforced' | 'disabled';
export type DataFlowDirection = 'inbound_only' | 'outbound_only' | 'bidirectional';

export interface DataDiodeConfig {
  mode: DataDiodeMode;
  enabled: boolean;
  inboundAllowed: boolean;
  outboundBlocked: boolean;
}

export interface AirGapCertificate {
  version: string;
  issued: string;
  system: string;
  airGapStatus: 'air_gapped' | 'not_air_gapped';
  certifiedAirGapped: boolean;
  verificationTests: Array<{
    test: string;
    passed: boolean;
    details: string;
  }>;
  certificationStatement: string;
}

// Shadow Mode Types
export interface ShadowModeConfig {
  active: boolean;
  startDate: string;
  endDate: string;
  durationDays: number;
}

export interface HumanAction {
  timestamp: string;
  actionType: 'command' | 'coordination' | 'decision' | 'verification';
  description: string;
  targetNodes: string[];
  durationSeconds: number;
  outcome: 'success' | 'partial' | 'failure' | 'unknown';
  operatorId?: string;
  coordinationParties?: string[];
}

export interface MuninPrediction {
  timestamp: string;
  predictedAction: string;
  targetNodes: string[];
  predictedDurationSeconds: number;
  confidence: number;
  counterfactualProof: Record<string, any>;
  damagePrevented: Record<string, number>;
}

export interface ShadowComparison {
  incidentId: string;
  humanAction: HumanAction;
  muninPrediction: MuninPrediction;
  timeSavedSeconds: number;
  damagePreventedEstimate: number;
  improvementRatio: number;
}

export interface ShadowModeReport {
  version: string;
  generated: string;
  shadowModeStatus: string;
  shadowModePeriod: {
    start: string;
    end: string;
    durationDays: number;
  };
  summary: {
    totalIncidentsObserved: number;
    totalHumanActionsRecorded: number;
    totalMuninPredictionsGenerated: number;
    totalTimeSavedSeconds: number;
    totalTimeSavedHours: number;
    totalDamagePreventedEstimate: number;
    averageTimeSavedPerIncidentSeconds: number;
    averageImprovementRatio: number;
  };
  keyFindings: string[];
  topImprovements: Array<{
    incidentId: string;
    timeSavedSeconds: number;
    improvementRatio: number;
    damagePrevented: number;
    humanDuration: number;
    muninDuration: number;
  }>;
  conclusion: string;
  recommendation: string;
}

// Liability Shield Types
export interface StatutoryReference {
  actName: string;
  section: string;
  article?: string;
  subsection?: string;
  requirement: string;
  jurisdiction: string;
}

export interface ComplianceCertificate {
  certificateId: string;
  issued: string;
  actionId: string;
  playbookId: string;
  statutoryBasis: StatutoryReference[];
  complianceStatus: 'compliant' | 'partially_compliant' | 'non_compliant';
  legalProtectionLevel: 'full' | 'partial' | 'none';
  certificateStatement: string;
  authorizedBy?: string;
}

export interface StatutoryCompliance {
  certificateId: string;
  issued: string;
  complianceStatus: string;
  legalProtectionLevel: string;
  certificateStatement: string;
  statutoryBasis: Array<{
    actName: string;
    section: string;
    article?: string;
    requirement: string;
  }>;
}

