/**
 * Health Check API Tests
 */
import { GET } from '@/app/api/health/route';

describe('Health Check API', () => {
  it('should return healthy status', async () => {
    const request = new Request('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('munin');
    expect(data.timestamp).toBeDefined();
  });

  it('should return liveness status', async () => {
    const request = new Request('http://localhost:3000/api/health/live');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('alive');
    expect(data.timestamp).toBeDefined();
  });

  it('should check readiness', async () => {
    const request = new Request('http://localhost:3000/api/health/ready');
    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBeDefined();
    expect(data.status).toBeDefined();
    expect(data.checks).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });
});
