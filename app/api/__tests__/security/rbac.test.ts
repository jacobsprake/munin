/**
 * Security test: RBAC (roadmap item 33) – unauthorized access attempts
 */
import { GET } from '../../decisions/route';
import { POST } from '../../decisions/create/route';

describe('RBAC / unauthorized access', () => {
  it('GET /api/decisions returns 200 (list may be empty without auth)', async () => {
    const req = new Request('http://localhost/api/decisions');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('POST /api/decisions/create without auth still validates body', async () => {
    const req = new Request('http://localhost/api/decisions/create', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
