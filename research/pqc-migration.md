# Post-Quantum Cryptography Migration Plan

## Context

NIST finalized three post-quantum cryptography standards in August 2024:
- **FIPS 203** (ML-KEM, based on CRYSTALS-Kyber) — key encapsulation
- **FIPS 204** (ML-DSA, based on CRYSTALS-Dilithium) — digital signatures
- **FIPS 205** (SLH-DSA, based on SPHINCS+) — hash-based signatures

For Munin, the relevant standard is **FIPS 204 (ML-DSA)** for signing authorization packets and audit log entries. Munin does not currently require key encapsulation (no encrypted channels between components in the air-gapped deployment model).

## Why PQC Matters for Critical Infrastructure

NIST's assessment: cryptographically relevant quantum computers could break RSA-2048 and ECC within the 2030-2035 timeframe. For critical infrastructure, this creates a "harvest now, decrypt later" risk: authorization packets signed today with classical algorithms could be forged retroactively by a future quantum adversary, undermining audit trail integrity.

Munin's authorization packets are designed to be legally defensible records. Their cryptographic integrity must be maintained for the operational lifetime of the infrastructure they protect (typically 30-50 years for water and power assets).

## Migration Strategy: Classical + PQC Dual-Stack

### Phase 0: Classical Only (Current State)
- All signatures use Ed25519 (`lib/audit/ed25519.ts`)
- Merkle chain receipts use SHA-256 (`lib/merkle.ts`)
- Session tokens use HMAC-SHA256 (`lib/auth/sessions.ts`)

### Phase 1: Dual Signatures (Target: v1.1)
- Each authorization packet carries **both** an Ed25519 and an ML-DSA-65 signature
- Verification requires **both** signatures to pass
- ML-DSA implementation: demo mode uses SHA-256 simulation; production uses liboqs or pqcrypto bindings
- `lib/pqc.ts` provides `signDual()` and `verifyDual()` functions
- Audit chain entries are dual-signed

### Phase 2: PQC Primary (Target: v2.0)
- ML-DSA-65 becomes the primary signature algorithm
- Ed25519 maintained as a "legacy verification" fallback
- New packets signed PQC-first, classical-second
- Existing Ed25519-only packets remain verifiable

### Phase 3: PQC Only (Target: v3.0, post-2030)
- Ed25519 signatures deprecated and removed from new packets
- Historical Ed25519-signed packets remain in audit chain (read-only verification)
- All new signing uses ML-DSA-65 exclusively

## ML-DSA-65 Selection Rationale

| Criterion | ML-DSA-44 | ML-DSA-65 | ML-DSA-87 |
|-----------|-----------|-----------|-----------|
| NIST Security Level | 2 | 3 | 5 |
| Public Key Size | 1312 B | 1952 B | 2592 B |
| Signature Size | 2420 B | 3293 B | 4595 B |
| Signing Speed | Fast | Fast | Moderate |
| Use Case | Low-value | **Standard** | High-value |

ML-DSA-65 (Security Level 3) balances security and performance for Munin's use case. Level 3 provides security roughly equivalent to AES-192, which exceeds current government requirements for OFFICIAL-SENSITIVE data.

## Implementation Notes

### Current Demo Implementation (`lib/pqc.ts`)
The current PQC module simulates ML-DSA using SHA-256 hash-based signatures. This is clearly marked as a demo and is not quantum-resistant. The API surface (`signPQC`, `verifyPQC`, key generation) matches the production interface.

### Production Implementation Path
1. Install `liboqs` (Open Quantum Safe project) C library
2. Use Node.js FFI bindings (`node-liboqs`) or compile a native addon
3. Replace SHA-256 simulation with actual ML-DSA-65 calls
4. No API changes required — `signDual()` and `verifyDual()` remain the same

### Hash Function Migration
SHA-256 is believed to be quantum-resistant (Grover's algorithm reduces security level from 256 to 128 bits, which is still sufficient). No migration needed for:
- Merkle chain hashing
- Audit log hash chaining
- HMAC-based session tokens

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Quantum computers break Ed25519 before Phase 2 | Low (pre-2030) | High | Dual-stack provides PQC signature today |
| ML-DSA found to have a weakness | Very Low | High | SLH-DSA (FIPS 205) as fallback; hash-based backup |
| liboqs library not maintained | Low | Medium | Multiple PQC libraries available; algorithm is standardized |
| Signature size impacts air-gapped bandwidth | Low | Low | ML-DSA-65 signatures are 3.3KB; acceptable for packet-level signing |

## References

- NIST FIPS 204: Module-Lattice-Based Digital Signature Standard
- NIST SP 800-208: Recommendation for Stateful Hash-Based Signature Schemes
- NIST IR 8413: Status Report on the Third Round of the NIST Post-Quantum Cryptography Standardization Process
