/**
 * API test: GET /api/graph
 */
import { GET } from '../route';

describe('GET /api/graph', () => {
  it('returns 200 and nodes/edges', async () => {
    const req = new Request('http://localhost/api/graph');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('edges');
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
  });
});
