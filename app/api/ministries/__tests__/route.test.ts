import { GET, POST } from '../route';

describe('/api/ministries', () => {
  beforeEach(() => {
    try {
      const { getDb } = require('@/lib/db');
      const db = getDb();
      db.exec('DELETE FROM ministries');
    } catch { /* first run may not have table yet */ }
  });

  it('GET returns empty list initially', async () => {
    const req = new Request('http://localhost/api/ministries');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.ministries)).toBe(true);
  });

  it('POST registers a new ministry', async () => {
    const req = new Request('http://localhost/api/ministries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Environment Agency',
        code: `EA_${Date.now()}`,
        type: 'government',
        jurisdiction: 'UK',
        contactName: 'Director of Operations',
        contactRole: 'Chief Water Officer',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ministry.name).toBe('Environment Agency');
    expect(data.ministry.publicKey).toBeTruthy();
    expect(data.ministry.keyId).toBeTruthy();
  });

  it('POST rejects duplicate ministry code', async () => {
    const code = `DUP_${Date.now()}`;
    const body = JSON.stringify({ name: 'Test Ministry', code });

    const req1 = new Request('http://localhost/api/ministries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    await POST(req1);

    const req2 = new Request('http://localhost/api/ministries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    const res = await POST(req2);
    expect(res.status).toBe(409);
  });

  it('POST rejects missing required fields', async () => {
    const req = new Request('http://localhost/api/ministries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Code' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
