import { POST } from '../route';

describe('POST /api/safety/plc', () => {
  it('returns safe for normal RPM', async () => {
    const req = new Request('http://localhost/api/safety/plc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: { action: 'start_pump', parameters: { rpm: 1000 } } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.safety_level).toBe('safe');
    expect(data.violated_invariants).toHaveLength(0);
  });

  it('blocks RPM exceeding 3600', async () => {
    const req = new Request('http://localhost/api/safety/plc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: { action: 'spin_turbine', parameters: { rpm: 5000 } } }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.safety_level).toBe('blocked');
    expect(data.violated_invariants).toContain('inv_002');
    expect(data.block_reason).toContain('RPM');
  });

  it('blocks pressure exceeding 100', async () => {
    const req = new Request('http://localhost/api/safety/plc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: { action: 'test', parameters: { pressure: 150 } } }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.safety_level).toBe('blocked');
    expect(data.violated_invariants).toContain('inv_003');
  });
});
