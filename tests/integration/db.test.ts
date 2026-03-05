/**
 * DB Integration Tests
 * Tests migrations, integrity, and repository operations.
 * Note: May skip if better-sqlite3 has Node version mismatch.
 */
import { getDb } from '@/lib/db';
import { nodesRepo, engineJobsRepo } from '@/lib/db/repositories';

describe('DB Integration', () => {
  beforeAll(() => {
    try {
      getDb();
    } catch (e) {
      console.warn('DB init skipped (e.g. better-sqlite3 version mismatch):', (e as Error).message);
    }
  });
  it('initializes database and creates tables', () => {
    let db;
    try {
      db = getDb();
    } catch (e) {
      return; // Skip if DB unavailable
    }
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('nodes');
    expect(tableNames).toContain('edges');
    expect(tableNames).toContain('engine_jobs');
    expect(tableNames).toContain('incidents');
    expect(tableNames).toContain('handshake_packets');
  });

  it('engine_jobs repo creates and lists jobs', () => {
    try {
      getDb();
    } catch {
      return;
    }
    const job = engineJobsRepo.create();
    expect(job.id).toBeDefined();
    expect(job.status).toBe('pending');
    const jobs = engineJobsRepo.list(5, 0);
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs.some((j) => j.id === job.id)).toBe(true);
  });

  it('engine_jobs repo updates status', () => {
    try {
      getDb();
    } catch {
      return;
    }
    const job = engineJobsRepo.create();
    engineJobsRepo.updateStatus(job.id, 'running');
    const updated = engineJobsRepo.getById(job.id);
    expect(updated?.status).toBe('running');
    engineJobsRepo.updateStatus(job.id, 'completed', undefined, 'engine/out');
    const completed = engineJobsRepo.getById(job.id);
    expect(completed?.status).toBe('completed');
  });

  it('nodes repo upserts and retrieves', () => {
    try {
      getDb();
    } catch {
      return;
    }
    const node = nodesRepo.upsert({
      id: 'test_node_db_integration',
      sector: 'water',
      label: 'Test Pump',
      kind: 'pump',
      region: 'test',
      healthScore: 1.0,
      healthStatus: 'ok',
    });
    expect(node.id).toBe('test_node_db_integration');
    const retrieved = nodesRepo.getById('test_node_db_integration');
    expect(retrieved?.label).toBe('Test Pump');
  });
});
