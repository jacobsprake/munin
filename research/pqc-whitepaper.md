# Post-Quantum Cryptography: Why DILITHIUM-3 is Required

**Technical Analysis: Cryptographic Future-Proofing for Sovereign Infrastructure**

---

## Executive Summary

**Munin uses DILITHIUM-3 (NIST FIPS 204) for all critical command signatures. This decision is not optional—it is architecturally necessary for a system that must remain secure through 2030 and beyond.**

**The Threat**: Quantum computers will break current cryptographic signatures (RSA, ECDSA) by 2030. Any system that relies on classical cryptography will be vulnerable to "Harvest Now, Decrypt Later" attacks.

**The Solution**: Post-Quantum Cryptography (PQC) algorithms that are resistant to both classical and quantum attacks.

**The Decision**: DILITHIUM-3 is the NIST-standardized digital signature algorithm that provides the best balance of security, performance, and signature size for sovereign infrastructure systems.

---

## The Quantum Threat Timeline

### Current State (2026)

- **Classical Cryptography**: RSA-2048, ECDSA (P-256) are secure
- **Quantum Computers**: No practical quantum computer exists yet
- **Threat Level**: Low (but growing)

### Near Future (2030-2035)

- **Quantum Computers**: Practical quantum computers with 1,000+ qubits expected
- **Classical Cryptography**: RSA-2048, ECDSA will be broken by Shor's algorithm
- **Threat Level**: High
- **"Harvest Now, Decrypt Later"**: Attackers are already collecting encrypted data to decrypt later

### Why This Matters for Munin

**Munin's handshake packets contain:**
- Critical infrastructure commands
- Multi-ministry authorization signatures
- Legal compliance proofs
- Immutable audit trails

**If these packets are signed with classical cryptography (RSA, ECDSA), they will be vulnerable to quantum decryption by 2030. This is unacceptable for a sovereign infrastructure system that must remain secure for decades.**

---

## Why DILITHIUM-3?

### NIST Standardization

**DILITHIUM-3 is part of NIST FIPS 204**, the standardized post-quantum digital signature algorithm. It was selected after a 6-year competition (2016-2022) that evaluated 82 candidate algorithms.

**Why NIST Standardization Matters:**
- Regulatory compliance (required for government systems)
- Interoperability (other systems will use the same standard)
- Security assurance (extensively cryptanalyzed)
- Long-term support (NIST will maintain the standard)

### Algorithm Comparison

| Algorithm | Security Level | Signature Size | Key Size | Performance |
|-----------|---------------|---------------|----------|-------------|
| **DILITHIUM-3** | 128-bit (quantum) | 3,293 bytes | 1,952 bytes (public) | Fast |
| RSA-2048 | 112-bit (classical) | 256 bytes | 256 bytes (public) | Slow |
| ECDSA (P-256) | 128-bit (classical) | 64 bytes | 64 bytes (public) | Fast |

**Trade-offs:**
- **Signature Size**: DILITHIUM-3 signatures are larger (3,293 bytes vs. 256 bytes for RSA), but this is acceptable for sovereign infrastructure systems where security is paramount
- **Performance**: DILITHIUM-3 is faster than RSA for signing and verification
- **Security**: DILITHIUM-3 provides 128-bit quantum security, while RSA-2048 provides only 112-bit classical security (and will be broken by quantum computers)

### Why Not KYBER?

**KYBER-768 is a Key Encapsulation Mechanism (KEM), not a digital signature algorithm.**

- **KYBER**: Used for key exchange (encryption)
- **DILITHIUM**: Used for digital signatures (authentication)

**Munin needs digital signatures, not encryption, for handshake packets. Therefore, DILITHIUM-3 is the correct choice.**

(Note: If Munin needed encryption in the future, KYBER-768 would be the appropriate choice.)

---

## Technical Implementation

### Signature Generation

```python
# Pseudocode (actual implementation will be in Rust for performance)
def generate_signature(private_key, message):
    """
    Generate DILITHIUM-3 signature for message.
    
    Args:
        private_key: DILITHIUM-3 private key (4,000 bytes)
        message: Message to sign (handshake packet)
    
    Returns:
        signature: DILITHIUM-3 signature (3,293 bytes)
    """
    # DILITHIUM-3 signing algorithm
    # (Based on lattice-based cryptography)
    signature = dilithium3_sign(private_key, message)
    return signature
```

### Signature Verification

```python
def verify_signature(public_key, message, signature):
    """
    Verify DILITHIUM-3 signature.
    
    Args:
        public_key: DILITHIUM-3 public key (1,952 bytes)
        message: Original message (handshake packet)
        signature: DILITHIUM-3 signature (3,293 bytes)
    
    Returns:
        is_valid: True if signature is valid, False otherwise
    """
    is_valid = dilithium3_verify(public_key, message, signature)
    return is_valid
```

### Integration with Handshake Packets

**Each handshake packet includes:**

```typescript
{
  // ... other fields ...
  pqc: {
    algorithm: 'DILITHIUM-3',
    publicKey: string,      // 1,952 bytes (base64 encoded)
    signature: string,     // 3,293 bytes (base64 encoded)
    timestamp: string
  }
}
```

**Signing Process:**
1. Generate handshake packet (metadata, evidence, regulatory basis)
2. Serialize packet to JSON
3. Compute hash: `hash = SHA-256(packet_json)`
4. Sign hash with DILITHIUM-3: `signature = DILITHIUM3_SIGN(private_key, hash)`
5. Attach signature to packet

**Verification Process:**
1. Extract signature and public key from packet
2. Recompute hash: `hash = SHA-256(packet_json)`
3. Verify signature: `is_valid = DILITHIUM3_VERIFY(public_key, hash, signature)`
4. If valid, packet is authentic and unmodified

---

## Performance Characteristics

### Signing Performance

- **Latency**: <10ms per signature (on modern CPU)
- **Throughput**: 100+ signatures/second
- **Memory**: ~4KB for private key, ~2KB for public key

**This is acceptable for Munin's use case:**
- Handshake packets are generated infrequently (during crises)
- Sub-100ms signing latency is negligible compared to human authorization time (5 minutes per ministry)
- Signature size (3,293 bytes) is acceptable for sovereign infrastructure systems

### Verification Performance

- **Latency**: <5ms per verification (on modern CPU)
- **Throughput**: 200+ verifications/second
- **Memory**: ~2KB for public key

**This enables real-time verification:**
- Each ministry can verify handshake packets instantly
- Audit systems can verify historical packets in batch
- No performance bottleneck for sovereign operations

---

## Security Analysis

### Quantum Resistance

**DILITHIUM-3 provides 128-bit quantum security**, meaning:
- A quantum computer would need 2^128 operations to break the signature
- This is computationally infeasible even with future quantum computers
- Provides security margin through 2050 and beyond

### Classical Security

**DILITHIUM-3 also provides strong classical security:**
- Resistant to classical attacks (lattice reduction, etc.)
- No known classical attacks that break DILITHIUM-3
- Security based on hardness of lattice problems (well-studied)

### Side-Channel Resistance

**DILITHIUM-3 is designed to be side-channel resistant:**
- Constant-time operations (prevents timing attacks)
- No secret-dependent branches (prevents branch prediction attacks)
- Suitable for TEE enclave implementation (hardware-rooted security)

---

## Implementation Roadmap

### Current Status

- **Algorithm Selected**: DILITHIUM-3 (NIST FIPS 204)
- **Architecture Defined**: Handshake packets include PQC signature fields
- **Implementation**: Not yet implemented (requires Rust expert)

### Production Requirements

**See [TECHNICAL_REQUISITES.md](../TECHNICAL_REQUISITES.md) for detailed requirements.**

**Required:**
- Rust expert with PQC experience
- TEE integration (Intel SGX/ARM TrustZone)
- Performance optimization for sub-100ms signing
- Hardware attestation integration

### Timeline

- **Phase 1 (Months 1-3)**: Implement DILITHIUM-3 in Rust
- **Phase 2 (Months 4-6)**: Integrate with TEE enclaves
- **Phase 3 (Months 7-12)**: Production hardening and performance optimization

---

## References

- **NIST FIPS 204**: [Digital Signature Standard (DSS)](https://csrc.nist.gov/publications/detail/fips/204/final)
- **NIST PQC Competition**: [Post-Quantum Cryptography Standardization](https://csrc.nist.gov/projects/post-quantum-cryptography)
- **DILITHIUM Specification**: [CRYSTALS-Dilithium Algorithm Specifications](https://pq-crystals.org/dilithium/)
- **Quantum Threat Timeline**: [NIST Post-Quantum Cryptography FAQ](https://csrc.nist.gov/projects/post-quantum-cryptography/post-quantum-cryptography-standardization/faqs)

---

## Conclusion

**DILITHIUM-3 is required for Munin.**

**The state's infrastructure must remain secure through 2030 and beyond. Classical cryptography (RSA, ECDSA) will be broken by quantum computers. Post-quantum cryptography (DILITHIUM-3) is the only solution.**

**This decision ensures Munin remains secure through 2030 and beyond.**

