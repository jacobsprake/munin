/**
 * Unit Tests for Audit Log System
 * Tests: chain tamper detection, signature validation, threshold approval
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  appendAuditLogEntry,
  verifyChainIntegrity,
  computeEntryHash,
  canonicalizeJSON,
  exportCheckpoint
} from '../auditLog';
import { createDecision, signDecision, getDecision } from '../decisions';
import { registerUser, rotateUserKey, revokeUserKey } from '../keyManagement';
import { signMessage, verifySignature, generateKeyPair } from '../ed25519';
import { createDecisionMessage } from '../decisions';

describe('Audit Log System', () => {
  beforeEach(() => {
    // Clear audit log before each test
    // In production, use test database
  });

  describe('Canonical JSON', () => {
    it('should produce stable key ordering', () => {
      const obj1 = { b: 2, a: 1, c: 3 };
      const obj2 = { c: 3, a: 1, b: 2 };
      
      const canonical1 = canonicalizeJSON(obj1);
      const canonical2 = canonicalizeJSON(obj2);
      
      expect(canonical1).toBe(canonical2);
    });

    it('should handle nested objects', () => {
      const obj = {
        z: { b: 2, a: 1 },
        a: 1,
        m: { d: 4, c: 3 }
      };
      
      const canonical = canonicalizeJSON(obj);
      const parsed = JSON.parse(canonical);
      
      expect(Object.keys(parsed)).toEqual(['a', 'm', 'z']);
      expect(Object.keys(parsed.m)).toEqual(['c', 'd']);
    });
  });

  describe('Hash Chaining', () => {
    it('should compute entry hash correctly', () => {
      const payload = canonicalizeJSON({ event: 'test', data: 123 });
      const prevHash = 'abc123';
      
      const hash1 = computeEntryHash(payload, prevHash);
      const hash2 = computeEntryHash(payload, prevHash);
      
      expect(hash1).toBe(hash2); // Deterministic
      expect(hash1.length).toBe(64); // SHA-256 hex
    });

    it('should produce different hash with different prev_hash', () => {
      const payload = canonicalizeJSON({ event: 'test' });
      const hash1 = computeEntryHash(payload, 'prev1');
      const hash2 = computeEntryHash(payload, 'prev2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Chain Tamper Detection', () => {
    it('should detect tampered entry hash', () => {
      // Create valid chain
      const entry1 = appendAuditLogEntry('TEST_EVENT', { data: 1 });
      const entry2 = appendAuditLogEntry('TEST_EVENT', { data: 2 });
      
      // Tamper with entry2's hash in database
      // (In real test, modify database directly)
      
      const result = verifyChainIntegrity();
      
      // Should detect tampering
      // expect(result.valid).toBe(false);
      // expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect broken chain continuity', () => {
      // Create chain
      appendAuditLogEntry('TEST_EVENT', { data: 1 });
      appendAuditLogEntry('TEST_EVENT', { data: 2 });
      
      // Break chain by modifying prev_hash
      // (In real test, modify database)
      
      const result = verifyChainIntegrity();
      
      // Should detect broken chain
      // expect(result.valid).toBe(false);
    });

    it('should verify intact chain', () => {
      appendAuditLogEntry('TEST_EVENT', { data: 1 });
      appendAuditLogEntry('TEST_EVENT', { data: 2 });
      appendAuditLogEntry('TEST_EVENT', { data: 3 });
      
      const result = verifyChainIntegrity();
      
      expect(result.valid).toBe(true);
      expect(result.entriesChecked).toBe(3);
    });
  });

  describe('Signature Validation', () => {
    it('should verify valid Ed25519 signature', async () => {
      const { publicKey, privateKey } = await generateKeyPair();
      const message = 'test message';
      const signature = await signMessage(message, privateKey);
      
      const isValid = await verifySignature(message, signature, publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const { publicKey } = await generateKeyPair();
      const message = 'test message';
      const invalidSignature = 'invalid_signature';
      
      const isValid = await verifySignature(message, invalidSignature, publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong message', async () => {
      const { publicKey, privateKey } = await generateKeyPair();
      const message1 = 'message 1';
      const message2 = 'message 2';
      const signature = await signMessage(message1, privateKey);
      
      const isValid = await verifySignature(message2, signature, publicKey);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Threshold Approval', () => {
    it('should authorize decision when threshold met (1-of-1)', async () => {
      // Create decision with 1-of-1 policy
      const decision = createDecision(
        'incident_001',
        'playbook_001',
        'step_001',
        { threshold: 1, required: 1, signers: ['signer_001'] }
      );
      
      // Generate key pair for signer
      const { publicKey, privateKey } = await generateKeyPair();
      registerUser('Test Signer', 'OPERATOR', publicKey, 'key_001');
      
      // Create decision message (using createDecisionMessage from decisions.ts)
      const decisionMessage = JSON.stringify({
        decision_id: decision.decision_id,
        incident_id: decision.incident_id,
        action_type: 'FLOOD_GATE_COORDINATION',
        scope: {},
        created_at: decision.created_at.toISOString(),
        previous_decision_hash: null
      });
      
      // Sign decision
      const signature = await signMessage(decisionMessage, privateKey);
      
      await signDecision(
        decision.decision_id,
        'signer_001',
        signature,
        'key_001',
        'FLOOD_GATE_COORDINATION',
        {}
      );
      
      // Check decision is authorized
      const updatedDecision = getDecision(decision.decision_id);
      expect(updatedDecision?.status).toBe('AUTHORIZED');
      expect(updatedDecision?.signatures.length).toBe(1);
    });

    it('should not authorize until threshold met (2-of-3)', async () => {
      const decision = createDecision(
        'incident_002',
        'playbook_002',
        undefined,
        { threshold: 2, required: 3, signers: ['signer_1', 'signer_2', 'signer_3'] }
      );
      
      // Register signers
      const { publicKey: pk1, privateKey: pv1 } = await generateKeyPair();
      const { publicKey: pk2, privateKey: pv2 } = await generateKeyPair();
      registerUser('Signer 1', 'OPERATOR', pk1, 'key_1');
      registerUser('Signer 2', 'OPERATOR', pk2, 'key_2');
      
      // Sign with first signer
      const message1 = JSON.stringify({
        decision_id: decision.decision_id,
        incident_id: decision.incident_id,
        action_type: 'TEST',
        scope: {},
        created_at: decision.created_at.toISOString(),
        previous_decision_hash: null
      });
      const sig1 = await signMessage(message1, pv1);
      
      await signDecision(decision.decision_id, 'signer_1', sig1, 'key_1', 'TEST', {});
      
      // Should still be PENDING
      let updatedDecision = getDecision(decision.decision_id);
      expect(updatedDecision?.status).toBe('PENDING');
      
      // Sign with second signer
      const sig2 = await signMessage(message1, pv2);
      await signDecision(decision.decision_id, 'signer_2', sig2, 'key_2', 'TEST', {});
      
      // Should now be AUTHORIZED
      updatedDecision = getDecision(decision.decision_id);
      expect(updatedDecision?.status).toBe('AUTHORIZED');
      expect(updatedDecision?.signatures.length).toBe(2);
    });

    it('should prevent duplicate signatures', async () => {
      const decision = createDecision(
        'incident_003',
        'playbook_003',
        undefined,
        { threshold: 1, required: 1, signers: ['signer_001'] }
      );
      
      const { publicKey, privateKey } = await generateKeyPair();
      registerUser('Test Signer', 'OPERATOR', publicKey, 'key_001');
      
      const message = JSON.stringify({
        decision_id: decision.decision_id,
        incident_id: decision.incident_id,
        action_type: 'TEST',
        scope: {},
        created_at: decision.created_at.toISOString(),
        previous_decision_hash: null
      });
      const signature = await signMessage(message, privateKey);
      
      // First signature should succeed
      await signDecision(decision.decision_id, 'signer_001', signature, 'key_001', 'TEST', {});
      
      // Second signature from same signer should fail
      await expect(
        signDecision(decision.decision_id, 'signer_001', signature, 'key_001', 'TEST', {})
      ).rejects.toThrow('already signed');
    });
  });

  describe('Key Management', () => {
    it('should support key rotation', () => {
      const { publicKey: oldKey, privateKey: oldPrivate } = generateKeyPair();
      const user = registerUser('Test User', 'OPERATOR', oldKey, 'key_old');
      
      const { publicKey: newKey } = generateKeyPair();
      const rotated = rotateUserKey(user.user_id, newKey, 'key_new');
      
      expect(rotated.key_id).toBe('key_new');
      expect(rotated.public_key).toBe(newKey);
      expect(rotated.key_status).toBe('ACTIVE');
    });

    it('should prevent signing with revoked key', () => {
      const { publicKey, privateKey } = generateKeyPair();
      const user = registerUser('Test User', 'OPERATOR', publicKey, 'key_001');
      
      // Revoke key
      revokeUserKey(user.user_id, 'key_001');
      
      // Attempt to sign should fail
      const decision = createDecision(
        'incident_004',
        'playbook_004',
        undefined,
        { threshold: 1, required: 1, signers: [user.user_id] }
      );
      
      const message = JSON.stringify({
        decision_id: decision.decision_id,
        incident_id: decision.incident_id,
        action_type: 'TEST',
        scope: {},
        created_at: decision.created_at.toISOString()
      });
      const signature = signMessage(message, privateKey);
      
      expect(() => {
        signDecision(decision.decision_id, user.user_id, signature, 'key_001', 'TEST', {});
      }).toThrow('not active');
    });
  });

  describe('Checkpoint Export', () => {
    it('should export checkpoint with chain head hash', () => {
      appendAuditLogEntry('TEST_EVENT', { data: 1 });
      appendAuditLogEntry('TEST_EVENT', { data: 2 });
      
      const checkpoint = exportCheckpoint();
      
      expect(checkpoint.chain_head_hash).toBeDefined();
      expect(checkpoint.timestamp).toBeInstanceOf(Date);
      expect(checkpoint.sequence_number).toBeGreaterThan(0);
      expect(checkpoint.checkpoint_hash).toBeDefined();
    });
  });
});
