/**
 * Authorisation Packet — Strongly Typed Model
 *
 * This is the core data structure that transforms Munin's inference
 * into a defensible, signable, auditable execution permission.
 */

export type PacketStatus = 'draft' | 'ready' | 'authorized' | 'executed' | 'verified' | 'closed';

export interface PacketScope {
  regions: string[];
  nodeIds: string[];
  services?: string[];
}

export interface UncertaintyBlock {
  overall: number;           // 0.0 (no confidence) to 1.0 (certain)
  notes: string[];           // Factors affecting confidence
  counterexampleCount?: number;
}

export interface TechnicalVerification {
  simulatedSuccessProb: number;
  constraintsSatisfied: string[];
  constraintsFailed?: string[];
}

export interface MultiSigBlock {
  required: number;          // N (total ministries)
  threshold: number;         // M (minimum signatures)
  currentSignatures: number;
  signers?: string[];
}

export interface PQCBlock {
  algorithm: 'ML-DSA';
  publicKey: string;
  signature?: string;
}

export interface TEEBlock {
  platform: 'INTEL_SGX' | 'ARM_TRUSTZONE' | 'AMD_SEV' | 'SOFTWARE_FALLBACK';
  enclaveId: string;
  quote: string;
  signature: string;
}

export interface MerkleBlock {
  previousHash?: string;
  receiptHash: string;
}

export interface AuthorisationPacket {
  id: string;
  version: number;
  createdTs: string;
  status: PacketStatus;
  scope: PacketScope;
  situationSummary: string;
  proposedAction: string;
  regulatoryBasis: string;
  playbookId: string;
  evidenceRefs: string[];
  uncertainty: UncertaintyBlock;
  technicalVerification?: TechnicalVerification;
  multiSig?: MultiSigBlock;
  pqc?: PQCBlock;
  tee?: TEEBlock;
  merkle?: MerkleBlock;
}
