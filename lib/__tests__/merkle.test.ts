import {
  generateMerkleReceipt,
  verifyMerkleChain,
  getLatestReceiptHash,
  computeSovereignHash,
  MerkleReceipt
} from '../merkle';

describe('Merkle Receipt System', () => {
  describe('generateMerkleReceipt', () => {
    it('creates a receipt with packet hash and receipt hash', async () => {
      const receipt = await generateMerkleReceipt('packet-content-1');
      expect(receipt.packetHash).toHaveLength(64);
      expect(receipt.receiptHash).toHaveLength(64);
      expect(receipt.previousHash).toBeUndefined();
      expect(receipt.sequenceNumber).toBe(0);
      expect(receipt.timestamp).toBeDefined();
    });

    it('chains receipts via previousHash', async () => {
      const r1 = await generateMerkleReceipt('packet-1', undefined, 0);
      const r2 = await generateMerkleReceipt('packet-2', r1.receiptHash, 1);
      expect(r2.previousHash).toBe(r1.receiptHash);
      expect(r2.sequenceNumber).toBe(1);
      expect(r2.receiptHash).not.toBe(r1.receiptHash);
    });

    it('produces deterministic hashes for same content', async () => {
      const r1 = await generateMerkleReceipt('same-content');
      const r2 = await generateMerkleReceipt('same-content');
      expect(r1.packetHash).toBe(r2.packetHash);
    });
  });

  describe('verifyMerkleChain', () => {
    it('validates a correct chain', async () => {
      const r1 = await generateMerkleReceipt('packet-1', undefined, 0);
      const r2 = await generateMerkleReceipt('packet-2', r1.receiptHash, 1);
      const r3 = await generateMerkleReceipt('packet-3', r2.receiptHash, 2);
      const result = await verifyMerkleChain([r1, r2, r3]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects tampered receipt hash', async () => {
      const r1 = await generateMerkleReceipt('packet-1', undefined, 0);
      const r2 = await generateMerkleReceipt('packet-2', r1.receiptHash, 1);
      const tampered: MerkleReceipt = { ...r2, receiptHash: 'tampered_hash' };
      const result = await verifyMerkleChain([r1, tampered]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('detects broken chain continuity', async () => {
      const r1 = await generateMerkleReceipt('packet-1', undefined, 0);
      const r2 = await generateMerkleReceipt('packet-2', 'wrong_previous_hash', 1);
      const result = await verifyMerkleChain([r1, r2]);
      expect(result.valid).toBe(false);
    });

    it('rejects first receipt with previousHash', async () => {
      const r1 = await generateMerkleReceipt('packet-1', 'should_not_exist', 0);
      const result = await verifyMerkleChain([r1]);
      expect(result.valid).toBe(false);
    });

    it('validates single-element chain', async () => {
      const r1 = await generateMerkleReceipt('packet-1', undefined, 0);
      const result = await verifyMerkleChain([r1]);
      expect(result.valid).toBe(true);
    });

    it('validates empty chain', async () => {
      const result = await verifyMerkleChain([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('getLatestReceiptHash', () => {
    it('returns undefined for empty array', () => {
      expect(getLatestReceiptHash([])).toBeUndefined();
    });

    it('returns the receipt hash from packets with merkle data', () => {
      const packets = [
        { merkle: { receiptHash: 'abc123' } },
        { merkle: { receiptHash: 'def456' } },
      ];
      const latest = getLatestReceiptHash(packets);
      expect(latest).toBeDefined();
    });

    it('skips packets without merkle data', () => {
      const packets = [{}, { merkle: { receiptHash: 'abc123' } }];
      expect(getLatestReceiptHash(packets)).toBe('abc123');
    });
  });

  describe('computeSovereignHash', () => {
    it('returns a hash for empty chain', async () => {
      const hash = await computeSovereignHash([]);
      expect(hash).toHaveLength(64);
    });

    it('returns the single hash for one-element list', async () => {
      const hash = await computeSovereignHash(['abc123']);
      expect(hash).toBe('abc123');
    });

    it('combines multiple hashes into a Merkle root', async () => {
      const hash = await computeSovereignHash(['hash1', 'hash2', 'hash3']);
      expect(hash).toHaveLength(64);
    });

    it('is deterministic', async () => {
      const h1 = await computeSovereignHash(['a', 'b', 'c']);
      const h2 = await computeSovereignHash(['a', 'b', 'c']);
      expect(h1).toBe(h2);
    });

    it('changes when any input differs', async () => {
      const h1 = await computeSovereignHash(['a', 'b', 'c']);
      const h2 = await computeSovereignHash(['a', 'b', 'd']);
      expect(h1).not.toBe(h2);
    });
  });
});
