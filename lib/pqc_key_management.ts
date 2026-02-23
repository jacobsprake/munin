/**
 * Post-Quantum Cryptography Key Management and Rotation
 * 
 * Manages PQC key lifecycle: generation, storage, rotation, revocation
 */
import { signWithPQC, generatePQCKeyPair } from './pqc';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface PQCKey {
  keyId: string;
  algorithm: 'DILITHIUM-3';
  publicKey: string;
  privateKey?: string; // Only stored encrypted in production
  createdAt: string;
  expiresAt?: string;
  status: 'ACTIVE' | 'ROTATED' | 'REVOKED';
  rotationPolicy: {
    rotationIntervalDays: number;
    autoRotate: boolean;
  };
}

export interface PQCKeyStore {
  keys: PQCKey[];
  currentKeyId: string;
  rotationHistory: Array<{
    oldKeyId: string;
    newKeyId: string;
    rotatedAt: string;
    reason: string;
  }>;
}

const DEFAULT_KEY_STORE_PATH = join(process.cwd(), 'data', 'pqc_keys.json');
const DEFAULT_ROTATION_INTERVAL_DAYS = 90; // Rotate every 90 days

/**
 * Load key store from disk
 */
export async function loadKeyStore(storePath: string = DEFAULT_KEY_STORE_PATH): Promise<PQCKeyStore> {
  try {
    const content = await readFile(storePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Initialize new key store
      return {
        keys: [],
        currentKeyId: '',
        rotationHistory: []
      };
    }
    throw error;
  }
}

/**
 * Save key store to disk
 */
export async function saveKeyStore(
  keyStore: PQCKeyStore,
  storePath: string = DEFAULT_KEY_STORE_PATH
): Promise<void> {
  await mkdir(join(storePath, '..'), { recursive: true });
  await writeFile(storePath, JSON.stringify(keyStore, null, 2), 'utf-8');
}

/**
 * Generate new PQC key pair
 */
export async function generateNewKey(
  algorithm: 'DILITHIUM-3' = 'DILITHIUM-3',
  rotationIntervalDays: number = DEFAULT_ROTATION_INTERVAL_DAYS
): Promise<PQCKey> {
  const keyPair = await generatePQCKeyPair(algorithm);
  const keyId = `pqc_key_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    keyId,
    algorithm,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey, // In production, encrypt before storing
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + rotationIntervalDays * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    rotationPolicy: {
      rotationIntervalDays,
      autoRotate: true
    }
  };
}

/**
 * Get current active key
 */
export async function getCurrentKey(storePath?: string): Promise<PQCKey | null> {
  const keyStore = await loadKeyStore(storePath);
  
  if (!keyStore.currentKeyId) {
    return null;
  }
  
  const currentKey = keyStore.keys.find(k => k.keyId === keyStore.currentKeyId);
  if (!currentKey || currentKey.status !== 'ACTIVE') {
    return null;
  }
  
  // Check expiration
  if (currentKey.expiresAt && new Date(currentKey.expiresAt) < new Date()) {
    // Key expired, trigger rotation
    if (currentKey.rotationPolicy.autoRotate) {
      await rotateKey(storePath);
      return getCurrentKey(storePath);
    }
  }
  
  return currentKey;
}

/**
 * Rotate PQC key (generate new, mark old as ROTATED)
 */
export async function rotateKey(
  storePath: string = DEFAULT_KEY_STORE_PATH,
  reason: string = 'Scheduled rotation'
): Promise<PQCKey> {
  const keyStore = await loadKeyStore(storePath);
  
  // Mark old key as rotated
  if (keyStore.currentKeyId) {
    const oldKey = keyStore.keys.find(k => k.keyId === keyStore.currentKeyId);
    if (oldKey) {
      oldKey.status = 'ROTATED';
      keyStore.rotationHistory.push({
        oldKeyId: oldKey.keyId,
        newKeyId: '', // Will be set after generation
        rotatedAt: new Date().toISOString(),
        reason
      });
    }
  }
  
  // Generate new key
  const newKey = await generateNewKey();
  keyStore.keys.push(newKey);
  keyStore.currentKeyId = newKey.keyId;
  
  // Update rotation history
  if (keyStore.rotationHistory.length > 0) {
    keyStore.rotationHistory[keyStore.rotationHistory.length - 1].newKeyId = newKey.keyId;
  }
  
  await saveKeyStore(keyStore, storePath);
  
  return newKey;
}

/**
 * Revoke a key (e.g., if compromised)
 */
export async function revokeKey(
  keyId: string,
  reason: string,
  storePath: string = DEFAULT_KEY_STORE_PATH
): Promise<void> {
  const keyStore = await loadKeyStore(storePath);
  
  const key = keyStore.keys.find(k => k.keyId === keyId);
  if (!key) {
    throw new Error(`Key ${keyId} not found`);
  }
  
  key.status = 'REVOKED';
  
  // If revoking current key, rotate immediately
  if (keyId === keyStore.currentKeyId) {
    await rotateKey(storePath, `Emergency rotation: ${reason}`);
  }
  
  await saveKeyStore(keyStore, storePath);
}

/**
 * Get key lineage (rotation chain)
 */
export async function getKeyLineage(
  keyId: string,
  storePath: string = DEFAULT_KEY_STORE_PATH
): Promise<Array<{ keyId: string; status: string; createdAt: string; rotatedAt?: string }>> {
  const keyStore = await loadKeyStore(storePath);
  
  const lineage: Array<{ keyId: string; status: string; createdAt: string; rotatedAt?: string }> = [];
  let currentKeyId: string | null = keyId;
  
  // Walk backwards through rotation history
  while (currentKeyId) {
    const key = keyStore.keys.find(k => k.keyId === currentKeyId);
    if (!key) break;
    
    const rotation = keyStore.rotationHistory.find(r => r.newKeyId === currentKeyId);
    
    lineage.push({
      keyId: key.keyId,
      status: key.status,
      createdAt: key.createdAt,
      rotatedAt: rotation?.rotatedAt
    });
    
    currentKeyId = rotation?.oldKeyId || null;
  }
  
  return lineage.reverse(); // Return chronological order
}

/**
 * Check if key rotation is needed
 */
export async function checkRotationNeeded(storePath?: string): Promise<{
  needed: boolean;
  currentKey?: PQCKey;
  daysUntilExpiration?: number;
}> {
  const currentKey = await getCurrentKey(storePath);
  
  if (!currentKey) {
    return { needed: true };
  }
  
  if (!currentKey.expiresAt) {
    return { needed: false, currentKey };
  }
  
  const expiresAt = new Date(currentKey.expiresAt);
  const now = new Date();
  const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    needed: daysUntilExpiration <= 7, // Rotate within 7 days of expiration
    currentKey,
    daysUntilExpiration
  };
}

/**
 * Simulate PQC key rotation under load (for stress testing)
 */
export async function simulateRotationUnderLoad(
  numRotations: number = 10,
  storePath?: string
): Promise<Array<{ rotation: number; success: boolean; durationMs: number; error?: string }>> {
  const results = [];
  
  for (let i = 0; i < numRotations; i++) {
    const startTime = Date.now();
    try {
      await rotateKey(storePath, `Stress test rotation ${i + 1}`);
      const durationMs = Date.now() - startTime;
      results.push({ rotation: i + 1, success: true, durationMs });
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      results.push({ rotation: i + 1, success: false, durationMs, error: error.message });
    }
  }
  
  return results;
}

/**
 * Generate PQC keys on separate machine and prepare for USB transfer
 */
export async function generateKeysForAirGapTransfer(
  outputPath: string,
  numKeys: number = 1
): Promise<{ keys: PQCKey[]; transferBundle: string }> {
  const keys: PQCKey[] = [];
  
  for (let i = 0; i < numKeys; i++) {
    const key = await generateNewKey();
    keys.push(key);
  }
  
  // Create transfer bundle (encrypted, signed)
  const bundle = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    keys: keys.map(k => ({
      keyId: k.keyId,
      algorithm: k.algorithm,
      publicKey: k.publicKey,
      // Private keys would be encrypted in production
      createdAt: k.createdAt,
      expiresAt: k.expiresAt
    })),
    // In production, would include:
    // - Encryption metadata
    // - Signature of bundle
    // - Transfer instructions
  };
  
  const transferBundle = JSON.stringify(bundle, null, 2);
  
  return { keys, transferBundle };
}
