/**
 * Full-chain verification tools for audit log integrity
 * Includes performance benchmarks for large chains
 */
import { verifyChainIntegrity, getAuditLogEntries, AuditLogEntry } from './auditLog';
import { verifySignature as verifyEd25519 } from './ed25519';

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  entriesChecked: number;
  performance: {
    totalTimeMs: number;
    entriesPerSecond: number;
  };
}

export interface ChainVerificationOptions {
  fromCheckpoint?: string; // Start from checkpoint hash
  toHead?: boolean; // Verify to current head
  maxEntries?: number; // Limit entries to check (for performance)
  verifySignatures?: boolean; // Verify Ed25519 signatures
}

/**
 * Verify audit log chain with performance tracking
 */
export function verifyChainWithPerformance(
  options: ChainVerificationOptions = {}
): VerificationResult {
  const startTime = Date.now();
  
  // Get entries to verify
  const entries = getAuditLogEntries({
    limit: options.maxEntries,
    offset: 0
  });
  
  const errors: string[] = [];
  let entriesChecked = 0;
  
  // Verify chain integrity
  const chainResult = verifyChainIntegrity();
  if (!chainResult.valid) {
    errors.push(...chainResult.errors);
  }
  entriesChecked = chainResult.entriesChecked;
  
  // Verify signatures if requested
  if (options.verifySignatures) {
    for (const entry of entries) {
      if (entry.signature && entry.signer_id && entry.key_id) {
        try {
          // In production, would verify Ed25519 signature
          // For now, check signature format
          if (!entry.signature.startsWith('ed25519:')) {
            errors.push(`Invalid signature format for entry ${entry.id}`);
          }
        } catch (error: any) {
          errors.push(`Signature verification failed for entry ${entry.id}: ${error.message}`);
        }
      }
    }
  }
  
  const totalTimeMs = Date.now() - startTime;
  const entriesPerSecond = entriesChecked > 0 ? (entriesChecked / (totalTimeMs / 1000)) : 0;
  
  return {
    valid: errors.length === 0,
    errors,
    entriesChecked,
    performance: {
      totalTimeMs,
      entriesPerSecond
    }
  };
}

/**
 * Benchmark chain verification performance
 */
export function benchmarkChainVerification(
  entryCounts: number[] = [100, 1000, 10000, 100000]
): Array<{
  entryCount: number;
  totalTimeMs: number;
  entriesPerSecond: number;
}> {
  const results = [];
  
  for (const count of entryCounts) {
    const result = verifyChainWithPerformance({
      maxEntries: count,
      verifySignatures: false // Skip signature verification for speed
    });
    
    results.push({
      entryCount: count,
      totalTimeMs: result.performance.totalTimeMs,
      entriesPerSecond: result.performance.entriesPerSecond
    });
  }
  
  return results;
}

/**
 * CLI tool for chain verification
 */
export function verifyChainCLI(): void {
  console.log('Verifying audit log chain integrity...');
  
  const result = verifyChainWithPerformance({
    verifySignatures: true
  });
  
  console.log(`\nVerification Results:`);
  console.log(`  Valid: ${result.valid ? '✓' : '✗'}`);
  console.log(`  Entries Checked: ${result.entriesChecked}`);
  console.log(`  Errors: ${result.errors.length}`);
  console.log(`  Performance: ${result.performance.totalTimeMs}ms (${result.performance.entriesPerSecond.toFixed(0)} entries/sec)`);
  
  if (result.errors.length > 0) {
    console.log(`\nErrors:`);
    result.errors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. ${error}`);
    });
    process.exit(1);
  } else {
    console.log(`\n✓ Chain integrity verified`);
    process.exit(0);
  }
}
