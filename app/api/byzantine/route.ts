/**
 * Byzantine Multi-Sig API
 * Endpoints for managing decentralized multi-signature requirements
 * for high-consequence actions (treason-proofing).
 */

import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getPythonPath } from '@/lib/utils';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { action, packetId, ministry, signerId, publicKey, signature, location, ministrySeal } = await request.json();
    
    if (action === 'add_signature') {
      if (!packetId || !ministry || !signerId || !publicKey || !signature || !location || !ministrySeal) {
        return NextResponse.json(
          { error: 'Missing required fields for adding signature' },
          { status: 400 }
        );
      }
      
      // Call Python engine to add ministry signature
      const scriptPath = join(process.cwd(), 'engine', 'byzantine_resilience.py');
      const pythonPath = getPythonPath();
      const command = `${pythonPath} "${scriptPath}" add_signature "${packetId}" "${ministry}" "${signerId}" "${publicKey}" "${signature}" "${location}" "${ministrySeal}"`;
      
      try {
        const { stdout, stderr } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        return NextResponse.json({
          success: true,
          authorized: result.authorized,
          signaturesReceived: result.signaturesReceived,
          thresholdRequired: result.thresholdRequired,
          ministriesSigned: result.ministriesSigned,
          ministriesMissing: result.ministriesMissing
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to add signature: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const packetId = searchParams.get('packetId');
    const action = searchParams.get('action');
    
    if (action === 'verify') {
      if (!packetId) {
        return NextResponse.json({ error: 'Missing packetId' }, { status: 400 });
      }
      
      // Call Python engine to verify authorization
      const scriptPath = join(process.cwd(), 'engine', 'byzantine_resilience.py');
      const pythonPath = getPythonPath();
      const command = `${pythonPath} "${scriptPath}" verify "${packetId}"`;
      
      try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        return NextResponse.json(result);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to verify: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    if (action === 'pending') {
      // Get all pending actions requiring signatures
      const scriptPath = join(process.cwd(), 'engine', 'byzantine_resilience.py');
      const pythonPath = getPythonPath();
      const command = `${pythonPath} "${scriptPath}" pending`;
      
      try {
        const { stdout } = await execAsync(command);
        const result = JSON.parse(stdout);
        
        return NextResponse.json(result);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to get pending actions: ${error.message}` },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


