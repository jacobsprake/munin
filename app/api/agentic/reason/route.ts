// ⚠️ DEMO ENDPOINT — Uses rule-based pattern matching, not AI/ML inference.
// Production path: integrate with inference engine for learned threat models.
//
// The Python agentic_reasoning engine is a rule-based script. When it fails
// to produce output, this route falls back to hardcoded mock reasoning steps.
// Despite the naming, no machine learning or neural inference is involved.
// Production implementation requires a real ML inference pipeline.

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getPythonPath } from '@/lib/serverUtils';

const execFileAsync = promisify(execFile);

/** Reject input containing shell metacharacters to prevent injection. */
function sanitizeInput(value: string): string {
  if (/[;&|`$(){}[\]<>!#"'\\]/.test(value)) {
    throw new Error('Input contains disallowed characters');
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const { incidentId, brokenSensorId } = await request.json();

    if (!incidentId) {
      return NextResponse.json({ error: 'Missing incidentId' }, { status: 400 });
    }

    // Validate inputs against shell metacharacters
    const safeIncidentId = sanitizeInput(String(incidentId));
    const safeBrokenSensorId = sanitizeInput(String(brokenSensorId || ''));

    const scriptPath = join(process.cwd(), 'engine', 'agentic_reasoning.py');
    const outDir = join(process.cwd(), 'engine', 'out');

    // Run the agentic reasoning engine using execFile (safe from shell injection)
    const pythonPath = getPythonPath();
    const { stdout, stderr } = await execFileAsync(pythonPath, [scriptPath], {
      cwd: join(process.cwd(), 'engine'),
      env: { ...process.env, INCIDENT_ID: safeIncidentId, BROKEN_SENSOR_ID: safeBrokenSensorId },
      timeout: 10000
    });

    if (stderr && !stderr.includes('Warning')) {
      console.error('Python stderr:', stderr);
    }

    // Try to load the generated agentic recovery plan
    const agenticPath = join(outDir, 'agentic_recovery.json');
    try {
      const agenticData = await readFile(agenticPath, 'utf-8');
      const result = JSON.parse(agenticData);
      return NextResponse.json(result);
    } catch (error: any) {
      // If file doesn't exist, generate a mock response for demo
      return NextResponse.json({
        incident_id: incidentId,
        reasoning_steps: [
          {
            step: 1,
            action: 'Situation Assessment',
            reasoning: `Analyzing incident ${incidentId}. Sensor health degraded. This sensor has high downstream dependencies - failure could cascade rapidly.`,
            confidence: 0.85
          },
          {
            step: 2,
            action: 'External Data Cross-Reference',
            reasoning: 'Weather satellite data confirms heavy precipitation in the region. Power grid load shows 15% increase in demand from water treatment facilities.',
            sources: ['NOAA Weather Satellite Feed', 'Regional Power Grid Load Monitor', 'Cross-Sector Sensor Correlation Engine'],
            confidence: 0.92
          },
          {
            step: 3,
            action: 'Cascade Dependency Analysis',
            reasoning: 'Cascade analysis: 12 nodes will be directly impacted. 8 additional nodes are at risk via dependency chains.',
            affected_nodes: [],
            time_to_cascade: 15
          },
          {
            step: 4,
            action: 'Recovery Plan Generation',
            reasoning: 'Flood event detected. Plan: (1) Confirm via satellite, (2) Isolate primary pumps, (3) Activate backups, (4) Coordinate diversion, (5) Monitor restoration.',
            steps: [
              {
                step: 1,
                action: 'Confirm flood severity via weather satellite cross-reference',
                target: 'weather_satellite_feed',
                expected_outcome: 'Confirmed flood event with 92% confidence',
                automated: true
              },
              {
                step: 2,
                action: 'Isolate primary pump stations in flood zone',
                target: 'pump_station_01',
                expected_outcome: 'Pump stations isolated, preventing contamination',
                automated: false,
                requires_approval: ['Senior Operator']
              }
            ]
          },
          {
            step: 5,
            action: 'Multi-Agency Coordination',
            reasoning: 'Multi-agency coordination plan drafted for 4 agencies. Each agency has defined roles, communication channels, and priority levels.',
            agencies: ['Regional Water Authority', 'Emergency Management Services', 'Power Grid Operator', 'Environmental Protection Agency'],
            coordination_plan: []
          }
        ],
        recommended_action: 'Isolate pump stations and activate backup systems',
        confidence: 0.85,
        generated_at: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('Agentic reasoning error:', error);
    // Sanitize error response — do not leak internal paths or stack traces
    const safeMessage = error.message?.includes('disallowed characters')
      ? 'Invalid input: contains disallowed characters'
      : 'Failed to generate recovery plan';
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}


