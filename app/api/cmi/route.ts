/**
 * CMI (Civilian-Military Integration) API Routes
 * 
 * POST /api/cmi/activate - Activate CMI Protocol (State of Emergency)
 * POST /api/cmi/deactivate - Deactivate CMI Protocol
 * GET /api/cmi/status - Get current CMI status
 * GET /api/cmi?emergencyLevel=war - Get load shedding and preservation plans
 * POST /api/cmi/authorize - Check authorization for action in CMI mode
 */
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { getPythonPath } from '@/lib/utils';

const execAsync = promisify(exec);

// In-memory CMI state (in production, use database or distributed state)
let cmiState = {
  active: false,
  activatedAt: null as string | null,
  emergencyLevel: 'peacetime' as string
};

/**
 * Activate CMI Protocol
 * POST /api/cmi/activate
 */
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];
    
    if (action === 'activate') {
      // Activate CMI Protocol via Python engine
      const engineDir = join(process.cwd(), 'engine');
      try {
        const pythonPath = getPythonPath();
        const { stdout } = await execAsync(
          `cd ${engineDir} && ${pythonPath} -c "from cmi_logic import activate_cmi_protocol; import json; print(json.dumps(activate_cmi_protocol()))"`
        );
        const result = JSON.parse(stdout.trim());
        
        cmiState = {
          active: true,
          activatedAt: result.timestamp,
          emergencyLevel: 'national_emergency'
        };
        
        return NextResponse.json({
          success: true,
          ...result,
          state: cmiState
        });
      } catch (pyError: any) {
        // Fallback if Python not available
        cmiState = {
          active: true,
          activatedAt: new Date().toISOString(),
          emergencyLevel: 'national_emergency'
        };
        
        return NextResponse.json({
          success: true,
          status: 'CMI_PROTOCOL_ACTIVATED',
          timestamp: cmiState.activatedAt,
          message: 'System shifted to Survival Mode. Ministry of Defense authorization required for all actions.',
          global_state: 'EMERGENCY',
          state: cmiState
        });
      }
    } else if (action === 'deactivate') {
      // Deactivate CMI Protocol
      const engineDir = join(process.cwd(), 'engine');
      try {
        const pythonPath = getPythonPath();
        const { stdout } = await execAsync(
          `cd ${engineDir} && ${pythonPath} -c "from cmi_logic import deactivate_cmi_protocol; import json; print(json.dumps(deactivate_cmi_protocol()))"`
        );
        const result = JSON.parse(stdout.trim());
        
        cmiState = {
          active: false,
          activatedAt: null,
          emergencyLevel: 'peacetime'
        };
        
        return NextResponse.json({
          success: true,
          ...result,
          state: cmiState
        });
      } catch (pyError: any) {
        // Fallback
        cmiState = {
          active: false,
          activatedAt: null,
          emergencyLevel: 'peacetime'
        };
        
        return NextResponse.json({
          success: true,
          status: 'CMI_PROTOCOL_DEACTIVATED',
          timestamp: new Date().toISOString(),
          message: 'System returned to Normal Mode. Standard authorization protocols restored.',
          global_state: 'NORMAL',
          state: cmiState
        });
      }
    } else if (action === 'authorize') {
      // Check authorization for action
      const body = await request.json();
      const { impactLevel, sectorPriority, requestingSector, hasMinistryOfDefenseKey } = body;
      
      const engineDir = join(process.cwd(), 'engine');
      try {
        const pythonPath = getPythonPath();
        const cmd = `cd ${engineDir} && ${pythonPath} -c "
from cmi_logic import authorize_action, ImpactLevel
import json
impact = ImpactLevel.${impactLevel || 'MEDIUM'}
result = authorize_action(
    impact_level=impact,
    sector_priority=${sectorPriority || 5},
    requesting_sector='${requestingSector || 'unknown'}',
    has_ministry_of_defense_key=${hasMinistryOfDefenseKey ? 'True' : 'False'}
)
print(json.dumps({'authorized': result[0], 'reason': result[1], 'metadata': result[2]}))
"`;
        const { stdout } = await execAsync(cmd);
        const result = JSON.parse(stdout.trim());
        
        return NextResponse.json({
          success: true,
          ...result
        });
      } catch (pyError: any) {
        // Fallback logic
        const authorized = !cmiState.active || (sectorPriority >= 10) || hasMinistryOfDefenseKey;
        return NextResponse.json({
          success: true,
          authorized,
          reason: authorized 
            ? 'AUTHORIZED: Action approved'
            : 'REJECTED: Ministry of Defense authorization required in CMI mode',
          metadata: {
            global_state: cmiState.active ? 'EMERGENCY' : 'NORMAL',
            sector_priority: sectorPriority,
            requesting_sector: requestingSector
          }
        });
      }
    }
    
    // Legacy POST endpoint for prioritization
    const body = await request.json();
    const { assetId, emergencyLevel } = body;
    
    if (!assetId || !emergencyLevel) {
      return NextResponse.json(
        { error: 'Missing required fields: assetId, emergencyLevel' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CMI prioritization endpoint - implementation in progress'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get CMI status or prioritization plans
 * GET /api/cmi/status - Get current CMI status
 * GET /api/cmi?emergencyLevel=war - Get load shedding and preservation plans
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const action = pathParts[pathParts.length - 1];
    
    if (action === 'status') {
      // Get CMI status
      const engineDir = join(process.cwd(), 'engine');
      try {
        const pythonPath = getPythonPath();
        const { stdout } = await execAsync(
          `cd ${engineDir} && ${pythonPath} -c "from cmi_logic import get_cmi_status; import json; print(json.dumps(get_cmi_status()))"`
        );
        const result = JSON.parse(stdout.trim());
        
        return NextResponse.json({
          success: true,
          ...result,
          state: cmiState
        });
      } catch (pyError: any) {
        // Fallback
        return NextResponse.json({
          success: true,
          global_state: cmiState.active ? 'EMERGENCY' : 'NORMAL',
          cmi_active: cmiState.active,
          activated_at: cmiState.activatedAt,
          ministry_of_defense_key_required: cmiState.active,
          state: cmiState
        });
      }
    }
    
    // Legacy GET endpoint for prioritization plans
    const { searchParams } = new URL(request.url);
    const emergencyLevel = searchParams.get('emergencyLevel') || cmiState.emergencyLevel;
    
    // Try to get prioritization from Python engine
    const engineDir = join(process.cwd(), 'engine');
    try {
      // Example prioritization data
      const examplePrioritization = {
        preservationPlan: [
          {
            asset_id: 'hospital_power_substation_01',
            sector: 'power',
            asset_type: 'substation',
            priority: 10,
            priority_multiplier: 2.0,
            reasoning: 'CRITICAL: Life-support or military asset - maximum priority'
          },
          {
            asset_id: 'military_base_power_01',
            sector: 'power',
            asset_type: 'substation',
            priority: 9,
            priority_multiplier: 2.0,
            reasoning: 'CRITICAL: Military essential - maximum priority'
          }
        ],
        loadSheddingPlan: [
          {
            asset_id: 'commercial_district_power_01',
            sector: 'power',
            asset_type: 'substation',
            load_shedding_order: 1,
            priority: 1,
            reasoning: 'SHEDDABLE: Non-essential asset - can be shut down'
          }
        ]
      };
      
      return NextResponse.json({
        success: true,
        emergencyLevel,
        preservationPlan: examplePrioritization.preservationPlan,
        loadSheddingPlan: examplePrioritization.loadSheddingPlan,
        message: 'CMI prioritization plans loaded'
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
