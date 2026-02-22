/**
 * API test: POST /api/decisions/create
 */
import { POST } from '../route';

describe('POST /api/decisions/create', () => {
  it('returns 400 when missing required fields', async () => {
    const req = new Request('http://localhost/api/decisions/create', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing|required/i);
  });

  it('returns 400 when policy is incomplete', async () => {
    const req = new Request('http://localhost/api/decisions/create', {
      method: 'POST',
      body: JSON.stringify({
        incident_id: 'inc_1',
        playbook_id: 'flood.yaml',
        policy: {},
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 and decision when valid', async () => {
    const req = new Request('http://localhost/api/decisions/create', {
      method: 'POST',
      body: JSON.stringify({
        incident_id: 'inc_1',
        playbook_id: 'flood.yaml',
        policy: { threshold: 1, required: 1, signers: ['EA Duty Officer'] },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.decision).toBeDefined();
    expect(data.decision.decision_id).toBeDefined();
    expect(data.decision.incident_id).toBe('inc_1');
  });
});
