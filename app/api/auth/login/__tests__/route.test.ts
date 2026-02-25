import { POST } from '../route';

describe('POST /api/auth/login', () => {
  it('returns 400 when credentials missing', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid credentials', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operatorId: 'nonexistent_user',
        passphrase: 'wrong_password',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
