-- Migration: 005_checkpoints.sql
-- Creates checkpoints table for periodic chain state snapshots
-- Database: PostgreSQL

CREATE TABLE IF NOT EXISTS checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_head_hash TEXT NOT NULL, -- Receipt hash of the last entry at checkpoint time
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sequence_number BIGINT NOT NULL, -- Sequence number of last entry
    checkpoint_hash TEXT NOT NULL, -- Hash of checkpoint data itself
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkpoints_sequence ON checkpoints(sequence_number);
CREATE INDEX IF NOT EXISTS idx_checkpoints_head_hash ON checkpoints(chain_head_hash);

COMMENT ON TABLE checkpoints IS 'Periodic checkpoints of audit log chain state';
COMMENT ON COLUMN checkpoints.chain_head_hash IS 'Receipt hash of the last audit log entry at checkpoint time';
COMMENT ON COLUMN checkpoints.sequence_number IS 'Sequence number of the last entry included in checkpoint';
COMMENT ON COLUMN checkpoints.checkpoint_hash IS 'SHA-256 hash of checkpoint data (for checkpoint integrity)';
