/**
 * GET /api/search - Global search across all entities
 * Air-gapped compliant: database-only search, no external services
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const entityType = searchParams.get('type'); // 'all', 'incidents', 'packets', 'decisions', 'nodes'
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        count: 0
      });
    }

    const db = getDb();
    const results: any[] = [];
    const searchTerm = `%${query}%`;

    // Search incidents
    if (!entityType || entityType === 'all' || entityType === 'incidents') {
      const incidents = db.prepare(`
        SELECT id, title, type, start_ts, created_at
        FROM incidents
        WHERE title LIKE ? OR id LIKE ? OR type LIKE ?
        LIMIT ?
      `).all(searchTerm, searchTerm, searchTerm, limit) as any[];
      
      results.push(...incidents.map(i => ({
        type: 'incident',
        id: i.id,
        title: i.title,
        subtitle: i.type,
        timestamp: i.start_ts || i.created_at,
        url: `/simulation?incident=${i.id}`
      })));
    }

    // Search packets
    if (!entityType || entityType === 'all' || entityType === 'packets') {
      const packets = db.prepare(`
        SELECT id, situation_summary, proposed_action, status, created_ts
        FROM handshake_packets
        WHERE id LIKE ? OR situation_summary LIKE ? OR proposed_action LIKE ?
        LIMIT ?
      `).all(searchTerm, searchTerm, searchTerm, limit) as any[];
      
      results.push(...packets.map(p => ({
        type: 'packet',
        id: p.id,
        title: p.situation_summary?.substring(0, 60) || p.id,
        subtitle: p.status,
        timestamp: p.created_ts,
        url: `/handshakes?packet=${p.id}`
      })));
    }

    // Search decisions
    if (!entityType || entityType === 'all' || entityType === 'decisions') {
      const decisions = db.prepare(`
        SELECT decision_id, incident_id, playbook_id, status, created_at
        FROM decisions
        WHERE decision_id LIKE ? OR incident_id LIKE ? OR playbook_id LIKE ?
        LIMIT ?
      `).all(searchTerm, searchTerm, searchTerm, limit) as any[];
      
      results.push(...decisions.map(d => ({
        type: 'decision',
        id: d.decision_id,
        title: `Decision for ${d.incident_id}`,
        subtitle: d.status,
        timestamp: d.created_at,
        url: `/decisions?decision=${d.decision_id}`
      })));
    }

    // Search nodes
    if (!entityType || entityType === 'all' || entityType === 'nodes') {
      const nodes = db.prepare(`
        SELECT id, label, sector, kind, region
        FROM nodes
        WHERE id LIKE ? OR label LIKE ? OR sector LIKE ? OR kind LIKE ?
        LIMIT ?
      `).all(searchTerm, searchTerm, searchTerm, searchTerm, limit) as any[];
      
      results.push(...nodes.map(n => ({
        type: 'node',
        id: n.id,
        title: n.label || n.id,
        subtitle: `${n.sector} • ${n.kind}`,
        timestamp: null,
        url: `/graph?node=${n.id}`
      })));
    }

    // Sort by relevance (simple: exact match first, then contains)
    results.sort((a, b) => {
      const aExact = a.id.toLowerCase() === query.toLowerCase() || a.title.toLowerCase().includes(query.toLowerCase());
      const bExact = b.id.toLowerCase() === query.toLowerCase() || b.title.toLowerCase().includes(query.toLowerCase());
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      results: results.slice(0, limit),
      count: results.length,
      query
    });
  } catch (error: any) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search' },
      { status: 500 }
    );
  }
}
