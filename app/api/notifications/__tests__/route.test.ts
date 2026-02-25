import { GET } from '../route';

describe('GET /api/notifications', () => {
  it('returns 200 with notifications array', async () => {
    const req = new Request('http://localhost/api/notifications');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.notifications)).toBe(true);
  });
});
