/**
 * Database client for Munin
 * Uses better-sqlite3 for SQLite database operations
 */
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'munin.db');
const dbDir = join(process.cwd(), 'data');

// Ensure data directory exists
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // Better concurrency
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: Database.Database) {
  // Sensor readings table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      value REAL NOT NULL,
      source_file TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_node_timestamp ON sensor_readings(node_id, timestamp)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_readings(timestamp)`);

  // Nodes table
  database.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      sector TEXT NOT NULL,
      label TEXT NOT NULL,
      kind TEXT NOT NULL,
      region TEXT NOT NULL,
      lat REAL,
      lon REAL,
      health_score REAL DEFAULT 1.0,
      health_status TEXT DEFAULT 'ok',
      observability_score REAL,
      observability_drivers TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Edges table
  database.exec(`
    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      confidence_score REAL NOT NULL,
      inferred_lag_seconds INTEGER NOT NULL,
      condition TEXT,
      evidence_refs TEXT,
      is_shadow_link INTEGER DEFAULT 0,
      stability_score REAL,
      evidence_window_count INTEGER,
      confounder_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source) REFERENCES nodes(id),
      FOREIGN KEY (target) REFERENCES nodes(id)
    )
  `);

  // Evidence windows table
  database.exec(`
    CREATE TABLE IF NOT EXISTS evidence_windows (
      id TEXT PRIMARY KEY,
      edge_id TEXT NOT NULL,
      start_ts DATETIME NOT NULL,
      end_ts DATETIME NOT NULL,
      correlation REAL NOT NULL,
      lag_seconds INTEGER NOT NULL,
      robustness REAL NOT NULL,
      notes TEXT,
      missingness REAL,
      noise_score REAL,
      drift_score REAL,
      support_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (edge_id) REFERENCES edges(id)
    )
  `);

  // Incidents table
  database.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      start_ts DATETIME NOT NULL,
      timeline TEXT NOT NULL,
      scenario_controls TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Handshake packets table
  database.exec(`
    CREATE TABLE IF NOT EXISTS handshake_packets (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      created_ts DATETIME NOT NULL,
      status TEXT NOT NULL,
      scope TEXT NOT NULL,
      situation_summary TEXT NOT NULL,
      proposed_action TEXT NOT NULL,
      regulatory_basis TEXT NOT NULL,
      playbook_id TEXT NOT NULL,
      evidence_refs TEXT NOT NULL,
      uncertainty TEXT NOT NULL,
      approvals TEXT NOT NULL,
      provenance TEXT NOT NULL,
      technical_verification TEXT,
      actuator_boundary TEXT,
      audit TEXT,
      merkle_previous_hash TEXT,
      merkle_receipt_hash TEXT,
      multi_sig_required INTEGER DEFAULT 1,
      multi_sig_threshold INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_merkle_previous ON handshake_packets(merkle_previous_hash)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_merkle_receipt ON handshake_packets(merkle_receipt_hash)`);

  // Audit log table (enhanced with hash chaining and signatures)
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      ts DATETIME NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      prev_hash TEXT,
      entry_hash TEXT NOT NULL,
      signer_id TEXT,
      signature TEXT,
      key_id TEXT,
      sequence_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes (SQLite syntax)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_signer ON audit_log(signer_id);
    CREATE INDEX IF NOT EXISTS idx_audit_prev_hash ON audit_log(prev_hash);
    CREATE INDEX IF NOT EXISTS idx_audit_entry_hash ON audit_log(entry_hash);
    CREATE INDEX IF NOT EXISTS idx_audit_key_id ON audit_log(key_id);
  `);
  
  // Decisions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS decisions (
      decision_id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL,
      playbook_id TEXT NOT NULL,
      step_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      policy_json TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      authorized_at DATETIME,
      previous_decision_hash TEXT
    )
  `);
  
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_decisions_incident ON decisions(incident_id);
    CREATE INDEX IF NOT EXISTS idx_decisions_playbook ON decisions(playbook_id);
    CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
  `);
  
  // Decision signatures table
  database.exec(`
    CREATE TABLE IF NOT EXISTS decision_signatures (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL,
      signer_id TEXT NOT NULL,
      signature TEXT NOT NULL,
      signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      key_id TEXT NOT NULL,
      UNIQUE(decision_id, signer_id),
      FOREIGN KEY (decision_id) REFERENCES decisions(decision_id) ON DELETE CASCADE
    )
  `);
  
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_decision_sigs_decision ON decision_signatures(decision_id);
    CREATE INDEX IF NOT EXISTS idx_decision_sigs_signer ON decision_signatures(signer_id);
    CREATE INDEX IF NOT EXISTS idx_decision_sigs_key ON decision_signatures(key_id);
  `);
  
  // Users table (enhanced with keys)
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      public_key TEXT NOT NULL,
      key_id TEXT NOT NULL UNIQUE,
      key_status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME
    )
  `);
  
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_key_id ON users(key_id);
    CREATE INDEX IF NOT EXISTS idx_users_key_status ON users(key_status);
  `);
  
  // User key history table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_key_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_id TEXT NOT NULL,
      public_key TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME,
      rotated_to_key_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `);
  
  // Checkpoints table
  database.exec(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY,
      chain_head_hash TEXT NOT NULL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sequence_number INTEGER NOT NULL,
      checkpoint_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_checkpoints_timestamp ON checkpoints(timestamp);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_sequence ON checkpoints(sequence_number);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_head_hash ON checkpoints(chain_head_hash);
  `);

  // Engine jobs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS engine_jobs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      started_at DATETIME,
      completed_at DATETIME,
      error TEXT,
      output_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Operators table (login credentials for operators)
  database.exec(`
    CREATE TABLE IF NOT EXISTS operators (
      id TEXT PRIMARY KEY,
      operator_id TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      passphrase_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    )
  `);

  // Notifications table (internal-only, air-gapped compliant)
  database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      resource_id TEXT,
      resource_type TEXT,
      user_id TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME
    )
  `);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`);

  // Readiness benchmarks table (NATO-Style Readiness Index)
  database.exec(`
    CREATE TABLE IF NOT EXISTS readiness_benchmarks (
      id TEXT PRIMARY KEY,
      overall_score REAL NOT NULL,
      time_to_authorize_avg REAL NOT NULL,
      time_to_task_avg REAL NOT NULL,
      time_to_stabilize_avg REAL NOT NULL,
      scenario_success_rate REAL NOT NULL,
      cascade_containment_rate REAL NOT NULL,
      sector_breakdown TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_readiness_created ON readiness_benchmarks(created_at)`);

  // Chaos scenarios table
  database.exec(`
    CREATE TABLE IF NOT EXISTS chaos_scenarios (
      id TEXT PRIMARY KEY,
      scenario_type TEXT NOT NULL,
      title TEXT NOT NULL,
      severity REAL NOT NULL,
      impact_metrics TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_chaos_type ON chaos_scenarios(scenario_type)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_chaos_created ON chaos_scenarios(created_at)`);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

