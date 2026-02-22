/**
 * API test: GET /api/incidents
 */
import { GET } from '../route';

describe('GET /api/incidents', () => {
  it('returns 200 and incidents array', async () => {
    const req = new Request('http://localhost/api/incidents');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.incidents)).toBe(true);
  });

  it('accepts type filter', async () => {
    const req = new Request('http://localhost/api/incidents?type=flood');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.incidents)).toBe(true);
  });
});
