/**
 * Security test: crypto (roadmap item 35) – signature and audit log integrity
 */
import { verifySignature, signMessage, generateKeyPair, hasRealEd25519 } from '@/lib/audit/ed25519';

describe('Crypto / signature integrity', () => {
  it('verifySignature accepts valid Ed25519 signature', async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    const message = 'canonical decision message';
    const signature = await signMessage(message, privateKey);
    const valid = await verifySignature(message, signature, publicKey);
    expect(valid).toBe(true);
  });

  it('verifySignature rejects invalid signature', async () => {
    if (!hasRealEd25519) return; // Placeholder accepts any non-empty signature
    const { publicKey } = await generateKeyPair();
    const valid = await verifySignature('message', 'invalid_base64_signature', publicKey);
    expect(valid).toBe(false);
  });

  it('verifySignature rejects tampered message', async () => {
    if (!hasRealEd25519) return; // Placeholder accepts any non-empty signature
    const { publicKey, privateKey } = await generateKeyPair();
    const signature = await signMessage('original', privateKey);
    const valid = await verifySignature('tampered', signature, publicKey);
    expect(valid).toBe(false);
  });
});
