/**
 * Database schema for Munin backend
 * Uses SQLite for development, can be migrated to PostgreSQL for production
 */

export interface SensorReading {
  id: string;
  nodeId: string;
  timestamp: Date;
  value: number;
  sourceFile?: string;
  createdAt: Date;
}

export interface Node {
  id: string;
  sector: string;
  label: string;
  kind: string;
  region: string;
  lat?: number;
  lon?: number;
  healthScore: number;
  healthStatus: string;
  observabilityScore?: number;
  observabilityDrivers?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  confidenceScore: number;
  inferredLagSeconds: number;
  condition?: string;
  evidenceRefs?: string;
  isShadowLink?: boolean;
  stabilityScore?: number;
  evidenceWindowCount?: number;
  confounderNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvidenceWindow {
  id: string;
  edgeId: string;
  startTs: Date;
  endTs: Date;
  correlation: number;
  lagSeconds: number;
  robustness: number;
  notes?: string;
  missingness?: number;
  noiseScore?: number;
  driftScore?: number;
  supportType?: string;
  createdAt: Date;
}

export interface Incident {
  id: string;
  title: string;
  type: string;
  startTs: Date;
  timeline: string; // JSON string
  scenarioControls?: string; // JSON string
  createdAt: Date;
  updatedAt: Date;
}

export interface HandshakePacket {
  id: string;
  version: number;
  createdTs: Date;
  status: string;
  scope: string; // JSON string
  situationSummary: string;
  proposedAction: string;
  regulatoryBasis: string;
  playbookId: string;
  evidenceRefs: string; // JSON string
  uncertainty: string; // JSON string
  approvals: string; // JSON string
  provenance: string; // JSON string
  technicalVerification?: string; // JSON string
  actuatorBoundary?: string; // JSON string
  audit?: string; // JSON string
  merklePreviousHash?: string; // Links to previous packet in chain
  merkleReceiptHash?: string; // Hash of this packet's receipt
  multiSigRequired?: number; // Total number of required signers
  multiSigThreshold?: number; // Minimum signatures needed (M-of-N)
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  ts: Date;
  packetId?: string;
  hash: string;
  metadata?: string; // JSON string
  createdAt: Date;
}

export interface EngineJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  outputPath?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  operatorId: string;
  role: string;
  passphraseHash: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

