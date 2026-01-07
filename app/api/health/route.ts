/**
 * GET /api/health
 * System health and status endpoint
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { nodesRepo, sensorReadingsRepo } from '@/lib/db/repositories';

export async function GET() {
  try {
    const db = getDb();
    
    // Get node counts
    const nodes = nodesRepo.getAll();
    const nodeCount = nodes.length;
    const healthyNodes = nodes.filter(n => n.healthStatus === 'ok').length;
    const degradedNodes = nodes.filter(n => n.healthStatus === 'degraded').length;
    const warningNodes = nodes.filter(n => n.healthStatus === 'warning').length;

    // Get latest sensor reading timestamp
    let lastSensorUpdate: Date | null = null;
    if (nodes.length > 0) {
      const latestReading = sensorReadingsRepo.getLatestByNode(nodes[0].id);
      if (latestReading) {
        lastSensorUpdate = latestReading.timestamp;
      }
    }

    // Database health check
    let dbHealthy = true;
    try {
      db.prepare('SELECT 1').get();
    } catch {
      dbHealthy = false;
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealthy,
        path: process.env.DATABASE_PATH || 'data/munin.db'
      },
      nodes: {
        total: nodeCount,
        healthy: healthyNodes,
        degraded: degradedNodes,
        warning: warningNodes
      },
      sensors: {
        lastUpdate: lastSensorUpdate?.toISOString() || null
      },
      deploymentMode: process.env.DEPLOYMENT_MODE || 'lab_demo'
    });
  } catch (error: any) {
    console.error('Error checking health:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

