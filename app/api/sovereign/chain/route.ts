/**
 * GET /api/sovereign/chain
 * Get the Merkle chain of handshake packets and compute Sovereign Hash
 */
import { NextResponse } from 'next/server';
import { packetsRepo } from '@/lib/db/repositories';
import { computeSovereignHash } from '@/lib/merkle';

export async function GET() {
  try {
    const allPackets = packetsRepo.getAll();
    
    // Extract Merkle receipt hashes
    const receiptHashes: string[] = [];
    const chainData = allPackets
      .map((p: any) => {
        // Check for Merkle fields (from database schema)
        const merklePreviousHash = (p as any).merklePreviousHash;
        const merkleReceiptHash = (p as any).merkleReceiptHash;
        const merkle = merklePreviousHash || merkleReceiptHash
          ? {
              previousHash: merklePreviousHash || undefined,
              receiptHash: merkleReceiptHash || undefined
            }
          : null;
        
        // Check for multi-sig fields (from database schema)
        const multiSigRequired = (p as any).multiSigRequired;
        const multiSigThreshold = (p as any).multiSigThreshold;
        const approvals = JSON.parse(p.approvals || '[]') as any[];
        const currentSignatures = approvals.filter(a => a.signedTs).length;
        
        const multiSig = (multiSigRequired !== null && multiSigRequired !== undefined) || 
                         (multiSigThreshold !== null && multiSigThreshold !== undefined)
          ? {
              required: multiSigRequired || approvals.length,
              threshold: multiSigThreshold || approvals.length,
              currentSignatures
            }
          : null;
        
        if (merkle?.receiptHash) {
          receiptHashes.push(merkle.receiptHash);
        }
        
        return {
          id: p.id,
          createdTs: p.createdTs.toISOString(),
          status: p.status,
          playbookId: p.playbookId,
          merkle,
          multiSig,
          approvals
        };
      })
      .sort((a, b) => new Date(a.createdTs).getTime() - new Date(b.createdTs).getTime());
    
    // Compute Sovereign Hash (Merkle tree root of all receipts)
    const sovereignHash = receiptHashes.length > 0 
      ? await computeSovereignHash(receiptHashes)
      : null;
    
    // Chain integrity check
    let chainValid = true;
    const chainErrors: string[] = [];
    
    for (let i = 0; i < chainData.length; i++) {
      const current = chainData[i];
      if (!current.merkle) continue;
      
      if (i === 0 && current.merkle.previousHash) {
        chainValid = false;
        chainErrors.push(`First packet should not have previousHash`);
      }
      
      if (i > 0) {
        const previous = chainData[i - 1];
        if (current.merkle.previousHash !== previous.merkle?.receiptHash) {
          chainValid = false;
          chainErrors.push(`Chain broken at packet ${current.id}: previousHash mismatch`);
        }
      }
    }
    
    return NextResponse.json({
      chain: chainData,
      sovereignHash,
      chainValid,
      chainErrors: chainErrors.length > 0 ? chainErrors : undefined,
      stats: {
        totalPackets: chainData.length,
        authorizedPackets: chainData.filter(p => p.status === 'authorized').length,
        pendingPackets: chainData.filter(p => p.status === 'ready' || p.status === 'draft').length,
        multiSigPackets: chainData.filter(p => p.multiSig && p.multiSig.threshold > 1).length
      }
    });
  } catch (error: any) {
    console.error('Error getting sovereign chain:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sovereign chain' },
      { status: 500 }
    );
  }
}

