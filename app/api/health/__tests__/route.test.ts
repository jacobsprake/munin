/**
 * API test: GET /api/health
 */
import { GET } from '../route';

describe('GET /api/health', () => {
  it('returns 200 and healthy status', async () => {
    const req = new Request('http://localhost/api/health');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('munin');
    expect(data.timestamp).toBeDefined();
  });
});
