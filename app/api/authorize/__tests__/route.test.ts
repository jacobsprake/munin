import { POST } from '../route';

describe('POST /api/authorize', () => {
  it('returns 400 when required fields missing', async () => {
    const req = new Request('http://localhost/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns error for nonexistent operator', async () => {
    const req = new Request('http://localhost/api/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packetId: 'nonexistent_packet_id',
        operatorId: 'nonexistent_op',
        passphrase: 'test',
      }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
