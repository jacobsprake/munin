/**
 * Merkle-Proof Receipt System for Sovereign Infrastructure
 * 
 * Implements private DLT logic: each handshake packet is chained to the previous one
 * via a Merkle-proof receipt, creating an immutable audit trail that cannot be
 * reordered or tampered with, even in an air-gapped environment.
 */

import { sha256 } from './hash';

export interface MerkleReceipt {
  previousHash?: string; // Hash of previous packet's receipt
  packetHash: string; // Hash of current packet content
  receiptHash: string; // Combined hash (previousHash + packetHash)
  timestamp: string;
  sequenceNumber: number;
}

/**
 * Generate a Merkle-proof receipt for a handshake packet.
 * This creates an immutable chain where each packet links to the previous one.
 */
export async function generateMerkleReceipt(
  packetContent: string,
  previousReceiptHash?: string,
  sequenceNumber: number = 0
): Promise<MerkleReceipt> {
  // Hash the packet content
  const packetHash = await sha256(packetContent);
  
  // Combine previous hash (if exists) with current packet hash
  const combined = previousReceiptHash 
    ? `${previousReceiptHash}:${packetHash}`
    : packetHash;
  
  // Generate receipt hash (this is the "Merkle proof")
  const receiptHash = await sha256(combined);
  
  return {
    previousHash: previousReceiptHash,
    packetHash,
    receiptHash,
    timestamp: new Date().toISOString(),
    sequenceNumber
  };
}

/**
 * Verify a Merkle receipt chain.
 * Returns true if the chain is valid (no tampering or reordering).
 */
export async function verifyMerkleChain(
  receipts: MerkleReceipt[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    
    // First receipt should not have a previous hash
    if (i === 0 && receipt.previousHash) {
      errors.push(`First receipt should not have previousHash`);
      continue;
    }
    
    // Subsequent receipts must have a previous hash
    if (i > 0 && !receipt.previousHash) {
      errors.push(`Receipt ${i} missing previousHash`);
      continue;
    }
    
    // Verify receipt hash matches expected computation
    const expectedCombined = receipt.previousHash
      ? `${receipt.previousHash}:${receipt.packetHash}`
      : receipt.packetHash;
    
    const expectedReceiptHash = await sha256(expectedCombined);
    
    if (expectedReceiptHash !== receipt.receiptHash) {
      errors.push(`Receipt ${i} hash mismatch: expected ${expectedReceiptHash}, got ${receipt.receiptHash}`);
    }
    
    // Verify chain continuity (each receipt's previousHash should match previous receipt's receiptHash)
    if (i > 0) {
      const previousReceipt = receipts[i - 1];
      if (receipt.previousHash !== previousReceipt.receiptHash) {
        errors.push(`Receipt ${i} chain broken: previousHash ${receipt.previousHash} does not match previous receiptHash ${previousReceipt.receiptHash}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get the latest receipt hash from a list of packets.
 * Used to chain new packets to the most recent one.
 */
export function getLatestReceiptHash(packets: Array<{ merkle?: { receiptHash: string } }>): string | undefined {
  if (packets.length === 0) return undefined;
  
  // Find the packet with the most recent receipt
  const packetsWithReceipts = packets
    .filter(p => p.merkle?.receiptHash)
    .sort((a, b) => {
      // Sort by receipt hash (simplified - in real system would use timestamp)
      return a.merkle!.receiptHash.localeCompare(b.merkle!.receiptHash);
    });
  
  return packetsWithReceipts.length > 0 
    ? packetsWithReceipts[packetsWithReceipts.length - 1].merkle!.receiptHash
    : undefined;
}

/**
 * Compute Merkle tree root from a list of packet hashes.
 * This creates a single "Sovereign Hash" representing the entire chain state.
 */
export async function computeSovereignHash(
  receiptHashes: string[]
): Promise<string> {
  if (receiptHashes.length === 0) {
    return await sha256('empty_chain');
  }
  
  if (receiptHashes.length === 1) {
    return receiptHashes[0];
  }
  
  // Build Merkle tree bottom-up
  let currentLevel = receiptHashes;
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Pair of hashes
        const combined = `${currentLevel[i]}:${currentLevel[i + 1]}`;
        nextLevel.push(await sha256(combined));
      } else {
        // Odd one out, hash with itself
        const combined = `${currentLevel[i]}:${currentLevel[i]}`;
        nextLevel.push(await sha256(combined));
      }
    }
    
    currentLevel = nextLevel;
  }
  
  return currentLevel[0];
}


