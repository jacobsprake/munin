/**
 * API test: GET /api/search
 */
import { GET } from '../route';

describe('GET /api/search', () => {
  it('returns 200 and empty results when query too short', async () => {
    const req = new Request('http://localhost/api/search?q=a');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.results).toEqual([]);
    expect(data.count).toBe(0);
  });

  it('returns 200 and results array when query length >= 2', async () => {
    const req = new Request('http://localhost/api/search?q=flood');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.query).toBe('flood');
  });
});
