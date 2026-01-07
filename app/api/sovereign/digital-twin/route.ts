import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'status';
    const simulationId = searchParams.get('simulationId');

    if (action === 'status') {
      // Get digital twin status
      const twinPath = join(process.cwd(), 'engine', 'out', 'digital_twin.json');
      
      try {
        const twinData = await readFile(twinPath, 'utf-8');
        const twin = JSON.parse(twinData);
        return NextResponse.json({
          status: 'ok',
          twin: twin
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json({
            status: 'not_initialized',
            message: 'Digital twin not initialized'
          });
        }
        throw error;
      }
    }

    if (action === 'simulation' && simulationId) {
      // Get simulation result
      const simPath = join(process.cwd(), 'engine', 'out', 'simulations', `${simulationId}.json`);
      
      try {
        const simData = await readFile(simPath, 'utf-8');
        const simulation = JSON.parse(simData);
        return NextResponse.json({
          status: 'ok',
          simulation
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
        }
        throw error;
      }
    }

    if (action === 'audit_report') {
      // Get resilience audit report
      const reportPath = join(process.cwd(), 'engine', 'out', 'resilience_audit.json');
      
      try {
        const reportData = await readFile(reportPath, 'utf-8');
        const report = JSON.parse(reportData);
        return NextResponse.json({
          status: 'ok',
          report
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json({
            status: 'not_available',
            message: 'Audit report not available'
          });
        }
        throw error;
      }
    }

    if (action === 'living_replay') {
      const replayId = searchParams.get('replayId');
      
      if (replayId) {
        // Get specific living replay
        const replayPath = join(process.cwd(), 'engine', 'out', 'replays', `${replayId}.json`);
        
        try {
          const replayData = await readFile(replayPath, 'utf-8');
          const replay = JSON.parse(replayData);
          return NextResponse.json({
            status: 'ok',
            replay
          });
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'Living replay not found' }, { status: 404 });
          }
          throw error;
        }
      }

      // List all living replays
      return NextResponse.json({
        status: 'ok',
        replays: []
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get digital twin status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'initialize') {
      // Initialize digital twin from graph
      const { graphData } = params;
      
      if (!graphData) {
        return NextResponse.json(
          { error: 'Missing graphData' },
          { status: 400 }
        );
      }

      // In production, would create digital twin from graph
      return NextResponse.json({
        status: 'ok',
        twinId: `twin_${Date.now()}`,
        message: 'Digital twin initialized',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'run_simulation') {
      // Run stress test simulation
      const {
        scenarioType,
        name,
        description,
        failureNodes,
        cascadeDepth,
        severity
      } = params;
      
      if (!scenarioType || !failureNodes || !Array.isArray(failureNodes)) {
        return NextResponse.json(
          { error: 'Missing required scenario parameters' },
          { status: 400 }
        );
      }

      // In production, would run actual simulation
      const simulationId = `sim_${Date.now()}`;
      
      return NextResponse.json({
        status: 'ok',
        simulationId,
        scenario: {
          type: scenarioType,
          name: name || 'Stress Test',
          failureNodes,
          cascadeDepth: cascadeDepth || 3,
          severity: severity || 1.0
        },
        started: true,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'generate_audit_report') {
      // Generate National Resilience Audit report
      const scriptPath = join(process.cwd(), 'engine', 'sovereign_digital_twin.py');
      
      // Run Python script to generate audit report
      const { stdout, stderr } = await execAsync(
        `python3 "${scriptPath}"`,
        { cwd: process.cwd() }
      );

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Resilience audit report generated',
        output: stdout
      });
    }

    if (action === 'create_living_replay') {
      // Create Living Replay with Shadow-Link data
      const {
        replayId,
        scenarioType,
        name,
        description,
        failureNodes,
        cascadeDepth,
        severity,
        useShadowLinks
      } = params;

      if (!replayId || !scenarioType || !failureNodes) {
        return NextResponse.json(
          { error: 'Missing required parameters: replayId, scenarioType, failureNodes' },
          { status: 400 }
        );
      }

      // In production, would create living replay with Shadow-Link enhancement
      return NextResponse.json({
        status: 'ok',
        replayId,
        scenario: {
          type: scenarioType,
          name: name || 'Living Replay',
          failureNodes,
          cascadeDepth: cascadeDepth || 3,
          severity: severity || 1.0
        },
        fidelity: useShadowLinks ? 'high' : 'standard',
        shadowLinksUsed: useShadowLinks ? 1 : 0,
        message: 'Living replay created',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process digital twin request' },
      { status: 500 }
    );
  }
}

