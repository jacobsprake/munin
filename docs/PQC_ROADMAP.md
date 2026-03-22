# Post-Quantum Cryptography Roadmap

## Current State

- **Ed25519 classical signing**: Production-ready. Used for all current Authoritative Handshake signing operations.
- **ML-DSA (PQC) signing**: SHA-256 structural placeholder. The interface (`generatePQCKeyPair()`, `signWithPQC()`, `verifyPQCSignature()`) and dual-stack architecture are complete. The underlying cryptographic primitive is not yet quantum-resistant.
- **Dual-stack architecture**: Every packet is designed to carry both a classical (Ed25519) and a post-quantum (ML-DSA-65) signature. This architecture is implemented and tested at the interface level.

---

## Phases

### Phase 1 — Current

- Ed25519 signing for all operations.
- PQC interface designed and implemented as a drop-in replacement target.
- SHA-256 used as a structural placeholder behind the PQC interface.
- All callers use the stable PQC API — no code changes required when the backend is swapped.

### Phase 2 — With Funding (~4 weeks)

- Integrate **liboqs Node.js bindings** (via oqs-provider or native addon).
- Replace SHA-256 placeholder with actual **ML-DSA-65 (Dilithium-3)** key generation, signing, and verification.
- Run **NIST FIPS 204 test vectors** to validate correctness.
- Benchmark signing and verification performance. ML-DSA-65 signatures are ~3,300 bytes; ensure packet size budgets accommodate this.

### Phase 3 — ~8 weeks

- **Dual-stack verification in CI**: every test packet must carry both Ed25519 and ML-DSA-65 signatures.
- Classical (Ed25519) verification is **required** — packet rejected if classical signature fails.
- PQC (ML-DSA-65) verification is **logged but advisory** — verification failures generate alerts but do not reject packets. This surfaces implementation bugs without blocking operations.
- Monitor PQC verification success rate. Target: 100% before Phase 4.

### Phase 4 — ~6 months

- **HSM binding** for PQC key storage (PKCS#11 or vendor-specific API).
- PQC verification becomes **mandatory** — packets without valid ML-DSA-65 signatures are rejected.
- Classical Ed25519 signatures become **legacy-only**, retained for backward compatibility with older nodes.
- Key rotation procedures established for both classical and PQC key pairs.

---

## Why ML-DSA-65

- **NIST FIPS 204**, standardized August 2024. This is not experimental — it is a federal standard.
- **128-bit security level** against both classical and quantum adversaries.
- Based on the **CRYSTALS-Dilithium** lattice scheme, extensively studied since Round 2 of the NIST PQC competition.
- **Chosen over FALCON**: ML-DSA has a simpler implementation with no floating-point arithmetic requirements. FALCON's reliance on discrete Gaussian sampling over floating-point introduces platform-dependent behavior that complicates cross-platform deployment.
- **Chosen over SPHINCS+**: ML-DSA produces significantly smaller signatures (~3,300 bytes vs ~17,000–49,000 bytes for SPHINCS+). For infrastructure packets that traverse constrained networks, signature size matters.

## Why Dual-Stack

- **NIST recommends hybrid approaches** for the migration period (NIST SP 800-208 guidance). No single algorithm family should be a single point of cryptographic failure.
- **If a PQC algorithm is broken**: classical Ed25519 signatures provide an independent verification path. The system degrades gracefully rather than failing completely.
- **If RSA/ECC is broken by quantum computers**: PQC signatures provide protection. The system is quantum-resistant from the moment Phase 4 is complete.
- **Operational continuity**: during the transition, operators can verify packets with whichever stack their tooling supports. No flag day required.
