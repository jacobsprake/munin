/**
 * GET /api/export - Export data (incidents, packets, decisions, audit logs)
 * Air-gapped compliant: local generation only, no cloud upload
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'incidents', 'packets', 'decisions', 'audit', 'all'
    const format = searchParams.get('format') || 'json'; // 'json', 'csv'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const db = getDb();
    const exports: Record<string, any> = {};

    // Export incidents
    if (!type || type === 'all' || type === 'incidents') {
      let query = 'SELECT * FROM incidents WHERE 1=1';
      const params: any[] = [];
      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }
      const incidents = db.prepare(query).all(...params) as any[];
      exports.incidents = incidents;
    }

    // Export packets
    if (!type || type === 'all' || type === 'packets') {
      let query = 'SELECT * FROM handshake_packets WHERE 1=1';
      const params: any[] = [];
      if (startDate) {
        query += ' AND created_ts >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND created_ts <= ?';
        params.push(endDate);
      }
      const packets = db.prepare(query).all(...params) as any[];
      exports.packets = packets.map(p => ({
        ...p,
        scope: typeof p.scope === 'string' ? JSON.parse(p.scope) : p.scope,
        evidence_refs: typeof p.evidence_refs === 'string' ? JSON.parse(p.evidence_refs) : p.evidence_refs,
        uncertainty: typeof p.uncertainty === 'string' ? JSON.parse(p.uncertainty) : p.uncertainty,
        approvals: typeof p.approvals === 'string' ? JSON.parse(p.approvals) : p.approvals,
        provenance: typeof p.provenance === 'string' ? JSON.parse(p.provenance) : p.provenance,
      }));
    }

    // Export decisions
    if (!type || type === 'all' || type === 'decisions') {
      let query = 'SELECT * FROM decisions WHERE 1=1';
      const params: any[] = [];
      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }
      const decisions = db.prepare(query).all(...params) as any[];
      exports.decisions = decisions.map(d => ({
        ...d,
        policy_json: typeof d.policy_json === 'string' ? JSON.parse(d.policy_json) : d.policy_json,
      }));
    }

    // Export audit log
    if (!type || type === 'all' || type === 'audit') {
      let query = 'SELECT * FROM audit_log WHERE 1=1';
      const params: any[] = [];
      if (startDate) {
        query += ' AND ts >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND ts <= ?';
        params.push(endDate);
      }
      query += ' ORDER BY ts ASC';
      const auditLog = db.prepare(query).all(...params) as any[];
      exports.audit_log = auditLog.map(a => ({
        ...a,
        payload_json: typeof a.payload_json === 'string' ? JSON.parse(a.payload_json) : a.payload_json,
      }));
    }

    // Format response
    if (format === 'csv') {
      // Simple CSV conversion (in production, use proper CSV library)
      const csvLines: string[] = [];
      for (const [key, data] of Object.entries(exports)) {
        if (Array.isArray(data) && data.length > 0) {
          csvLines.push(`\n=== ${key.toUpperCase()} ===\n`);
          const headers = Object.keys(data[0]).join(',');
          csvLines.push(headers);
          for (const row of data) {
            const values = Object.values(row).map(v => {
              if (typeof v === 'object') return JSON.stringify(v);
              return String(v).replace(/,/g, ';');
            }).join(',');
            csvLines.push(values);
          }
        }
      }
      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="munin-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // JSON format (default)
    return NextResponse.json({
      success: true,
      exported_at: new Date().toISOString(),
      type,
      format,
      data: exports,
      counts: Object.fromEntries(
        Object.entries(exports).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      )
    });
  } catch (error: any) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    );
  }
}
