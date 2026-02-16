/**
 * GET /api/health - Basic health check
 * GET /api/health/ready - Readiness probe (checks dependencies)
 * GET /api/health/live - Liveness probe (checks if app is running)
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: Request) {
  try {
    const { pathname } = new URL(request.url);
    
    // Basic health check
    if (pathname === '/api/health' || pathname.endsWith('/health')) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'munin',
        version: '1.0.0'
      });
    }
    
    // Readiness probe - checks dependencies
    if (pathname.includes('/ready')) {
      const checks: Record<string, boolean> = {};
      const errors: string[] = [];
      
      // Check database
      try {
        const db = getDb();
        db.prepare('SELECT 1').get();
        checks.database = true;
      } catch (error: any) {
        checks.database = false;
        errors.push(`Database: ${error.message}`);
      }
      
      // Check engine output files
      const requiredFiles = [
        'engine/out/graph.json',
        'engine/out/incidents.json'
      ];
      
      for (const file of requiredFiles) {
        const exists = existsSync(join(process.cwd(), file));
        checks[file] = exists;
        if (!exists) {
          errors.push(`Missing: ${file}`);
        }
      }
      
      // Check data directory
      const dataDirExists = existsSync(join(process.cwd(), 'data'));
      checks.data_directory = dataDirExists;
      
      const allHealthy = Object.values(checks).every(v => v === true);
      
      if (allHealthy) {
        return NextResponse.json({
          status: 'ready',
          checks,
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json({
          status: 'not_ready',
          checks,
          errors,
          timestamp: new Date().toISOString()
        }, { status: 503 });
      }
    }
    
    // Liveness probe - just checks if app is running
    if (pathname.includes('/live')) {
      return NextResponse.json({
        status: 'alive',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
