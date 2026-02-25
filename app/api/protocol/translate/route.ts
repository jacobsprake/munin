import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { getPythonPath } from '@/lib/serverUtils';

const execAsync = promisify(exec);

/**
 * POST /api/protocol/translate
 * 
 * Translate a protocol frame into Munin's normalized format.
 * Supports Modbus, DNP3, OPC UA, BACnet, Profibus, IEC 61850.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { protocol, vendor, frame, nodeId, timestamp } = body;

    if (!protocol || !frame) {
      return NextResponse.json(
        { error: 'Missing required fields: protocol, frame' },
        { status: 400 }
      );
    }

    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();

    // Create translation request
    const translationRequest = {
      protocol,
      vendor: vendor || null,
      frame: {
        ...frame,
        timestamp: timestamp || new Date().toISOString(),
      },
      node_id: nodeId || `node_${Date.now()}`,
      timestamp: timestamp || new Date().toISOString(),
    };

    const requestPath = join(engineDir, 'out', 'protocol_translation_request.json');
    await writeFile(requestPath, JSON.stringify(translationRequest, null, 2), 'utf-8');

    // Run Python protocol translator
    const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from protocol_translator import ProtocolTranslator
import json
from datetime import datetime

request = json.load(open('${requestPath}'))
translator = ProtocolTranslator(request['protocol'], vendor=request.get('vendor'))

timestamp = datetime.fromisoformat(request['timestamp'])
result = translator.translate_frame(
    frame=request['frame'],
    node_id=request['node_id'],
    timestamp=timestamp
)

print(json.dumps(result))
"`;

    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout.trim());

    return NextResponse.json({
      success: true,
      normalized: result,
      protocol,
      vendor: vendor || 'auto-detected',
    });
  } catch (error: any) {
    console.error('Protocol translation error:', error);
    return NextResponse.json(
      { error: 'Protocol translation failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/protocol/translate
 * 
 * Get supported protocols and their capabilities.
 */
export async function GET(request: NextRequest) {
  try {
    const engineDir = join(process.cwd(), 'engine');
    const pythonPath = getPythonPath();

    const command = `cd ${engineDir} && ${pythonPath} -c "
import sys
from pathlib import Path
sys.path.insert(0, str(Path('${engineDir}').absolute()))
from protocol_translator import PROTOCOL_DRIVERS, VENDOR_PROTOCOL_MAP
import json

print(json.dumps({
    'protocols': PROTOCOL_DRIVERS,
    'vendorMap': {k: v for k, v in VENDOR_PROTOCOL_MAP.items()}
}))
"`;

    const { stdout } = await execAsync(command);
    const protocols = JSON.parse(stdout.trim());

    return NextResponse.json({
      success: true,
      ...protocols,
    });
  } catch (error: any) {
    console.error('Failed to get protocol info:', error);
    return NextResponse.json(
      { error: 'Failed to get protocol information', details: error.message },
      { status: 500 }
    );
  }
}
