-- Migration: 004_users_keys.sql
-- Creates users table with public key management and key rotation support
-- Database: PostgreSQL

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    public_key TEXT NOT NULL, -- Ed25519 public key (base64 encoded)
    key_id TEXT NOT NULL UNIQUE, -- Unique identifier for this key
    key_status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, ROTATED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_key_id ON users(key_id);
CREATE INDEX IF NOT EXISTS idx_users_key_status ON users(key_status);

-- Key history table for key rotation tracking
CREATE TABLE IF NOT EXISTS user_key_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    key_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    status TEXT NOT NULL, -- ACTIVE, REVOKED, ROTATED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    rotated_to_key_id TEXT -- If rotated, reference to new key
);

CREATE INDEX IF NOT EXISTS idx_key_history_user ON user_key_history(user_id);
CREATE INDEX IF NOT EXISTS idx_key_history_key_id ON user_key_history(key_id);

COMMENT ON TABLE users IS 'Users with Ed25519 public keys for signing';
COMMENT ON COLUMN users.key_id IS 'Unique identifier for the current active key';
COMMENT ON COLUMN users.key_status IS 'Status: ACTIVE, REVOKED, or ROTATED';
COMMENT ON TABLE user_key_history IS 'Historical record of all keys for a user (supports rotation)';
