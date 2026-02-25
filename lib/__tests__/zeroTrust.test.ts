import {
  verifyDeviceAttestation,
  generateDeviceIdentity,
  createDeviceAttestation,
  getVerificationStatusColor,
  DeviceIdentity,
  DeviceAttestation,
} from '../zeroTrust';

describe('Zero-Trust Device Verification', () => {
  describe('generateDeviceIdentity', () => {
    it('creates a device identity with all required fields', async () => {
      const identity = await generateDeviceIdentity('pump_01', 'pump', 'north');
      expect(identity.deviceId).toBe('pump_01');
      expect(identity.deviceType).toBe('pump');
      expect(identity.region).toBe('north');
      expect(identity.publicKey).toBeTruthy();
      expect(identity.certificate).toBeTruthy();
      expect(identity.issuedAt).toBeTruthy();
      expect(identity.expiresAt).toBeTruthy();
    });

    it('generates different keys for different devices', async () => {
      const id1 = await generateDeviceIdentity('pump_01', 'pump', 'north');
      const id2 = await generateDeviceIdentity('pump_02', 'pump', 'south');
      expect(id1.publicKey).not.toBe(id2.publicKey);
    });
  });

  describe('verifyDeviceAttestation', () => {
    it('verifies a valid device attestation', async () => {
      const identity = await generateDeviceIdentity('sensor_01', 'sensor', 'north');
      const attestation: DeviceAttestation = {
        deviceId: 'sensor_01',
        timestamp: new Date().toISOString(),
        dataHash: 'test_data_hash_abcdef',
        signature: 'PQCSIG-DILITHIUM-3-valid-test-signature',
        publicKey: identity.publicKey,
      };
      const result = await verifyDeviceAttestation(attestation, identity);
      expect(result.status).toBe('verified');
    });

    it('rejects expired certificates', async () => {
      const identity: DeviceIdentity = {
        deviceId: 'sensor_01',
        publicKey: 'test-key',
        certificate: 'test-cert',
        issuedAt: new Date(Date.now() - 86400000 * 400).toISOString(),
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
        deviceType: 'sensor',
        region: 'north',
      };
      const attestation: DeviceAttestation = {
        deviceId: 'sensor_01',
        timestamp: new Date().toISOString(),
        dataHash: 'hash',
        signature: 'sig',
        publicKey: 'test-key',
      };
      const result = await verifyDeviceAttestation(attestation, identity);
      expect(result.status).toBe('expired');
    });

    it('rejects mismatched device IDs', async () => {
      const identity = await generateDeviceIdentity('sensor_01', 'sensor', 'north');
      const attestation: DeviceAttestation = {
        deviceId: 'wrong_device',
        timestamp: new Date().toISOString(),
        dataHash: 'hash',
        signature: 'sig',
        publicKey: identity.publicKey,
      };
      const result = await verifyDeviceAttestation(attestation, identity);
      expect(result.status).not.toBe('verified');
    });
  });

  describe('getVerificationStatusColor', () => {
    it('returns green for verified', () => {
      expect(getVerificationStatusColor('verified')).toBeTruthy();
    });

    it('returns color for each status', () => {
      const statuses = ['verified', 'unverified', 'expired', 'revoked', 'pending'] as const;
      for (const s of statuses) {
        expect(getVerificationStatusColor(s)).toBeTruthy();
      }
    });
  });
});
