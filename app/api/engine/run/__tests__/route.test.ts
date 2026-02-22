/**
 * API test: POST/GET /api/engine/run
 */
import { POST, GET } from '../route';

describe('POST /api/engine/run', () => {
  it('returns 200 and jobId when starting pipeline', async () => {
    const req = new Request('http://localhost/api/engine/run', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.jobId).toBeDefined();
    expect(data.status).toBe('running');
  });
});

describe('GET /api/engine/run', () => {
  it('returns 200 with message when no jobId', async () => {
    const req = new Request('http://localhost/api/engine/run');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('message');
  });

  it('returns 404 for unknown jobId', async () => {
    const req = new Request('http://localhost/api/engine/run?jobId=nonexistent_job_123');
    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });
});
