/**
 * POST /api/alerts - Create or trigger alert
 * GET /api/alerts - List recent alerts (from notifications + threshold breaches)
 * Air-gapped: no external email/SMS; alerts stored locally and surfaced in UI
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const severity = searchParams.get('severity'); // critical, high, medium, low

    const db = getDb();
    let query = `
      SELECT * FROM notifications
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params) as any[];
    const alerts = rows.map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      title: r.title,
      message: r.message,
      resource_id: r.resource_id,
      created_at: r.created_at,
      read: r.read_at != null,
    }));

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, severity, title, message, resource_id } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: 'type and title are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const sev = severity || 'medium';
    db.prepare(`
      INSERT INTO notifications (id, type, severity, title, message, resource_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, type, sev, title, message || '', resource_id || null);

    return NextResponse.json({
      success: true,
      id,
      message: 'Alert created',
    });
  } catch (error: any) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create alert' },
      { status: 500 }
    );
  }
}
