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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_node_timestamp (node_id, timestamp),
      INDEX idx_timestamp (timestamp)
    )
  `);

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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_merkle_previous (merkle_previous_hash),
      INDEX idx_merkle_receipt (merkle_receipt_hash)
    )
  `);

  // Audit log table
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      ts DATETIME NOT NULL,
      packet_id TEXT,
      hash TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_actor_ts (actor, ts),
      INDEX idx_packet (packet_id)
    )
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

  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      operator_id TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      passphrase_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    )
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

