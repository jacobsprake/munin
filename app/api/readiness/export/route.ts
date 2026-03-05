/**
 * GET /api/readiness/export
 * Export readiness report as JSON or CSV
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const db = getDb();
    const benchmarks = db.prepare(`
      SELECT * FROM readiness_benchmarks
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];

    if (format === 'csv') {
      const headers = ['id', 'overall_score', 'time_to_authorize_avg', 'time_to_task_avg', 'time_to_stabilize_avg', 'scenario_success_rate', 'cascade_containment_rate', 'created_at'];
      const rows = benchmarks.map((b) =>
        headers.map((h) => String(b[h] ?? '')).join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="munin-readiness-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      exported_at: new Date().toISOString(),
      benchmarks,
      count: benchmarks.length,
    });
  } catch (error: any) {
    console.error('Readiness export failed:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
