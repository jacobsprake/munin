import { GET } from '../route';

describe('GET /api/packets', () => {
  it('returns 200 with an array', async () => {
    const req = new Request('http://localhost/api/packets');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('supports id query param without error', async () => {
    const req = new Request('http://localhost/api/packets?id=nonexistent');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('supports status filter without error', async () => {
    const req = new Request('http://localhost/api/packets?status=ready');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
