import { sha256, generateSignatureHash } from '../hash';

describe('sha256', () => {
  it('produces a 64-character hex string', async () => {
    const hash = await sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    const h1 = await sha256('test-message');
    const h2 = await sha256('test-message');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', async () => {
    const h1 = await sha256('message-a');
    const h2 = await sha256('message-b');
    expect(h1).not.toBe(h2);
  });

  it('handles empty string', async () => {
    const hash = await sha256('');
    expect(hash).toHaveLength(64);
  });
});

describe('generateSignatureHash', () => {
  it('combines all inputs into a single hash', async () => {
    const hash = await generateSignatureHash('{"id":"p1"}', 'op1', 'pass', '2026-01-01');
    expect(hash).toHaveLength(64);
  });

  it('changes when any input differs', async () => {
    const base = await generateSignatureHash('{"id":"p1"}', 'op1', 'pass', '2026-01-01');
    const diffPacket = await generateSignatureHash('{"id":"p2"}', 'op1', 'pass', '2026-01-01');
    const diffOp = await generateSignatureHash('{"id":"p1"}', 'op2', 'pass', '2026-01-01');
    const diffPass = await generateSignatureHash('{"id":"p1"}', 'op1', 'wrong', '2026-01-01');
    const diffTime = await generateSignatureHash('{"id":"p1"}', 'op1', 'pass', '2026-02-02');
    expect(base).not.toBe(diffPacket);
    expect(base).not.toBe(diffOp);
    expect(base).not.toBe(diffPass);
    expect(base).not.toBe(diffTime);
  });
});
