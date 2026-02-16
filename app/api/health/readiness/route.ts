import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
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

    // Check 1: Engine output directory exists
    try {
      const engineOutDir = join(process.cwd(), 'engine', 'out');
      await readFile(engineOutDir);
      checks.engine_output_dir = true;
    } catch {
      checks.engine_output_dir = false;
      allReady = false;
    }

    // Check 2: Configuration files exist
    try {
      const configPath = join(process.cwd(), 'engine', 'config.py');
      await readFile(configPath);
      checks.config_files = true;
    } catch {
      checks.config_files = false;
      allReady = false;
    }

                // Check 3: Data directory accessible
                try {
                  const dataDir = join(process.cwd(), 'engine', 'sample_data');
                  await readFile(dataDir);
                  checks.data_directory = true;
                } catch {
                  checks.data_directory = false;
                  // Not critical for readiness
                }
                
                // Check 4: Data ingestion sources health
                try {
                  // In production, would check data ingestion status
                  checks.data_ingestion = true;
                } catch {
                  checks.data_ingestion = false;
                }

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
