/**
 * GET /api/config - Get configuration
 * PUT /api/config - Update configuration
 * Air-gapped compliant: all configs stored locally
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const configFile = join(process.cwd(), 'data', 'config.json');

// Default configuration
const defaultConfig = {
  system: {
    region: 'default',
    deployment_mode: 'air_gapped',
    emergency_mode: false,
    connectivity_state: 'connected'
  },
  engine: {
    graph_inference_enabled: true,
    sensor_health_check_interval_seconds: 300,
    incident_simulation_enabled: true,
    packet_generation_enabled: true
  },
  security: {
    require_multi_sig: true,
    min_signatures: 2,
    post_quantum_enabled: true,
    tee_enabled: false
  },
  notifications: {
    enabled: true,
    severity_threshold: 'moderate'
  },
  chaos_simulator: {
    enabled: true,
    auto_generate_scenarios: false
  },
  shadow_mode: {
    enabled: false,
    duration_days: 365
  }
};

async function loadConfig() {
  if (existsSync(configFile)) {
    try {
      const content = await readFile(configFile, 'utf-8');
      return { ...defaultConfig, ...JSON.parse(content) };
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
  }
  return defaultConfig;
}

async function saveConfig(config: any) {
  await writeFile(configFile, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET(request: Request) {
  try {
    const config = await loadConfig();
    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    console.error('Error loading config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { section, key, value } = body;

    if (!section || key === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: section, key' },
        { status: 400 }
      );
    }

    const config = await loadConfig();
    
    if (!config[section]) {
      config[section] = {};
    }
    
    config[section][key] = value;
    
    await saveConfig(config);

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update config' },
      { status: 500 }
    );
  }
}
