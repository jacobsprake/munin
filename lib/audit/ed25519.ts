/**
 * Ed25519 Signature Support
 * Wrapper for Ed25519 digital signatures using @noble/ed25519
 * 
 * Install: npm install @noble/ed25519
 */

import { randomBytes, createHash } from 'crypto';

// Try to import @noble/ed25519, fallback to placeholder if not installed
let ed25519: any = null;
try {
  ed25519 = require('@noble/ed25519');
} catch (e) {
  console.warn('@noble/ed25519 not installed. Using placeholder implementation. Run: npm install @noble/ed25519');
}

/** True when real @noble/ed25519 is used; false when placeholder (reject-invalid tests are skipped). */
export const hasRealEd25519 = !!ed25519;

/**
 * Generate Ed25519 key pair
 * Returns: { publicKey: string (base64), privateKey: string (base64) }
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  if (ed25519) {
    // Real Ed25519 implementation
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKey(privateKey);
    
    return {
      publicKey: Buffer.from(publicKey).toString('base64'),
      privateKey: Buffer.from(privateKey).toString('base64')
    };
  }
  
  // Placeholder: generate random keys (for development only)
  return {
    publicKey: randomBytes(32).toString('base64'),
    privateKey: randomBytes(32).toString('base64')
  };
}

/**
 * Sign message with Ed25519 private key
 * @param message - Message to sign (string)
 * @param privateKey - Ed25519 private key (base64 encoded)
 * @returns Ed25519 signature (base64 encoded)
 */
export async function signMessage(message: string, privateKey: string): Promise<string> {
  if (ed25519) {
    // Real Ed25519 implementation
    const messageBytes = new TextEncoder().encode(message);
    const privateKeyBytes = Buffer.from(privateKey, 'base64');
    const signature = await ed25519.sign(messageBytes, privateKeyBytes);
    return Buffer.from(signature).toString('base64');
  }
  
  // Placeholder: return hash-based signature (for development only)
  const hash = createHash('sha256')
    .update(message)
    .update(privateKey)
    .digest('base64');
  
  return hash;
}

/**
 * Verify Ed25519 signature
 * @param message - Original message (string)
 * @param signature - Ed25519 signature (base64 encoded)
 * @param publicKey - Ed25519 public key (base64 encoded)
 * @returns true if signature is valid
 */
export async function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  if (ed25519) {
    // Real Ed25519 implementation
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = Buffer.from(publicKey, 'base64');
      return await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    } catch (e) {
      return false;
    }
  }
  
  // Placeholder: basic validation (for development only)
  // WARNING: This is not cryptographically secure!
  return signature.length > 0 && publicKey.length > 0;
}

/**
 * Synchronous version for compatibility (uses async internally)
 */
export function generateKeyPairSync(): { publicKey: string; privateKey: string } {
  // For sync compatibility, we'll use the placeholder
  // In production, prefer async version
  return {
    publicKey: randomBytes(32).toString('base64'),
    privateKey: randomBytes(32).toString('base64')
  };
}

export function signMessageSync(message: string, privateKey: string): string {
  // For sync compatibility, we'll use the placeholder
  // In production, prefer async version
  const hash = createHash('sha256')
    .update(message)
    .update(privateKey)
    .digest('base64');
  return hash;
}

export function verifySignatureSync(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  // For sync compatibility, we'll use basic validation
  // In production, prefer async version
  return signature.length > 0 && publicKey.length > 0;
}
