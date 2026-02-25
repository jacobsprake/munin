import { GET } from '../route';

describe('GET /api/evidence', () => {
  it('returns 200 with windows array', async () => {
    const req = new Request('http://localhost/api/evidence');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('windows');
    expect(Array.isArray(data.windows)).toBe(true);
  });
});
