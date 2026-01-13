-- Migration: 002_decisions.sql
-- Creates decisions table for handshake/approval workflow
-- Database: PostgreSQL

CREATE TABLE IF NOT EXISTS decisions (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id TEXT NOT NULL,
    playbook_id TEXT NOT NULL,
    step_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, AUTHORIZED, REJECTED, EXECUTED
    policy_json JSONB NOT NULL, -- {threshold: 1, required: 1, signers: [...]}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    authorized_at TIMESTAMPTZ,
    previous_decision_hash TEXT -- Links to previous decision in chain
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decisions_incident ON decisions(incident_id);
CREATE INDEX IF NOT EXISTS idx_decisions_playbook ON decisions(playbook_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON decisions(created_at);

COMMENT ON TABLE decisions IS 'Decision records for handshake/approval workflow';
COMMENT ON COLUMN decisions.policy_json IS 'JSON policy: {threshold: M, required: N, signers: [...]}';
COMMENT ON COLUMN decisions.previous_decision_hash IS 'Hash of previous decision (for decision chaining)';
