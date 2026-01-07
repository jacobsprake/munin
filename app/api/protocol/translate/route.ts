import { NextRequest, NextResponse } from 'next/server';
import { ProtocolFrame, ProtocolConnectorConfig } from '@/lib/types';

/**
 * Protocol Translator API
 * Universal OT-to-Graph Connectors
 * 
 * Endpoint for translating legacy industrial protocol data into Munin's
 * unified graph format. Supports Modbus, DNP3, Profibus, BacNet, OPC UA, IEC 61850.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frames, protocol, vendor, nodeMapping } = body;

    if (!frames || !Array.isArray(frames)) {
      return NextResponse.json(
        { error: 'Invalid request: frames array required' },
        { status: 400 }
      );
    }

    // In production, this would call the Python protocol_translator module
    // For now, return a mock response showing the structure
    const translated = frames.map((frame: ProtocolFrame, index: number) => ({
      node_id: nodeMapping?.[frame.address] || `node_${frame.address}`,
      timestamp: frame.timestamp,
      value: parseFloat(frame.payload) || 0,
      metadata: {
        protocol: protocol || frame.protocol,
        address: frame.address,
        functionCode: frame.functionCode,
        dataType: 'holding_register', // Would be inferred in real implementation
        quality: frame.retries && frame.retries > 0 ? 'degraded' : 'good',
        vendor: vendor || frame.vendor || 'unknown',
        rawHex: frame.hex?.substring(0, 32),
      },
    }));

    return NextResponse.json({
      success: true,
      translated: translated,
      protocol: protocol || 'auto-detected',
      vendor: vendor || 'unknown',
      count: translated.length,
    });
  } catch (error) {
    console.error('Protocol translation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get supported protocols and vendors
 */
export async function GET() {
  return NextResponse.json({
    protocols: [
      {
        name: 'modbus',
        vendors: ['Siemens', 'Schneider', 'Honeywell', 'Allen-Bradley', 'ABB'],
        dataTypes: ['holding_register', 'input_register', 'coil', 'discrete_input'],
      },
      {
        name: 'dnp3',
        vendors: ['Schweitzer Engineering', 'GE', 'ABB', 'Siemens'],
        dataTypes: ['analog_input', 'binary_input', 'counter', 'analog_output', 'binary_output'],
      },
      {
        name: 'profibus',
        vendors: ['Siemens', 'ABB', 'Phoenix Contact', 'Endress+Hauser'],
        dataTypes: ['input', 'output', 'diagnostic'],
      },
      {
        name: 'bacnet',
        vendors: ['Johnson Controls', 'Honeywell', 'Siemens', 'Schneider'],
        dataTypes: ['analog_input', 'analog_output', 'binary_input', 'binary_output', 'multistate'],
      },
      {
        name: 'opc_ua',
        vendors: ['Siemens', 'Rockwell', 'Schneider', 'ABB', 'Honeywell'],
        dataTypes: ['variable', 'method', 'object'],
      },
      {
        name: 'iec61850',
        vendors: ['Siemens', 'ABB', 'GE', 'Schweitzer Engineering'],
        dataTypes: ['data_attribute', 'data_object', 'logical_node'],
      },
    ],
    message: 'Munin Protocol Translator - Universal OT-to-Graph Connectors. Zero-Rip-and-Replace architecture.',
  });
}

