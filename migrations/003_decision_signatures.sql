-- Migration: 003_decision_signatures.sql
-- Creates decision_signatures table for tracking signers
-- Database: PostgreSQL

CREATE TABLE IF NOT EXISTS decision_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES decisions(decision_id) ON DELETE CASCADE,
    signer_id TEXT NOT NULL,
    signature TEXT NOT NULL, -- Ed25519 signature over decision message
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    key_id TEXT NOT NULL -- Key used for signing (supports rotation)
);

-- Unique constraint: one signature per signer per decision
CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_sigs_unique ON decision_signatures(decision_id, signer_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decision_sigs_decision ON decision_signatures(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_sigs_signer ON decision_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_decision_sigs_key ON decision_signatures(key_id);

COMMENT ON TABLE decision_signatures IS 'Ed25519 signatures on decisions';
COMMENT ON COLUMN decision_signatures.signature IS 'Ed25519 signature over canonical decision message';
COMMENT ON COLUMN decision_signatures.key_id IS 'Identifier for the signing key';
