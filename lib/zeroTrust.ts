/**
 * Zero-Trust Edge Architecture
 * 2026 Reality Feature: Every device must prove its identity before data is accepted
 * 
 * In 2026, the network perimeter is gone. Every pump, sensor, and valve must
 * cryptographically prove its identity before Munin accepts its data.
 */

export interface DeviceIdentity {
  deviceId: string;
  publicKey: string; // PQC public key for device
  certificate: string; // Device certificate (signed by CA)
  issuedAt: string;
  expiresAt: string;
  deviceType: 'sensor' | 'pump' | 'valve' | 'substation' | 'other';
  region: string;
}

export interface DeviceAttestation {
  deviceId: string;
  timestamp: string;
  dataHash: string;
  signature: string; // PQC signature over (deviceId + timestamp + dataHash)
  publicKey: string;
}

export type VerificationStatus = 'verified' | 'unverified' | 'expired' | 'revoked' | 'pending';

/**
 * Verify a device's identity and attestation
 */
export async function verifyDeviceAttestation(
  attestation: DeviceAttestation,
  deviceIdentity: DeviceIdentity
): Promise<{
  status: VerificationStatus;
  reason?: string;
}> {
  // Check certificate expiration
  const now = new Date();
  const expiresAt = new Date(deviceIdentity.expiresAt);
  if (now > expiresAt) {
    return {
      status: 'expired',
      reason: 'Device certificate has expired'
    };
  }

  // Verify the attestation signature
  // In production, this would use actual PQC verification
  const attestationData = `${attestation.deviceId}${attestation.timestamp}${attestation.dataHash}`;
  
  // Check signature format (demo simplification)
  if (!attestation.signature.startsWith('PQCSIG-')) {
    return {
      status: 'unverified',
      reason: 'Invalid signature format'
    };
  }

  // Verify device ID matches
  if (attestation.deviceId !== deviceIdentity.deviceId) {
    return {
      status: 'unverified',
      reason: 'Device ID mismatch'
    };
  }

  // Verify public key matches
  if (attestation.publicKey !== deviceIdentity.publicKey) {
    return {
      status: 'unverified',
      reason: 'Public key mismatch'
    };
  }

  // Check timestamp freshness (within last 5 minutes)
  const attestationTime = new Date(attestation.timestamp).getTime();
  const ageMinutes = (now.getTime() - attestationTime) / (1000 * 60);
  if (ageMinutes > 5) {
    return {
      status: 'unverified',
      reason: 'Attestation timestamp too old'
    };
  }

  return {
    status: 'verified'
  };
}

/**
 * Generate a device identity (for provisioning)
 */
export async function generateDeviceIdentity(
  deviceId: string,
  deviceType: DeviceIdentity['deviceType'],
  region: string
): Promise<DeviceIdentity> {
  // In production, this would use actual PQC key generation
  const publicKey = btoa(`PQCPUB-DEVICE-${deviceId}-${Date.now()}`);
  const certificate = btoa(`CERT-${deviceId}-${Date.now()}`);
  
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year validity

  return {
    deviceId,
    publicKey,
    certificate,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    deviceType,
    region
  };
}

/**
 * Create a device attestation for data submission
 */
export async function createDeviceAttestation(
  deviceId: string,
  dataHash: string,
  privateKey: string
): Promise<DeviceAttestation> {
  const timestamp = new Date().toISOString();
  const attestationData = `${deviceId}${timestamp}${dataHash}`;
  
  // In production, use actual PQC signing
  const signature = btoa(`PQCSIG-DEVICE-${deviceId}-${Date.now()}`);
  const publicKey = privateKey.replace('PQCPRIV', 'PQCPUB');

  return {
    deviceId,
    timestamp,
    dataHash,
    signature,
    publicKey
  };
}

/**
 * Get verification status badge color
 */
export function getVerificationStatusColor(status: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'text-safety-emerald border-safety-emerald bg-safety-emerald/20';
    case 'unverified':
    case 'revoked':
      return 'text-red-400 border-red-700 bg-red-900/30';
    case 'expired':
      return 'text-safety-amber border-safety-amber bg-safety-amber/20';
    case 'pending':
      return 'text-slate-400 border-slate-700 bg-slate-900/30';
    default:
      return 'text-slate-400 border-slate-700 bg-slate-900/30';
  }
}

