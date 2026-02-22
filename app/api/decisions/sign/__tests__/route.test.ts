/**
 * API test: POST /api/decisions/sign – signing and verification
 */
import { POST } from '../route';

describe('POST /api/decisions/sign', () => {
  it('returns 400 when missing required fields', async () => {
    const req = new Request('http://localhost/api/decisions/sign', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing required|decision_id|signer_id|signature|key_id|action_type/i);
  });

  it('returns 400 when signature is missing', async () => {
    const req = new Request('http://localhost/api/decisions/sign', {
      method: 'POST',
      body: JSON.stringify({
        decision_id: 'dec_1',
        signer_id: 'user_1',
        key_id: 'key_1',
        action_type: 'FLOOD_GATE',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 or 404 for non-existent decision', async () => {
    const req = new Request('http://localhost/api/decisions/sign', {
      method: 'POST',
      body: JSON.stringify({
        decision_id: 'nonexistent_decision_id_12345',
        signer_id: 'user_1',
        signature: 'dGVzdF9zaWduYXR1cmU=',
        key_id: 'key_1',
        action_type: 'FLOOD_GATE',
        scope: {},
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect([404, 500]).toContain(res.status);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
