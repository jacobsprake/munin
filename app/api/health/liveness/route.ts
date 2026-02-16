import { NextResponse } from 'next/server';

/**
 * GET /api/health/liveness
 * 
 * Kubernetes liveness probe endpoint.
 * Returns 200 if the application is alive.
 */
export async function GET() {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}
