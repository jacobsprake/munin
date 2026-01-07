/**
 * Wide-Bandgap Edge Hardware API
 * 2026 End-State Feature: Materials Science Moat
 * 
 * Manages wide-bandgap edge nodes (GaN/SiC) that can survive extreme environments.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const environment = searchParams.get('environment');

    // In production, this would query the Python wide-bandgap edge engine
    // For now, return simulated data
    
    const nodes = [
      {
        nodeId: 'edge_gan_grid_001',
        semiconductorType: 'gan',
        operatingEnvironment: 'high_voltage_grid',
        maxOperatingTemperature: 200.0,
        maxOperatingVoltage: 12000.0,
        operationalStatus: 'online',
        location: { lat: 40.7128, lon: -74.0060 }
      },
      {
        nodeId: 'edge_sic_aero_001',
        semiconductorType: 'sic',
        operatingEnvironment: 'aerospace_engine',
        maxOperatingTemperature: 600.0,
        maxOperatingVoltage: 1200.0,
        operationalStatus: 'online',
        location: { lat: 34.0522, lon: -118.2437 }
      }
    ];

    let filteredNodes = nodes;
    if (nodeId) {
      filteredNodes = nodes.filter(n => n.nodeId === nodeId);
    }
    if (environment) {
      filteredNodes = filteredNodes.filter(n => n.operatingEnvironment === environment);
    }

    return NextResponse.json({
      success: true,
      nodes: filteredNodes,
      networkStatus: {
        totalNodes: nodes.length,
        operationalNodes: nodes.filter(n => n.operationalStatus === 'online').length,
        reliabilityScore: 1.0
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get edge hardware' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, temperature, voltage } = body;

    if (!nodeId || temperature === undefined || voltage === undefined) {
      return NextResponse.json(
        { error: 'nodeId, temperature, and voltage are required' },
        { status: 400 }
      );
    }

    // In production, this would record environmental readings in the Python engine
    // For now, simulate
    
    return NextResponse.json({
      success: true,
      message: 'Environmental reading recorded',
      nodeId,
      canOperate: temperature <= 200 && voltage <= 12000,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to record environmental reading' },
      { status: 500 }
    );
  }
}

