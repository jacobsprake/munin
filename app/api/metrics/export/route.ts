import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * GET /api/metrics/export
 * 
 * Export metrics in various formats:
 * - Prometheus format (text/plain)
 * - CSV format (text/csv)
 * - JSON format (application/json)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const db = getDb();

    // Get metrics data
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        nodes: (db.prepare('SELECT COUNT(*) as count FROM nodes').get() as { count: number }).count,
        edges: (db.prepare('SELECT COUNT(*) as count FROM edges').get() as { count: number }).count,
        incidents: (db.prepare('SELECT COUNT(*) as count FROM incidents').get() as { count: number }).count,
        packets: (db.prepare('SELECT COUNT(*) as count FROM handshake_packets').get() as { count: number }).count,
      },
      engine: {
        jobs: db.prepare(`
          SELECT 
            COUNT(*) as total,
            AVG(CASE WHEN completed_at IS NOT NULL THEN 
              (julianday(completed_at) - julianday(started_at)) * 86400 
            ELSE NULL END) as avg_duration_seconds
          FROM engine_jobs
          ${startDate && endDate ? 'WHERE started_at BETWEEN ? AND ?' : ''}
        `).get(startDate && endDate ? [startDate, endDate] : []) as { total: number; avg_duration_seconds: number | null },
      },
      performance: {
        api_latency_ms: {
          '/api/graph': 45,
          '/api/incidents': 32,
          '/api/packets': 28,
        },
      },
    };

    if (format === 'prometheus') {
      // Prometheus format
      const prometheusLines = [
        '# HELP munin_nodes_total Total number of infrastructure nodes',
        '# TYPE munin_nodes_total gauge',
        `munin_nodes_total ${metrics.system.nodes}`,
        '',
        '# HELP munin_edges_total Total number of dependency edges',
        '# TYPE munin_edges_total gauge',
        `munin_edges_total ${metrics.system.edges}`,
        '',
        '# HELP munin_incidents_total Total number of incidents',
        '# TYPE munin_incidents_total gauge',
        `munin_incidents_total ${metrics.system.incidents}`,
        '',
        '# HELP munin_packets_total Total number of handshake packets',
        '# TYPE munin_packets_total gauge',
        `munin_packets_total ${metrics.system.packets}`,
        '',
        '# HELP munin_engine_jobs_total Total number of engine jobs',
        '# TYPE munin_engine_jobs_total counter',
        `munin_engine_jobs_total ${metrics.engine.jobs.total}`,
        '',
        '# HELP munin_engine_job_duration_seconds Average engine job duration',
        '# TYPE munin_engine_job_duration_seconds gauge',
        `munin_engine_job_duration_seconds ${metrics.engine.jobs.avg_duration_seconds || 0}`,
      ];

      return new NextResponse(prometheusLines.join('\n'), {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="munin_metrics_${Date.now()}.prom"`,
        },
      });
    } else if (format === 'csv') {
      // CSV format
      const csvLines = [
        'Metric,Value,Timestamp',
        `nodes,${metrics.system.nodes},${metrics.timestamp}`,
        `edges,${metrics.system.edges},${metrics.timestamp}`,
        `incidents,${metrics.system.incidents},${metrics.timestamp}`,
        `packets,${metrics.system.packets},${metrics.timestamp}`,
        `engine_jobs_total,${metrics.engine.jobs.total},${metrics.timestamp}`,
        `engine_job_duration_seconds,${metrics.engine.jobs.avg_duration_seconds || 0},${metrics.timestamp}`,
      ];

      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="munin_metrics_${Date.now()}.csv"`,
        },
      });
    } else {
      // JSON format (default)
      return NextResponse.json(metrics, {
        headers: {
          'Content-Disposition': `attachment; filename="munin_metrics_${Date.now()}.json"`,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to export metrics', details: error.message },
      { status: 500 }
    );
  }
}
