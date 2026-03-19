/**
 * API test: POST /api/engine/sync
 */
import { POST } from '../route';

describe('POST /api/engine/sync', () => {
  it('returns JSON with success or error', async () => {
    const res = await POST(new Request('http://localhost/api/engine/sync', { method: 'POST' }));
    const data = await res.json();
    expect(data).toBeDefined();
    if (res.ok) {
      expect(data.success).toBe(true);
      expect(data.message).toMatch(/sync/i);
    } else {
      expect(data.error).toBeDefined();
      expect(res.status).toBe(500);
    }
  });
});
