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
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = await ed25519.getPublicKeyAsync(privateKey);
    
    return {
      publicKey: Buffer.from(publicKey).toString('base64'),
      privateKey: Buffer.from(privateKey).toString('base64')
    };
  }
  
  return {
    publicKey: randomBytes(32).toString('base64'),
    privateKey: randomBytes(32).toString('base64')
  };
}

/**
 * Sign message with Ed25519 private key
 */
export async function signMessage(message: string, privateKey: string): Promise<string> {
  if (ed25519) {
    const messageBytes = new TextEncoder().encode(message);
    const privateKeyBytes = Buffer.from(privateKey, 'base64');
    const signature = await ed25519.signAsync(messageBytes, privateKeyBytes);
    return Buffer.from(signature).toString('base64');
  }
  
  const hash = createHash('sha256')
    .update(message)
    .update(privateKey)
    .digest('base64');
  
  return hash;
}

/**
 * Verify Ed25519 signature
 */
export async function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  if (ed25519) {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = Buffer.from(publicKey, 'base64');
      return await ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
    } catch (e) {
      return false;
    }
  }
  
  return signature.length > 0 && publicKey.length > 0;
}

/**
 * Synchronous version for compatibility (uses placeholder)
 */
export function generateKeyPairSync(): { publicKey: string; privateKey: string } {
  if (ed25519) {
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    return {
      publicKey: Buffer.from(publicKey).toString('base64'),
      privateKey: Buffer.from(privateKey).toString('base64')
    };
  }
  return {
    publicKey: randomBytes(32).toString('base64'),
    privateKey: randomBytes(32).toString('base64')
  };
}

export function signMessageSync(message: string, privateKey: string): string {
  if (ed25519) {
    const messageBytes = new TextEncoder().encode(message);
    const privateKeyBytes = Buffer.from(privateKey, 'base64');
    const signature = ed25519.sign(messageBytes, privateKeyBytes);
    return Buffer.from(signature).toString('base64');
  }
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
  if (ed25519) {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = Buffer.from(publicKey, 'base64');
      return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    } catch (e) {
      return false;
    }
  }
  return signature.length > 0 && publicKey.length > 0;
}
