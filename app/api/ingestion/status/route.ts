/**
 * GET /api/ingestion/status
 *
 * Returns the status of all data ingestion sources — which connectors
 * are active, last data received, data freshness, and quality metrics.
 *
 * This is the "data heartbeat" dashboard for operators.
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // Get latest reading per node
    const latestReadings = db.prepare(`
      SELECT node_id, 
             MAX(timestamp) as last_reading,
             COUNT(*) as total_readings,
             AVG(value) as avg_value,
             MIN(value) as min_value,
             MAX(value) as max_value
      FROM sensor_readings
      GROUP BY node_id
      ORDER BY node_id
    `).all() as any[];

    // Get ingestion stats from last 24 hours
    const recentStats = db.prepare(`
      SELECT COUNT(*) as readings_24h,
             COUNT(DISTINCT node_id) as active_nodes_24h
      FROM sensor_readings
      WHERE timestamp > datetime('now', '-24 hours')
    `).get() as any;

    // Get graph nodes for comparison
    const graphNodes = db.prepare(`
      SELECT id, sector, health_status FROM nodes
    `).all() as any[];

    // Build source status
    const sources = latestReadings.map((r: any) => {
      const lastTs = new Date(r.last_reading);
      const ageMinutes = (Date.now() - lastTs.getTime()) / 60000;

      let freshness: 'live' | 'stale' | 'dead';
      if (ageMinutes < 5) freshness = 'live';
      else if (ageMinutes < 60) freshness = 'stale';
      else freshness = 'dead';

      return {
        nodeId: r.node_id,
        lastReading: r.last_reading,
        totalReadings: r.total_readings,
        avgValue: r.avg_value,
        minValue: r.min_value,
        maxValue: r.max_value,
        freshness,
        ageMinutes: Math.round(ageMinutes),
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalSources: latestReadings.length,
        activeLast24h: recentStats?.active_nodes_24h || 0,
        readingsLast24h: recentStats?.readings_24h || 0,
        graphNodes: graphNodes.length,
      },
      sources,
      connectors: {
        note: 'Configure connectors in config/connectors.yaml. See docs/SCADA_INGESTION_GUIDE.md.',
        supportedProtocols: [
          'modbus_tcp', 'modbus_rtu', 'dnp3', 'profibus',
          'bacnet', 'opc_ua', 'iec61850', 'snmp',
          'csv_historian', 'pi_historian', 'rest_api',
        ],
      },
    });
  } catch (error: any) {
    console.error('Error fetching ingestion status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
