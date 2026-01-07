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

    if (action === 'status') {
      // Get mesh network status
      const meshPath = join(process.cwd(), 'engine', 'out', 'mesh_network.json');
      
      try {
        const meshData = await readFile(meshPath, 'utf-8');
        const mesh = JSON.parse(meshData);
        return NextResponse.json({
          status: 'ok',
          mesh: mesh.networkStatus || {},
          nodes: mesh.nodes || []
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json({
            status: 'not_initialized',
            message: 'Mesh network not initialized'
          });
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get mesh status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'initialize') {
      // Initialize mesh network from graph
      const scriptPath = join(process.cwd(), 'engine', 'sovereign_mesh.py');
      const outDir = join(process.cwd(), 'engine', 'out');
      
      // Run Python script to create mesh network
      const { stdout, stderr } = await execAsync(
        `python3 "${scriptPath}"`,
        { cwd: process.cwd() }
      );

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Mesh network initialized',
        output: stdout
      });
    }

    if (action === 'send_message') {
      // Send message through mesh
      const { sourceNodeId, targetNodeId, payload } = params;
      
      // In production, this would interface with actual mesh hardware
      // For demo, we'll simulate message sending
      return NextResponse.json({
        status: 'ok',
        messageId: `msg_${Date.now()}`,
        source: sourceNodeId,
        target: targetNodeId,
        payload,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process mesh request' },
      { status: 500 }
    );
  }
}

