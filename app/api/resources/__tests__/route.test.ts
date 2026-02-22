/**
 * API test: GET/POST/DELETE /api/resources – resource locking
 */
import { GET, POST, DELETE } from '../route';

describe('GET /api/resources', () => {
  it('returns 200 and reservations when no params', async () => {
    const req = new Request('http://localhost/api/resources');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.reservations)).toBe(true);
  });

  it('returns 200 with packetId for locks by packet', async () => {
    const req = new Request('http://localhost/api/resources?packetId=packet_1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.locks)).toBe(true);
  });
});

describe('POST /api/resources', () => {
  it('returns 400 when missing required fields', async () => {
    const req = new Request('http://localhost/api/resources', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing required/i);
  });

  it('returns 200 and lock when valid request', async () => {
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const req = new Request('http://localhost/api/resources', {
      method: 'POST',
      body: JSON.stringify({
        resourceId: 'gen_backup_01',
        requestingSector: 'power',
        requestedCapacity: 10,
        startTime: start.toISOString(),
        durationMinutes: 60,
        priority: 8,
        reason: 'Test lock',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.lock).toBeDefined();
    expect(data.lock.id).toBeDefined();
    expect(data.lock.resourceId).toBe('gen_backup_01');
    expect(data.lock.status).toBe('locked');
  });
});

describe('DELETE /api/resources', () => {
  it('returns 400 when lockId missing', async () => {
    const req = new Request('http://localhost/api/resources');
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/lockId|missing/i);
  });

  it('returns 404 for unknown lockId', async () => {
    const req = new Request('http://localhost/api/resources?lockId=unknown_lock_xyz');
    const res = await DELETE(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });
});
