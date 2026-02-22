/**
 * API test: GET/POST /api/playbooks – playbook list and load
 */
import { GET, POST } from '../route';

describe('GET /api/playbooks', () => {
  it('returns 200 and playbooks array when no id', async () => {
    const req = new Request('http://localhost/api/playbooks');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.playbooks)).toBe(true);
  });

  it('returns 404 for unknown playbook id', async () => {
    const req = new Request('http://localhost/api/playbooks?id=non_existent_playbook_xyz');
    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });
});

describe('POST /api/playbooks', () => {
  it('returns 400 when missing id or content', async () => {
    const req = new Request('http://localhost/api/playbooks', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing required|id|content/i);
  });

  it('returns 400 for invalid YAML content', async () => {
    const req = new Request('http://localhost/api/playbooks', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test_playbook_invalid',
        content: 'invalid: yaml: [[[',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid yaml/i);
  });
});
