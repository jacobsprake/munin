import { GET, POST } from '../route';

describe('/api/users', () => {
  describe('GET /api/users', () => {
    it('returns 200 with users array', async () => {
      const req = new Request('http://localhost/api/users');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.users)).toBe(true);
    });
  });

  describe('POST /api/users', () => {
    it('returns 400 when required fields missing', async () => {
      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_id: 'test' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid role', async () => {
      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: 'test_user',
          passphrase: 'password',
          role: 'invalid_role',
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('creates a user with valid input', async () => {
      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: `test_user_${Date.now()}`,
          passphrase: 'secure_password',
          role: 'operator',
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.role).toBe('operator');
    });
  });
});
