/**
 * GET /api/replay - Historical replay & comparison
 * Air-gapped compliant: all data from internal database
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get('incidentId');
    const compareWith = searchParams.get('compareWith'); // Compare with another incident
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = getDb();

    if (incidentId) {
      // Replay specific incident
      const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId) as any;
      if (!incident) {
        return NextResponse.json(
          { error: 'Incident not found' },
          { status: 404 }
        );
      }

      // Get related packets
      const packets = db.prepare(`
        SELECT * FROM handshake_packets
        WHERE incident_id = ?
        ORDER BY created_ts ASC
      `).all(incidentId) as any[];

      // Get related decisions
      const decisions = db.prepare(`
        SELECT * FROM decisions
        WHERE incident_id = ?
        ORDER BY created_at ASC
      `).all(incidentId) as any[];

      // Get timeline of events
      const timeline = [
        ...packets.map(p => ({
          timestamp: p.created_ts,
          type: 'packet',
          id: p.id,
          event: 'Handshake packet generated',
          data: p
        })),
        ...decisions.map(d => ({
          timestamp: d.created_at,
          type: 'decision',
          id: d.decision_id,
          event: `Decision ${d.status}`,
          data: d
        }))
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const replay = {
        incident,
        packets,
        decisions,
        timeline,
        duration_seconds: timeline.length > 0
          ? (new Date(timeline[timeline.length - 1].timestamp).getTime() - new Date(timeline[0].timestamp).getTime()) / 1000
          : 0
      };

      // If comparing with another incident
      if (compareWith) {
        const compareIncident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(compareWith) as any;
        if (compareIncident) {
          const comparePackets = db.prepare(`
            SELECT * FROM handshake_packets
            WHERE incident_id = ?
            ORDER BY created_ts ASC
          `).all(compareWith) as any[];

          const compareDecisions = db.prepare(`
            SELECT * FROM decisions
            WHERE incident_id = ?
            ORDER BY created_at ASC
          `).all(compareWith) as any[];

          const compareTimeline = [
            ...comparePackets.map(p => ({
              timestamp: p.created_ts,
              type: 'packet',
              id: p.id,
              event: 'Handshake packet generated',
              data: p
            })),
            ...compareDecisions.map(d => ({
              timestamp: d.created_at,
              type: 'decision',
              id: d.decision_id,
              event: `Decision ${d.status}`,
              data: d
            }))
          ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          const compareDuration = compareTimeline.length > 0
            ? (new Date(compareTimeline[compareTimeline.length - 1].timestamp).getTime() - new Date(compareTimeline[0].timestamp).getTime()) / 1000
            : 0;

          return NextResponse.json({
            success: true,
            replay,
            comparison: {
              incident: compareIncident,
              packets: comparePackets,
              decisions: compareDecisions,
              timeline: compareTimeline,
              duration_seconds: compareDuration
            },
            differences: {
              duration_difference: replay.duration_seconds - compareDuration,
              packet_count_difference: packets.length - comparePackets.length,
              decision_count_difference: decisions.length - compareDecisions.length
            }
          });
        }
      }

      return NextResponse.json({
        success: true,
        replay
      });
    }

    // List incidents for replay
    let query = 'SELECT id, title, type, start_ts, created_at FROM incidents WHERE 1=1';
    const params: any[] = [];
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const incidents = db.prepare(query).all(...params) as any[];

    return NextResponse.json({
      success: true,
      incidents
    });
  } catch (error: any) {
    console.error('Error replaying incident:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to replay incident' },
      { status: 500 }
    );
  }
}
