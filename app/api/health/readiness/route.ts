import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/health/readiness
 * 
 * Kubernetes readiness probe endpoint.
 * Returns 200 if system is ready to accept traffic.
 */
export async function GET() {
  try {
    const checks: Record<string, boolean> = {};
    let allReady = true;

    const root = process.cwd();

    // Check 1: Engine output directory exists with graph data
    const engineOutDir = join(root, 'engine', 'out');
    const graphExists = existsSync(join(engineOutDir, 'graph.json'));
    checks.engine_output = graphExists;
    if (!graphExists) allReady = false;

    // Check 2: Configuration files exist
    checks.config_files = existsSync(join(root, 'engine', 'config.py'));
    if (!checks.config_files) allReady = false;

    // Check 3: Sample data directory accessible
    checks.data_directory = existsSync(join(root, 'engine', 'sample_data'));

    // Check 4: Playbooks exist
    checks.playbooks = existsSync(join(root, 'playbooks'));

    if (allReady) {
      return NextResponse.json({
        status: 'ready',
        checks,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          status: 'not_ready',
          checks,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
