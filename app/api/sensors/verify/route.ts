import { NextResponse } from 'next/server';
import { verifyDeviceAttestation, generateDeviceIdentity } from '@/lib/zeroTrust';
import type { DeviceAttestation, DeviceIdentity } from '@/lib/zeroTrust';

// In-memory device registry (in production, use a database)
const deviceRegistry = new Map<string, DeviceIdentity>();

// Initialize some demo devices
async function initializeDemoDevices() {
  if (deviceRegistry.size === 0) {
    const devices = [
      { id: 'pump_station_01', type: 'pump' as const, region: 'Region 07' },
      { id: 'pump_station_02', type: 'pump' as const, region: 'Region 07' },
      { id: 'substation_north_01', type: 'substation' as const, region: 'Region 01' },
      { id: 'substation_south_01', type: 'substation' as const, region: 'Region 01' },
      { id: 'reservoir_alpha', type: 'sensor' as const, region: 'Region 07' },
    ];

    for (const device of devices) {
      const identity = await generateDeviceIdentity(device.id, device.type, device.region);
      deviceRegistry.set(device.id, identity);
    }
  }
}

/**
 * Verify a device's data submission
 */
export async function POST(request: Request) {
  try {
    await initializeDemoDevices();

    const { attestation, deviceId } = await request.json();
    
    if (!attestation || !deviceId) {
      return NextResponse.json(
        { error: 'Missing attestation or deviceId' },
        { status: 400 }
      );
    }

    const deviceIdentity = deviceRegistry.get(deviceId);
    if (!deviceIdentity) {
      return NextResponse.json(
        {
          verified: false,
          status: 'unverified',
          reason: 'Device not registered'
        },
        { status: 200 }
      );
    }

    const verification = await verifyDeviceAttestation(attestation, deviceIdentity);

    return NextResponse.json({
      verified: verification.status === 'verified',
      status: verification.status,
      reason: verification.reason,
      deviceId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Device verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify device', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Register a new device (for provisioning)
 */
export async function PUT(request: Request) {
  try {
    const { deviceId, deviceType, region } = await request.json();
    
    if (!deviceId || !deviceType || !region) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const identity = await generateDeviceIdentity(deviceId, deviceType, region);
    deviceRegistry.set(deviceId, identity);

    return NextResponse.json({
      success: true,
      deviceId,
      identity: {
        ...identity,
        privateKey: 'REDACTED' // Never return private key
      }
    });
  } catch (error: any) {
    console.error('Device registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register device', details: error.message },
      { status: 500 }
    );
  }
}


