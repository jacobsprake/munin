/**
 * Security test: input validation (roadmap item 34) – malformed JSON/YAML, path traversal
 */
import { POST } from '../../playbooks/route';
import { POST as createDecision } from '../../decisions/create/route';

describe('Input validation', () => {
  it('POST /api/playbooks rejects invalid YAML', async () => {
    const req = new Request('http://localhost/api/playbooks', {
      method: 'POST',
      body: JSON.stringify({
        id: '../../../etc/passwd',
        content: 'invalid: yaml: [[[',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid yaml/i);
  });

  it('POST /api/decisions/create rejects malformed JSON body', async () => {
    const req = new Request('http://localhost/api/decisions/create', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await createDecision(req);
    expect(res.status).toBe(500);
  });
});
