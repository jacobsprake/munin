/**
 * POST /api/incidents/check
 * Real-time incident detection: check current state against thresholds,
 * match to pre-simulated scenario, return packet for M-of-N signing.
 *
 * Body: { liveState?: Record<string, number> } — optional; if omitted, uses
 * latest from normalized_timeseries or sensor_readings.
 */
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let liveState: Record<string, number> = body.liveState || {};

    const engineOut = join(process.cwd(), 'engine', 'out');
    const normPath = join(engineOut, 'normalized_timeseries.csv');
    const incidentsPath = join(engineOut, 'incidents.json');
    const packetsDir = join(engineOut, 'packets');

    if (Object.keys(liveState).length === 0 && existsSync(normPath)) {
      const csv = await readFile(normPath, 'utf-8');
      const lines = csv.trim().split('\n');
      if (lines.length >= 2) {
        const headers = lines[0].split(',');
        const lastRow = lines[lines.length - 1].split(',');
        for (let i = 1; i < headers.length; i++) {
          const key = headers[i].trim();
          const val = parseFloat(lastRow[i]);
          if (!isNaN(val)) liveState[key] = val;
        }
      }
    }

    if (Object.keys(liveState).length === 0) {
      const db = getDb();
      const nodes = db.prepare('SELECT DISTINCT node_id FROM sensor_readings').all() as Array<{ node_id: string }>;
      const rows: Array<{ node_id: string; value: number }> = [];
      for (const n of nodes) {
        const r = db.prepare(
          'SELECT value FROM sensor_readings WHERE node_id = ? ORDER BY timestamp DESC LIMIT 1'
        ).get(n.node_id) as { value: number } | undefined;
        if (r) rows.push({ node_id: n.node_id, value: r.value });
      }
      for (const r of rows) liveState[r.node_id] = r.value;
    }

    if (Object.keys(liveState).length === 0) {
      return NextResponse.json({
        success: true,
        breached: [],
        liveMatch: null,
        packet: null,
        message: 'No live state available. Run engine and push sensor data first.',
      });
    }

    const incidents = existsSync(incidentsPath)
      ? JSON.parse(await readFile(incidentsPath, 'utf-8'))
      : { incidents: [] };
    const incList = incidents.incidents || incidents;

    const match = matchLiveToScenario(liveState, incList);
    let packet = null;
    if (match && existsSync(packetsDir)) {
      const packetFiles = await import('fs/promises').then((fs) =>
        fs.readdir(packetsDir).catch(() => [])
      );
      const matchId = match.id || match.incident_id;
      const packetFile = packetFiles.find(
        (f: string) => f.endsWith('.json') && f.includes(matchId as string)
      );
      if (!packetFile) {
        const anyPacket = packetFiles.find((f: string) => f.endsWith('.json'));
        if (anyPacket) {
          packet = JSON.parse(
            await readFile(join(packetsDir, anyPacket), 'utf-8')
          );
        }
      } else {
        packet = JSON.parse(
          await readFile(join(packetsDir, packetFile), 'utf-8')
        );
      }
      if (!packet && match) {
        packet = {
          id: match.id,
          situationSummary: match.situationSummary || 'Pre-simulated scenario matched',
          proposedAction: match.proposedAction || 'Review and authorize',
          playbookId: match.playbook_id || 'flood_event_pump_isolation.yaml',
          status: 'ready',
        };
      }
    }

    const breached = checkThresholds(liveState);

    return NextResponse.json({
      success: true,
      breached,
      liveMatch: match,
      packet,
      liveStateKeys: Object.keys(liveState),
    });
  } catch (error: any) {
    console.error('Incident check failed:', error);
    return NextResponse.json(
      { error: error.message || 'Incident check failed' },
      { status: 500 }
    );
  }
}

function checkThresholds(liveState: Record<string, number>): Array<{
  node_id: string;
  value: number;
  threshold: number;
  condition: string;
}> {
  const triggers: Array<{ node_id: string; threshold: number; condition: string }> = [
    { node_id: 'eden_sands_centre', threshold: 2.5, condition: '>' },
    { node_id: 'eden_river_level', threshold: 2.5, condition: '>' },
    { node_id: 'petteril_botcherby', threshold: 1.8, condition: '>' },
    { node_id: 'petteril_river_level', threshold: 1.8, condition: '>' },
  ];
  const breached: Array<{ node_id: string; value: number; threshold: number; condition: string }> = [];
  for (const t of triggers) {
    const v = liveState[t.node_id];
    if (v == null) continue;
    const met = t.condition === '>' ? v > t.threshold : v >= t.threshold;
    if (met) breached.push({ ...t, value: v });
  }
  return breached;
}

function matchLiveToScenario(
  liveState: Record<string, number>,
  incidents: Array<{ id?: string; timeline?: Array<{ impactedNodeIds?: string[] }> }>
): Record<string, unknown> | null {
  if (!incidents?.length) return null;
  const threshold = 0.5;
  const liveAffected = new Set(
    Object.entries(liveState)
      .filter(([, v]) => typeof v === 'number' && v > threshold)
      .map(([k]) => k)
  );
  let best: (typeof incidents)[0] | null = null;
  let bestScore = -1;
  for (const inc of incidents) {
    const timeline = inc.timeline || [];
    const initial = new Set(timeline[0]?.impactedNodeIds || []);
    let overlap = 0;
    for (const n of initial) {
      if (liveAffected.has(n)) overlap++;
    }
    const score = overlap + (initial.size ? 10 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = inc;
    }
  }
  return best as Record<string, unknown> | null;
}
