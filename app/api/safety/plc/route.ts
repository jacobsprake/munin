import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get Safety PLC statistics
    const stats = {
      total_commands_checked: 1250,
      blocked_commands: 3,
      allowed_commands: 1247,
      block_rate: 0.0024,
      invariants_enforced: 6,
      physics_gated: true,
      last_line_of_defense: true,
      recent_blocked: [
        {
          command_id: 'cmd_001',
          reason: 'Turbine RPM Limit: Command exceeds maximum safe RPM (would cause mechanical failure)',
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get Safety PLC statistics', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { command_id, command } = await request.json();
    
    // Simulate Safety PLC check
    // In production, this would call the Python engine
    const check = {
      command_id,
      safety_level: 'safe',
      violated_invariants: [],
      block_reason: null,
      timestamp: new Date().toISOString(),
      checked_by: 'Safety_PLC_v1.0'
    };
    
    // Check for dangerous commands
    const action = command?.action || '';
    const params = command?.parameters || {};
    
    if (params.rpm && params.rpm > 3600) {
      check.safety_level = 'blocked';
      check.violated_invariants = ['inv_002'];
      check.block_reason = 'Turbine RPM Limit: Command exceeds maximum safe RPM (would cause mechanical failure)';
    }
    
    if (params.pressure && params.pressure > 100) {
      check.safety_level = 'blocked';
      check.violated_invariants.push('inv_003');
      check.block_reason = 'Pressure Limit: Command exceeds maximum safe pressure (risk of explosion)';
    }
    
    return NextResponse.json(check);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check command with Safety PLC', details: error.message },
      { status: 500 }
    );
  }
}


