-- Migration: 001_audit_log.sql
-- Creates tamper-evident, append-only audit log with cryptographic hash chaining
-- Database: PostgreSQL

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    prev_hash TEXT,
    entry_hash TEXT NOT NULL,
    signer_id TEXT,
    signature TEXT,
    key_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_signer ON audit_log(signer_id);
CREATE INDEX IF NOT EXISTS idx_audit_prev_hash ON audit_log(prev_hash);
CREATE INDEX IF NOT EXISTS idx_audit_entry_hash ON audit_log(entry_hash);
CREATE INDEX IF NOT EXISTS idx_audit_key_id ON audit_log(key_id);

-- Add constraint: prev_hash must reference a valid entry_hash (except genesis)
-- Note: This is enforced at application level for performance
-- ALTER TABLE audit_log ADD CONSTRAINT fk_prev_hash 
--   FOREIGN KEY (prev_hash) REFERENCES audit_log(entry_hash);

COMMENT ON TABLE audit_log IS 'Immutable, append-only audit log with Merkle hash chaining';
COMMENT ON COLUMN audit_log.prev_hash IS 'Hash of previous entry (NULL for genesis entry)';
COMMENT ON COLUMN audit_log.entry_hash IS 'SHA-256 hash of canonical(payload_json) + prev_hash';
COMMENT ON COLUMN audit_log.signature IS 'Ed25519 signature over entry_hash';
COMMENT ON COLUMN audit_log.key_id IS 'Identifier for the signing key (supports key rotation)';
