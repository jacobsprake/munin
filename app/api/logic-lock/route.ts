/**
 * POST /api/logic-lock
 * Validate command against physics constraints (Logic-Lock)
 *
 * This endpoint validates commands before they are executed, ensuring
 * they don't violate physics constraints. When integrated with TEE,
 * this provides hardware-level enforcement.
 */
import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { getPythonPath } from '@/lib/serverUtils';

const execFileAsync = promisify(execFile);

// Shell metacharacters that must not appear in user input
const SHELL_METACHAR_PATTERN = /[;&|`$(){}[\]!#~<>\\'"*?\n\r]/;

function containsShellMetachars(value: string): boolean {
  return SHELL_METACHAR_PATTERN.test(value);
}

export async function POST(request: Request) {
  try {
    const { command, assetId, assetType } = await request.json();

    if (!command || !assetId || !assetType) {
      return NextResponse.json(
        { error: 'Missing required fields: command, assetId, assetType' },
        { status: 400 }
      );
    }

    // Input validation: reject shell metacharacters
    for (const [field, value] of Object.entries({ command, assetId, assetType })) {
      if (typeof value === 'string' && containsShellMetachars(value)) {
        return NextResponse.json(
          { error: `Invalid characters in field: ${field}` },
          { status: 400 }
        );
      }
    }

    const engineDir = join(process.cwd(), 'engine');
    const scriptPath = join(engineDir, 'logic_lock.py');

    // Create temporary command file
    const commandData = {
      command_id: `cmd_${Date.now()}`,
      asset_id: assetId,
      asset_type: assetType,
      command: command
    };

    const commandPath = join(engineDir, 'out', 'temp_command.json');
    const { writeFile, mkdir } = await import('fs/promises');
    await mkdir(join(engineDir, 'out'), { recursive: true });
    await writeFile(commandPath, JSON.stringify(commandData, null, 2));

    // Run Logic-Lock validation using execFile (no shell interpolation)
    const pythonPath = getPythonPath();
    const pythonScript = `
import sys
from pathlib import Path
sys.path.insert(0, ${JSON.stringify(engineDir)})
from logic_lock import LogicLockEngine, AssetType
import json

command_data = json.load(open(${JSON.stringify(commandPath)}))
engine = LogicLockEngine()

asset_type_map = {
    'turbine': AssetType.TURBINE,
    'pump': AssetType.PUMP,
    'valve': AssetType.VALVE,
    'transformer': AssetType.TRANSFORMER,
    'generator': AssetType.GENERATOR,
    'compressor': AssetType.COMPRESSOR,
    'heat_exchanger': AssetType.HEAT_EXCHANGER,
    'reactor': AssetType.REACTOR
}

asset_type_enum = asset_type_map.get(command_data['asset_type'], AssetType.PUMP)

validation = engine.validate_command(
    command_id=command_data['command_id'],
    asset_id=command_data['asset_id'],
    asset_type=asset_type_enum,
    command=command_data['command']
)

result = {
    'valid': validation.valid,
    'blocked': validation.blocked,
    'violations': [v.value for v in validation.violations],
    'reason': validation.reason,
    'timestamp': validation.timestamp
}

print(json.dumps(result))
`.trim();

    try {
      const { stdout, stderr } = await execFileAsync(pythonPath, ['-c', pythonScript], {
        cwd: engineDir,
        timeout: 10000
      });

      if (stderr && !stderr.includes('Warning')) {
        console.error('Python stderr:', stderr);
      }

      const result = JSON.parse(stdout.trim());

      return NextResponse.json({
        success: true,
        validation: result
      });
    } catch (execError: any) {
      console.error('Logic-Lock validation error:', execError.stderr || execError.message);
      return NextResponse.json(
        { error: 'Failed to validate command' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in Logic-Lock endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
