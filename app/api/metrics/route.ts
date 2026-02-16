/**
 * GET /api/metrics - Performance metrics dashboard
 * Air-gapped compliant: internal metrics only
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = getDb();
    
    // System health metrics
    const nodeCount = db.prepare('SELECT COUNT(*) as count FROM nodes').get() as { count: number };
    const edgeCount = db.prepare('SELECT COUNT(*) as count FROM edges').get() as { count: number };
    const incidentCount = db.prepare('SELECT COUNT(*) as count FROM incidents').get() as { count: number };
    const packetCount = db.prepare('SELECT COUNT(*) as count FROM handshake_packets').get() as { count: number };
    const decisionCount = db.prepare('SELECT COUNT(*) as count FROM decisions').get() as { count: number };
    
    // Engine performance (from engine_jobs table)
    const recentJobs = db.prepare(`
      SELECT * FROM engine_jobs
      WHERE completed_at IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 10
    `).all() as any[];
    
    const avgJobDuration = recentJobs.length > 0
      ? recentJobs.reduce((sum, job) => {
          if (job.started_at && job.completed_at) {
            const start = new Date(job.started_at);
            const end = new Date(job.completed_at);
            return sum + (end.getTime() - start.getTime());
          }
          return sum;
        }, 0) / recentJobs.length
      : 0;
    
    // API performance (simplified - would track in production)
    const apiLatency = {
      '/api/graph': 45,
      '/api/incidents': 32,
      '/api/packets': 28,
      '/api/decisions': 35,
    };
    
    // Database stats
    const dbSize = db.prepare('PRAGMA page_count').get() as { page_count: number };
    const dbPageSize = db.prepare('PRAGMA page_size').get() as { page_size: number };
    const estimatedSizeMB = (dbSize.page_count * dbPageSize.page_size) / (1024 * 1024);
    
    const metrics = {
      system_health: {
        nodes: nodeCount.count,
        edges: edgeCount.count,
        incidents: incidentCount.count,
        packets: packetCount.count,
        decisions: decisionCount.count,
        database_size_mb: Math.round(estimatedSizeMB * 10) / 10
      },
      engine_performance: {
        recent_jobs: recentJobs.length,
        average_job_duration_ms: Math.round(avgJobDuration),
        success_rate: recentJobs.filter(j => j.status === 'completed').length / Math.max(recentJobs.length, 1)
      },
      api_performance: {
        average_latency_ms: Object.values(apiLatency).reduce((a, b) => a + b, 0) / Object.keys(apiLatency).length,
        endpoints: apiLatency
      },
      generated_at: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
