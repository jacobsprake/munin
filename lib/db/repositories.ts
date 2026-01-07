/**
 * Repository layer for database operations
 */
import { getDb } from './index';
import { randomUUID } from 'crypto';
import type { 
  SensorReading, 
  Node, 
  Edge, 
  EvidenceWindow, 
  Incident, 
  HandshakePacket,
  AuditLog,
  EngineJob,
  User
} from './schema';

// Sensor Readings Repository
export const sensorReadingsRepo = {
  insert(reading: Omit<SensorReading, 'id' | 'createdAt'>): SensorReading {
    const db = getDb();
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO sensor_readings (id, node_id, timestamp, value, source_file)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, reading.nodeId, reading.timestamp.toISOString(), reading.value, reading.sourceFile || null);
    return { ...reading, id, createdAt: new Date() };
  },

  insertBatch(readings: Omit<SensorReading, 'id' | 'createdAt'>[]): void {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO sensor_readings (id, node_id, timestamp, value, source_file)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items) => {
      for (const reading of items) {
        const id = randomUUID();
        stmt.run(id, reading.nodeId, reading.timestamp.toISOString(), reading.value, reading.sourceFile || null);
      }
    });
    insertMany(readings);
  },

  getByNodeAndTimeRange(nodeId: string, start: Date, end: Date): SensorReading[] {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM sensor_readings
      WHERE node_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `);
    return stmt.all(nodeId, start.toISOString(), end.toISOString()).map((row: any) => ({
      id: row.id,
      nodeId: row.node_id,
      timestamp: new Date(row.timestamp),
      value: row.value,
      sourceFile: row.source_file,
      createdAt: new Date(row.created_at)
    }));
  },

  getLatestByNode(nodeId: string): SensorReading | null {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM sensor_readings
      WHERE node_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    const row: any = stmt.get(nodeId);
    if (!row) return null;
    return {
      id: row.id,
      nodeId: row.node_id,
      timestamp: new Date(row.timestamp),
      value: row.value,
      sourceFile: row.source_file,
      createdAt: new Date(row.created_at)
    };
  }
};

// Nodes Repository
export const nodesRepo = {
  upsert(node: Omit<Node, 'createdAt' | 'updatedAt'>): Node {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM nodes WHERE id = ?').get(node.id);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE nodes SET
          sector = ?, label = ?, kind = ?, region = ?, lat = ?, lon = ?,
          health_score = ?, health_status = ?, observability_score = ?,
          observability_drivers = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        node.sector, node.label, node.kind, node.region, node.lat || null, node.lon || null,
        node.healthScore, node.healthStatus, node.observabilityScore || null,
        node.observabilityDrivers || null, node.id
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO nodes (id, sector, label, kind, region, lat, lon, health_score, health_status, observability_score, observability_drivers)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        node.id, node.sector, node.label, node.kind, node.region, node.lat || null, node.lon || null,
        node.healthScore, node.healthStatus, node.observabilityScore || null, node.observabilityDrivers || null
      );
    }
    return this.getById(node.id)!;
  },

  getById(id: string): Node | null {
    const db = getDb();
    const row: any = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToNode(row);
  },

  getAll(): Node[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM nodes ORDER BY label').all();
    return rows.map(this.mapRowToNode);
  },

  mapRowToNode(row: any): Node {
    return {
      id: row.id,
      sector: row.sector,
      label: row.label,
      kind: row.kind,
      region: row.region,
      lat: row.lat,
      lon: row.lon,
      healthScore: row.health_score,
      healthStatus: row.health_status,
      observabilityScore: row.observability_score,
      observabilityDrivers: row.observability_drivers,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
};

// Edges Repository
export const edgesRepo = {
  upsert(edge: Omit<Edge, 'createdAt' | 'updatedAt'>): Edge {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM edges WHERE id = ?').get(edge.id);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE edges SET
          source = ?, target = ?, confidence_score = ?, inferred_lag_seconds = ?,
          condition = ?, evidence_refs = ?, is_shadow_link = ?, stability_score = ?,
          evidence_window_count = ?, confounder_notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        edge.source, edge.target, edge.confidenceScore, edge.inferredLagSeconds,
        edge.condition || null, edge.evidenceRefs || null, edge.isShadowLink ? 1 : 0,
        edge.stabilityScore || null, edge.evidenceWindowCount || null,
        edge.confounderNotes || null, edge.id
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO edges (id, source, target, confidence_score, inferred_lag_seconds, condition, evidence_refs, is_shadow_link, stability_score, evidence_window_count, confounder_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        edge.id, edge.source, edge.target, edge.confidenceScore, edge.inferredLagSeconds,
        edge.condition || null, edge.evidenceRefs || null, edge.isShadowLink ? 1 : 0,
        edge.stabilityScore || null, edge.evidenceWindowCount || null, edge.confounderNotes || null
      );
    }
    return this.getById(edge.id)!;
  },

  getById(id: string): Edge | null {
    const db = getDb();
    const row: any = db.prepare('SELECT * FROM edges WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToEdge(row);
  },

  getAll(): Edge[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM edges').all();
    return rows.map(this.mapRowToEdge);
  },

  mapRowToEdge(row: any): Edge {
    return {
      id: row.id,
      source: row.source,
      target: row.target,
      confidenceScore: row.confidence_score,
      inferredLagSeconds: row.inferred_lag_seconds,
      condition: row.condition,
      evidenceRefs: row.evidence_refs,
      isShadowLink: row.is_shadow_link === 1,
      stabilityScore: row.stability_score,
      evidenceWindowCount: row.evidence_window_count,
      confounderNotes: row.confounder_notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
};

// Evidence Windows Repository
export const evidenceWindowsRepo = {
  insert(window: Omit<EvidenceWindow, 'createdAt'>): EvidenceWindow {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO evidence_windows (id, edge_id, start_ts, end_ts, correlation, lag_seconds, robustness, notes, missingness, noise_score, drift_score, support_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      window.id, window.edgeId, window.startTs.toISOString(), window.endTs.toISOString(),
      window.correlation, window.lagSeconds, window.robustness, window.notes || null,
      window.missingness || null, window.noiseScore || null, window.driftScore || null,
      window.supportType || null
    );
    return { ...window, createdAt: new Date() };
  },

  insertBatch(windows: Omit<EvidenceWindow, 'createdAt'>[]): void {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO evidence_windows (id, edge_id, start_ts, end_ts, correlation, lag_seconds, robustness, notes, missingness, noise_score, drift_score, support_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items) => {
      for (const window of items) {
        stmt.run(
          window.id, window.edgeId, window.startTs.toISOString(), window.endTs.toISOString(),
          window.correlation, window.lagSeconds, window.robustness, window.notes || null,
          window.missingness || null, window.noiseScore || null, window.driftScore || null,
          window.supportType || null
        );
      }
    });
    insertMany(windows);
  },

  getByEdgeId(edgeId: string): EvidenceWindow[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM evidence_windows WHERE edge_id = ? ORDER BY start_ts').all(edgeId);
    return rows.map(this.mapRowToWindow);
  },

  getAll(): EvidenceWindow[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM evidence_windows ORDER BY start_ts').all();
    return rows.map(this.mapRowToWindow);
  },

  mapRowToWindow(row: any): EvidenceWindow {
    return {
      id: row.id,
      edgeId: row.edge_id,
      startTs: new Date(row.start_ts),
      endTs: new Date(row.end_ts),
      correlation: row.correlation,
      lagSeconds: row.lag_seconds,
      robustness: row.robustness,
      notes: row.notes,
      missingness: row.missingness,
      noiseScore: row.noise_score,
      driftScore: row.drift_score,
      supportType: row.support_type,
      createdAt: new Date(row.created_at)
    };
  }
};

// Incidents Repository
export const incidentsRepo = {
  upsert(incident: Omit<Incident, 'createdAt' | 'updatedAt'>): Incident {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM incidents WHERE id = ?').get(incident.id);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE incidents SET
          title = ?, type = ?, start_ts = ?, timeline = ?, scenario_controls = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        incident.title, incident.type, incident.startTs.toISOString(),
        incident.timeline, incident.scenarioControls || null, incident.id
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO incidents (id, title, type, start_ts, timeline, scenario_controls)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        incident.id, incident.title, incident.type, incident.startTs.toISOString(),
        incident.timeline, incident.scenarioControls || null
      );
    }
    return this.getById(incident.id)!;
  },

  getById(id: string): Incident | null {
    const db = getDb();
    const row: any = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToIncident(row);
  },

  getAll(): Incident[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM incidents ORDER BY start_ts DESC').all();
    return rows.map(this.mapRowToIncident);
  },

  mapRowToIncident(row: any): Incident {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      startTs: new Date(row.start_ts),
      timeline: row.timeline,
      scenarioControls: row.scenario_controls,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
};

// Handshake Packets Repository
export const packetsRepo = {
  upsert(packet: Omit<HandshakePacket, 'createdAt' | 'updatedAt'>): HandshakePacket {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM handshake_packets WHERE id = ?').get(packet.id);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE handshake_packets SET
          version = ?, created_ts = ?, status = ?, scope = ?, situation_summary = ?,
          proposed_action = ?, regulatory_basis = ?, playbook_id = ?, evidence_refs = ?,
          uncertainty = ?, approvals = ?, provenance = ?, technical_verification = ?,
          actuator_boundary = ?, audit = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        packet.version, packet.createdTs.toISOString(), packet.status, packet.scope,
        packet.situationSummary, packet.proposedAction, packet.regulatoryBasis,
        packet.playbookId, packet.evidenceRefs, packet.uncertainty, packet.approvals,
        packet.provenance, packet.technicalVerification || null, packet.actuatorBoundary || null,
        packet.audit || null, packet.id
      );
    } else {
      const stmt = db.prepare(`
        INSERT INTO handshake_packets (id, version, created_ts, status, scope, situation_summary, proposed_action, regulatory_basis, playbook_id, evidence_refs, uncertainty, approvals, provenance, technical_verification, actuator_boundary, audit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        packet.id, packet.version, packet.createdTs.toISOString(), packet.status, packet.scope,
        packet.situationSummary, packet.proposedAction, packet.regulatoryBasis, packet.playbookId,
        packet.evidenceRefs, packet.uncertainty, packet.approvals, packet.provenance,
        packet.technicalVerification || null, packet.actuatorBoundary || null, packet.audit || null
      );
    }
    return this.getById(packet.id)!;
  },

  getById(id: string): HandshakePacket | null {
    const db = getDb();
    const row: any = db.prepare('SELECT * FROM handshake_packets WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToPacket(row);
  },

  getAll(): HandshakePacket[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM handshake_packets ORDER BY created_ts DESC').all();
    return rows.map(this.mapRowToPacket);
  },

  mapRowToPacket(row: any): HandshakePacket {
    return {
      id: row.id,
      version: row.version,
      createdTs: new Date(row.created_ts),
      status: row.status,
      scope: row.scope,
      situationSummary: row.situation_summary,
      proposedAction: row.proposed_action,
      regulatoryBasis: row.regulatory_basis,
      playbookId: row.playbook_id,
      evidenceRefs: row.evidence_refs,
      uncertainty: row.uncertainty,
      approvals: row.approvals,
      provenance: row.provenance,
      technicalVerification: row.technical_verification,
      actuatorBoundary: row.actuator_boundary,
      audit: row.audit,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
};

// Audit Log Repository
export const auditLogRepo = {
  insert(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const db = getDb();
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO audit_log (id, action, actor, ts, packet_id, hash, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, log.action, log.actor, log.ts.toISOString(), log.packetId || null,
      log.hash, log.metadata || null
    );
    return { ...log, id, createdAt: new Date() };
  },

  getByPacketId(packetId: string): AuditLog[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM audit_log WHERE packet_id = ? ORDER BY ts DESC').all(packetId);
    return rows.map(this.mapRowToLog);
  },

  getAll(limit = 100): AuditLog[] {
    const db = getDb();
    const rows: any[] = db.prepare('SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?').all(limit);
    return rows.map(this.mapRowToLog);
  },

  mapRowToLog(row: any): AuditLog {
    return {
      id: row.id,
      action: row.action,
      actor: row.actor,
      ts: new Date(row.ts),
      packetId: row.packet_id,
      hash: row.hash,
      metadata: row.metadata,
      createdAt: new Date(row.created_at)
    };
  }
};

// Engine Jobs Repository
export const engineJobsRepo = {
  create(): EngineJob {
    const db = getDb();
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO engine_jobs (id, status)
      VALUES (?, 'pending')
    `);
    stmt.run(id);
    return this.getById(id)!;
  },

  getById(id: string): EngineJob | null {
    const db = getDb();
    const row: any = db.prepare('SELECT * FROM engine_jobs WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      error: row.error,
      outputPath: row.output_path,
      createdAt: new Date(row.created_at)
    };
  },

  updateStatus(id: string, status: EngineJob['status'], error?: string, outputPath?: string): void {
    const db = getDb();
    if (status === 'running') {
      db.prepare('UPDATE engine_jobs SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    } else if (status === 'completed' || status === 'failed') {
      db.prepare(`
        UPDATE engine_jobs SET status = ?, completed_at = CURRENT_TIMESTAMP, error = ?, output_path = ?
        WHERE id = ?
      `).run(status, error || null, outputPath || null, id);
    }
  }
};

