# ADR-005: Ed25519 + ML-DSA Dual-Stack Cryptography

**Date:** 2026-01-08

## Status

Accepted

## Context

Munin signs every packet in the system — sensor telemetry ingestion records, dependency graph updates, quorum decisions, audit log entries, and inter-component messages. These signatures serve two purposes: integrity verification (the data has not been tampered with) and non-repudiation (the origin of the data is cryptographically attributable).

Infrastructure dependency data signed today must remain trustworthy for decades. A dependency graph that was accurate in 2026 may be referenced during incident investigations in 2040 or 2050. If the signatures on historical data can be forged retroactively, the entire audit trail loses its evidentiary value.

The emergence of cryptographically relevant quantum computers (CRQCs) threatens all classical public-key cryptography. While the timeline for CRQCs is uncertain, the "harvest now, decrypt later" threat is immediate: adversaries can capture signed data today and forge signatures once quantum computers become available. For infrastructure dependency maps — which are high-value intelligence assets — this is a credible threat.

NIST finalized the ML-DSA (formerly CRYSTALS-Dilithium) post-quantum signature standard in August 2024 (FIPS 204). This provides a standardized PQC signature scheme suitable for production use. However, PQC implementations are still maturing. Side-channel resistance, performance optimization, and interoperability testing are ongoing. Relying exclusively on a PQC algorithm that has been standardized for less than two years introduces implementation risk.

Ed25519, by contrast, has over a decade of deployment experience, extensive cryptanalysis, and battle-tested implementations across every major platform. It is well-understood, fast, and produces compact signatures. Its only weakness is vulnerability to quantum attack.

## Decision

Every signed packet in Munin carries two signatures: one Ed25519 signature and one ML-DSA-65 signature. Both signatures must verify for the packet to be accepted.

The dual-stack approach provides defense in depth:
- If ML-DSA is broken (due to a cryptanalytic advance against lattice-based schemes), Ed25519 remains intact and signatures are still valid under classical assumptions.
- If Ed25519 is broken (due to a CRQC), ML-DSA remains intact and signatures are still valid under post-quantum assumptions.
- Both algorithms would need to be broken simultaneously to forge a signature — an event that would require fundamentally different attack capabilities applied concurrently.

Key generation produces a composite key pair containing both an Ed25519 key pair and an ML-DSA-65 key pair. The composite public key is the concatenation of both public keys. Key management operations (rotation, revocation, backup) always operate on the composite key as an atomic unit.

Signature verification is performed by checking both signatures independently. A packet is considered valid only if both signatures verify against the respective public keys. There is no fallback mode that accepts a single signature.

The signature format includes algorithm identifiers and version numbers to support future algorithm agility. If ML-DSA is superseded by a future NIST standard, or if a third algorithm layer is needed, the format can accommodate changes without breaking backward compatibility.

## Consequences

**Positive:**
- Protection against harvest-now-decrypt-later attacks. Historical signatures remain valid even if quantum computers break Ed25519.
- Protection against PQC algorithm failure. If ML-DSA is found to have a weakness, Ed25519 provides continued security under classical assumptions.
- Alignment with emerging government cryptographic guidance (NSA CNSA 2.0 suite, which mandates PQC adoption for national security systems by 2030).
- Algorithm agility built into the protocol from day one, avoiding a painful migration later.

**Negative:**
- Increased signature size. ML-DSA-65 signatures are approximately 3,293 bytes compared to Ed25519's 64 bytes. Every packet is ~3.3 KB larger. For high-frequency telemetry, this increases storage and bandwidth requirements.
- Increased computational cost. ML-DSA signing and verification are slower than Ed25519 alone. Benchmarks show approximately 3x slower signing and 2x slower verification compared to Ed25519 alone.
- Implementation complexity. Two signature libraries must be maintained, tested, and kept current with security patches. The composite key management logic adds code complexity.
- Larger key sizes. ML-DSA-65 public keys are approximately 1,952 bytes compared to Ed25519's 32 bytes. Key distribution and storage must accommodate this.

## Alternatives Considered

**PQC-only (ML-DSA without Ed25519):** Use only ML-DSA signatures, providing quantum resistance without the overhead of dual signatures. This was rejected because ML-DSA implementations are immature. Side-channel vulnerabilities, implementation bugs, or cryptanalytic advances against lattice-based schemes could compromise the entire signature infrastructure with no fallback. The risk of depending solely on a recently standardized algorithm for critical infrastructure security is unacceptable.

**Classical-only (Ed25519 without PQC):** Use only Ed25519 signatures, deferring PQC adoption until implementations mature. This was rejected because it leaves all current signatures vulnerable to future quantum attacks. Infrastructure dependency data signed today under Ed25519 alone could be forged by an adversary with a CRQC in 2035 or 2040. The cost of adding PQC now is manageable; the cost of retroactively re-signing all historical data is prohibitive.

**Sequential migration:** Deploy with Ed25519 now, migrate to ML-DSA later when implementations mature. This creates a transition period during which signatures use only one algorithm, and all data signed before the migration remains quantum-vulnerable. It also requires a complex migration procedure — re-signing historical data, updating all verification logic, coordinating across deployments. The dual-stack approach avoids this entirely by deploying both algorithms from the start.
