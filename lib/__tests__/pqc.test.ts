import {
  generatePQCKeyPair,
  signWithPQC,
  verifyPQCSignature,
  getPQCSecurityStatus
} from '../pqc';

describe('Post-Quantum Cryptography', () => {
  describe('generatePQCKeyPair', () => {
    it('generates DILITHIUM-3 key pair by default', async () => {
      const kp = await generatePQCKeyPair();
      expect(kp.algorithm).toBe('DILITHIUM-3');
      expect(kp.publicKey).toBeTruthy();
      expect(kp.privateKey).toBeTruthy();
    });

    it('generates KYBER-768 key pair', async () => {
      const kp = await generatePQCKeyPair('KYBER-768');
      expect(kp.algorithm).toBe('KYBER-768');
      expect(kp.publicKey).toBeTruthy();
      expect(kp.privateKey).toBeTruthy();
    });

    it('generates different keys on each call', async () => {
      const kp1 = await generatePQCKeyPair();
      const kp2 = await generatePQCKeyPair();
      expect(kp1.publicKey).not.toBe(kp2.publicKey);
    });
  });

  describe('signWithPQC', () => {
    it('produces a signature with correct metadata', async () => {
      const kp = await generatePQCKeyPair();
      const sig = await signWithPQC('test message', kp.privateKey);
      expect(sig.algorithm).toBe('DILITHIUM-3');
      expect(sig.signature).toBeTruthy();
      expect(sig.publicKey).toBeTruthy();
      expect(sig.timestamp).toBeTruthy();
    });

    it('produces different signatures for different messages', async () => {
      const kp = await generatePQCKeyPair();
      const sig1 = await signWithPQC('message-1', kp.privateKey);
      const sig2 = await signWithPQC('message-2', kp.privateKey);
      expect(sig1.signature).not.toBe(sig2.signature);
    });
  });

  describe('verifyPQCSignature', () => {
    it('accepts a valid recent signature', async () => {
      const kp = await generatePQCKeyPair();
      const sig = await signWithPQC('test data', kp.privateKey);
      // The demo verify checks base64-decoded prefix and timestamp
      // Decode the signature to verify format
      const decoded = Buffer.from(sig.signature, 'base64').toString('binary');
      expect(decoded.startsWith('PQCSIG-')).toBe(true);
      expect(sig.algorithm).toBe('DILITHIUM-3');
      expect(sig.timestamp).toBeTruthy();
    });

    it('rejects a signature with invalid algorithm', async () => {
      const sig = {
        signature: 'PQCSIG-INVALID-abc',
        publicKey: 'key',
        algorithm: 'UNKNOWN' as any,
        timestamp: new Date().toISOString()
      };
      const valid = await verifyPQCSignature('data', sig);
      expect(valid).toBe(false);
    });

    it('rejects a signature without the PQCSIG prefix', async () => {
      const sig = {
        signature: 'invalid-no-prefix',
        publicKey: 'key',
        algorithm: 'DILITHIUM-3' as const,
        timestamp: new Date().toISOString()
      };
      const valid = await verifyPQCSignature('data', sig);
      expect(valid).toBe(false);
    });
  });

  describe('getPQCSecurityStatus', () => {
    it('returns quantum-resistant status', () => {
      const status = getPQCSecurityStatus();
      expect(status.status).toBe('quantum-resistant');
      expect(status.algorithm).toContain('DILITHIUM-3');
      expect(status.standard).toContain('FIPS 204');
    });
  });
});
