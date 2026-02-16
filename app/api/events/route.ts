/**
 * GET /api/events
 * Server-Sent Events (SSE) endpoint for real-time updates
 * Air-gapped compliant: internal-only event streaming
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Note: Next.js App Router has limited SSE support
// This implementation uses polling fallback for compatibility
// For full SSE, consider custom server setup or WebSocket

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('type') || 'all';
    const lastEventId = searchParams.get('lastEventId') || '0';

    // Get recent events from database (notifications, decisions, incidents)
    const db = getDb();
    const events: any[] = [];

    // Get recent notifications
    if (eventType === 'all' || eventType === 'notifications') {
      const notifications = db.prepare(`
        SELECT * FROM notifications
        WHERE created_at > datetime('now', '-1 hour')
        ORDER BY created_at DESC
        LIMIT 20
      `).all() as any[];
      
      events.push(...notifications.map(n => ({
        id: n.id,
        type: 'notification',
        data: {
          notification_type: n.type,
          severity: n.severity,
          title: n.title,
          message: n.message,
          resource_id: n.resource_id,
          created_at: n.created_at
        }
      })));
    }

    // Get recent decisions
    if (eventType === 'all' || eventType === 'decisions') {
      const decisions = db.prepare(`
        SELECT * FROM decisions
        WHERE created_at > datetime('now', '-1 hour')
        ORDER BY created_at DESC
        LIMIT 20
      `).all() as any[];
      
      events.push(...decisions.map(d => ({
        id: d.decision_id,
        type: 'decision',
        data: {
          decision_id: d.decision_id,
          status: d.status,
          incident_id: d.incident_id,
          created_at: d.created_at,
          authorized_at: d.authorized_at
        }
      })));
    }

    // Sort by timestamp
    events.sort((a, b) => {
      const timeA = new Date(a.data.created_at || a.data.authorized_at || 0).getTime();
      const timeB = new Date(b.data.created_at || b.data.authorized_at || 0).getTime();
      return timeB - timeA;
    });

    // Return as JSON (polling fallback)
    // For true SSE, would need custom server with ReadableStream
    return NextResponse.json({
      success: true,
      events: events.slice(0, 50),
      lastEventId: events.length > 0 ? events[0].id : lastEventId,
      eventType,
      note: 'Using polling fallback. For true SSE, implement custom server with ReadableStream.'
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}


