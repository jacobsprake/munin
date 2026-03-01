# Munin Production Security Roadmap

> From Functional Prototype to Government-Certified Platform

This document specifies every security hardening task required to move Munin from its current state (validated functional prototype) to a platform that can pass government security certification (UK NCSC, US FedRAMP, NATO COSMIC).

---

## Current Status Summary

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| Password hashing | ✅ Argon2id | Argon2id + HSM-backed pepper | Minor |
| Session auth | ✅ HMAC-SHA256 tokens | Mutual TLS + session tokens | Medium |
| Audit log | ✅ Merkle hash chain | Hash chain + per-entry Ed25519 signatures | Medium |
| Ed25519 signatures | ✅ @noble/ed25519 | HSM-backed signing | Hardware |
| M-of-N multi-sig | ✅ Byzantine quorum model | Threshold signatures (Shamir/FROST) | Medium |
| Air-gap CSP | ✅ All external origins blocked | Hardware data diode + CSP | Hardware |
| Rate limiting | ✅ In-memory per-IP | Redis-backed distributed rate limiting | Medium |
| PQC (Dilithium-3) | ⚠️ Simulated | Real NIST liboqs bindings | High |
| TEE (Intel SGX) | ⚠️ Simulated | Real SGX SDK integration | Hardware |
| ZKP proofs | ⚠️ Simulated | circom/snarkjs circuits | High |
| Key storage | ⚠️ SQLite plaintext | FIPS 140-3 HSM (Thales Luna / AWS CloudHSM) | Hardware |
| HTTPS/TLS | ⚠️ Config only | Enforced mutual TLS with pinned certs | Medium |
| Physical verification | ⚠️ Simulated | Real RF/acoustic sensor integration | Hardware |
| Formal verification | ❌ None | TLA+ / Coq proofs for critical invariants | High |

---

## Phase 1: Software Hardening (No Hardware Required)

**Timeline: 4–6 weeks | Team: 2 senior engineers**

### 1.1 Audit Log Signing
**Priority: CRITICAL**

Every audit log entry must be individually signed with the system's Ed25519 key, not just hash-chained. This proves who wrote each entry.

```
Current:  entry_hash = SHA-256(canonical_payload + prev_hash)
Target:   entry_hash = SHA-256(canonical_payload + prev_hash)
          signature  = Ed25519.sign(entry_hash, system_private_key)
```

**Acceptance criteria:**
- [ ] Each audit log entry has a valid Ed25519 signature
- [ ] `verifyChainIntegrity()` also verifies signatures
- [ ] Signature verification fails if entry is tampered
- [ ] System signing key is loaded from environment variable, not hardcoded

**Files:** `lib/audit/auditLog.ts`, `lib/audit/ed25519.ts`

### 1.2 Key Rotation API
**Priority: HIGH**

Ministry signing keys must be rotatable without downtime. When a key is compromised, the old key is revoked and a new one issued.

**API:**
```
POST /api/ministries/:id/rotate-key
  → Generates new Ed25519 key pair
  → Revokes old key (status: ROTATED)
  → Stores old key in key_history table
  → Returns new public key

POST /api/ministries/:id/revoke-key
  → Marks key as REVOKED
  → Blocks all signing with this key
  → Audit logs the revocation
```

**Acceptance criteria:**
- [ ] Key rotation creates new key and archives old one
- [ ] Revoked keys cannot sign decisions
- [ ] Key history is immutable (append-only)
- [ ] All key operations are audit-logged

**Files:** `lib/audit/keyManagement.ts`, `app/api/ministries/[id]/route.ts`

### 1.3 Mutual TLS Configuration
**Priority: HIGH**

In production, all API communication must use mutual TLS (both client and server present certificates). This prevents man-in-the-middle attacks even within the air-gapped network.

**Configuration:**
```yaml
# next.config.js or reverse proxy (nginx/caddy)
tls:
  cert: /etc/munin/tls/server.crt
  key: /etc/munin/tls/server.key
  ca: /etc/munin/tls/ca.crt          # CA that signs ministry client certs
  clientAuth: require                  # Reject connections without valid client cert
  minVersion: TLSv1.3                  # No TLS 1.2 or below
  cipherSuites:
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
```

**Acceptance criteria:**
- [ ] Server rejects connections without valid client certificate
- [ ] Each ministry has a unique client certificate
- [ ] Certificate revocation list (CRL) is checked on each connection
- [ ] TLS 1.2 and below are rejected

### 1.4 Input Validation Hardening
**Priority: HIGH**

All API inputs must be validated against JSON Schema contracts. The `contracts/` directory already has schema definitions — enforce them.

**Acceptance criteria:**
- [ ] Every POST/PUT API route validates input against its JSON Schema
- [ ] Invalid input returns 400 with specific validation error
- [ ] SQL injection is impossible (all queries use parameterized statements — VERIFY)
- [ ] XSS is impossible (React auto-escapes, CSP blocks inline scripts — VERIFY)

### 1.5 Secure Session Improvements
**Priority: MEDIUM**

- [ ] Session tokens bound to client IP (reject if IP changes)
- [ ] Session tokens bound to User-Agent (reject if UA changes)
- [ ] Configurable session inactivity timeout (separate from absolute TTL)
- [ ] Session token regeneration after privilege escalation
- [ ] All sessions revoked on password change

**Files:** `lib/auth/sessions.ts`

### 1.6 Secrets Management
**Priority: MEDIUM**

Production deployments must never use fallback secrets.

- [ ] `SESSION_SECRET` — fail startup if not set in production
- [ ] `SYSTEM_SIGNING_KEY` — Ed25519 private key for audit log signing
- [ ] `DATABASE_ENCRYPTION_KEY` — SQLite encryption key (via SQLCipher)
- [ ] All secrets loaded from environment or mounted volume (never from code)
- [ ] Startup health check verifies all required secrets are present

---

## Phase 2: Cryptographic Hardening (Specialist Engineers)

**Timeline: 8–12 weeks | Team: 1 cryptographic engineer + 1 senior dev**

### 2.1 Post-Quantum Cryptography (CRYSTALS-Dilithium)
**Priority: CRITICAL for long-term**

Replace the simulated PQC module with real NIST-standardized implementations.

**Options:**
1. **liboqs-node** — Node.js bindings for the Open Quantum Safe library
2. **pqcrypto WASM** — Compile Dilithium reference implementation to WebAssembly
3. **External signing service** — Separate Go/Rust microservice with real PQC

**Target algorithm:** ML-DSA-65 (FIPS 204, Dilithium-3 parameter set)
- Public key: 1952 bytes
- Signature: 3293 bytes
- Security level: NIST Level 3 (128-bit quantum security)

**Acceptance criteria:**
- [ ] `generatePQCKeyPair()` returns real Dilithium-3 keys
- [ ] `signWithPQC()` produces a cryptographically valid signature
- [ ] `verifyPQCSignature()` rejects tampered messages
- [ ] Interoperable with liboqs reference implementation
- [ ] Performance: key gen < 10ms, sign < 5ms, verify < 5ms

**Files:** `lib/pqc.ts` — complete rewrite

### 2.2 Zero-Knowledge Proofs
**Priority: HIGH for compliance**

ZKP allows Munin to prove compliance statements (e.g., "all water pressure readings are above safety threshold") without revealing the actual sensor values. This is critical for:
- Cross-agency audits where data is classified
- Regulatory compliance without exposing operational secrets
- Public accountability without compromising national security

**Implementation plan:**
1. Define circuits in circom for each compliance statement
2. Generate proving/verification keys (trusted setup)
3. Proof generation: run circuit with private inputs → produce proof
4. Verification: check proof against public statement → true/false

**Target circuits:**
```
circuit WaterSafety:
  private input: pressureReadings[N]
  public input:  safetyThreshold
  output:        allAboveThreshold (boolean)
  
circuit GridStability:
  private input: frequencyReadings[N]
  public input:  minFreq, maxFreq
  output:        allWithinBounds (boolean)

circuit AuditIntegrity:
  private input: auditEntries[N], merkleRoot
  public input:  claimedEntryCount
  output:        chainValid (boolean)
```

**Acceptance criteria:**
- [ ] Real ZK-SNARK proofs generated (not hash simulations)
- [ ] Proofs are verifiable by any party with the verification key
- [ ] Private inputs cannot be extracted from the proof
- [ ] Proof size < 1KB, verification time < 100ms

**Files:** `lib/zkp_audit.ts` — complete rewrite, new `circuits/` directory

### 2.3 Threshold Signatures (FROST)
**Priority: MEDIUM**

Replace the current M-of-N model (separate signatures) with threshold signatures (FROST protocol) where M-of-N parties collaboratively produce a single signature that is indistinguishable from a regular signature.

**Benefits:**
- Smaller signature size (one signature instead of M separate ones)
- Key shares can be distributed without revealing the master key
- Compatible with existing Ed25519 verification

**Acceptance criteria:**
- [ ] Distributed key generation (DKG) produces key shares for N ministries
- [ ] M ministries can collaboratively sign without revealing their shares
- [ ] The resulting signature is a standard Ed25519 signature
- [ ] Fewer than M ministries cannot produce a valid signature

---

## Phase 3: Hardware Integration (Requires Procurement)

**Timeline: 12–20 weeks | Team: 1 hardware engineer + 1 senior dev**

### 3.1 Trusted Execution Environment (Intel SGX)
**Priority: CRITICAL for hardware-rooted trust**

The TEE ensures that even with root access to the server, an attacker cannot:
- Extract signing keys
- Forge signatures
- Tamper with the Logic-Lock validation

**Requirements:**
- Intel Xeon Scalable processor with SGX2 support
- Intel SGX SDK (Linux)
- Enclave binary for command signing and key management

**Implementation:**
1. Write enclave code in C/C++ using Intel SGX SDK
2. Enclave holds private signing keys (never leaves enclave)
3. Node.js communicates with enclave via Unix socket or shared memory
4. Attestation quotes are verified with Intel Attestation Service (IAS) — or DCAP for air-gapped environments

**Acceptance criteria:**
- [ ] Signing keys are generated inside the enclave
- [ ] Keys cannot be read even by root/admin
- [ ] Remote attestation proves enclave code integrity
- [ ] Logic-Lock validation runs inside the enclave

**Files:** `lib/tee.ts` — rewrite to call real enclave, new `enclave/` directory

### 3.2 Hardware Security Module (HSM)
**Priority: CRITICAL for key protection**

All cryptographic keys (Ed25519, Dilithium-3, system signing key) must be stored in a FIPS 140-3 Level 3 certified HSM.

**Options:**
- **Thales Luna Network HSM** — on-premises, air-gap compatible
- **Utimaco CryptoServer** — Common Criteria EAL4+ certified
- **nCipher nShield** — FIPS 140-2 Level 3

**Integration:**
```
PKCS#11 Interface
  ├── Key generation (keys never leave HSM)
  ├── Signing operations (data sent to HSM, signature returned)
  ├── Key rotation (old key archived in HSM)
  └── Key destruction (secure erase)
```

**Acceptance criteria:**
- [ ] All signing keys stored in HSM, not in database
- [ ] Signing operations go through PKCS#11 interface
- [ ] HSM audit log tracks all key operations
- [ ] Key extraction is physically impossible

### 3.3 Hardware Data Diode
**Priority: HIGH for air-gap guarantee**

Software air-gaps can be bypassed. A hardware data diode physically prevents data from flowing outbound.

**Options:**
- **Owl Cyber Defense DualDiode** — military-grade, one-way data flow
- **Waterfall Security** — industrial data diode
- **Advenica SecuriCDS** — cross-domain solution

**Architecture:**
```
SCADA Network → [Hardware Data Diode] → Munin Server
                  (one-way only)
                  
Munin Server ←✗→ Internet (physically impossible)
```

### 3.4 Physical Verification Sensors
**Priority: MEDIUM for Stuxnet-class defense**

Real RF/acoustic sensors that verify SCADA readings against physical reality.

**Requirements:**
- Software-Defined Radio (SDR) for RF fingerprinting
- Acoustic sensors (MEMS microphones) for vibration analysis
- Raspberry Pi or similar edge compute for sensor processing
- One-way data feed into Munin via data diode

---

## Phase 4: Certification & Compliance

**Timeline: 16–24 weeks | Team: Security consultant + legal**

### 4.1 Penetration Testing
- [ ] CREST-certified penetration test (UK) or equivalent
- [ ] Red team exercise simulating insider threat
- [ ] Code review by independent security firm

### 4.2 Formal Verification
- [ ] TLA+ specification of the Byzantine multi-sig protocol
- [ ] Coq proof that Logic-Lock invariants cannot be bypassed
- [ ] Model checking of the Merkle chain for all possible tampering scenarios

### 4.3 Compliance Certifications

| Certification | Jurisdiction | Covers |
|---------------|-------------|--------|
| **Cyber Essentials Plus** | UK (NCSC) | Basic security hygiene |
| **ISO 27001** | International | Information security management |
| **Common Criteria EAL4+** | International | Product security evaluation |
| **FIPS 140-3 Level 3** | US (NIST) | Cryptographic module validation |
| **FedRAMP High** | US (GSA) | Cloud/on-prem government systems |
| **NATO COSMIC** | NATO | Alliance-level classified systems |

### 4.4 Supply Chain Security
- [ ] All dependencies audited (npm audit, pip audit)
- [ ] SBOM (Software Bill of Materials) generated
- [ ] No dependencies with known CVEs in production
- [ ] Reproducible builds (same source → same binary)
- [ ] Signed releases with GPG/Sigstore

---

## Phase 5: Operational Security

### 5.1 Deployment Checklist

```
Pre-deployment:
  □ SESSION_SECRET set (256-bit, from /dev/urandom)
  □ SYSTEM_SIGNING_KEY set (Ed25519 private key)
  □ DATABASE_PATH points to encrypted volume
  □ ENFORCE_HTTPS=true
  □ NODE_ENV=production
  □ All default credentials changed
  □ Rate limiting configured
  □ Backup encryption key set
  □ Air-gap verified (no DNS resolution, no outbound TCP)

Post-deployment:
  □ Health check passes (GET /api/health/readiness)
  □ Audit log chain integrity verified
  □ Ministry keys registered
  □ Test login and session creation
  □ Test packet authorization flow (M-of-N)
  □ Verify CSP headers present on all responses
  □ Run ./scripts/verify_demo.sh
```

### 5.2 Incident Response Plan

1. **Key compromise detected** → Revoke key immediately via API, notify all ministries
2. **Audit chain broken** → Halt all operations, investigate from last checkpoint
3. **Unauthorized access** → Revoke all sessions, rotate SESSION_SECRET, audit logs
4. **Data diode failure** → Physical inspection, switch to backup diode
5. **HSM failure** → Failover to backup HSM, no degraded mode (system halts)

### 5.3 Backup & Recovery

- SQLite database: encrypted backup every 4 hours to EMP-shielded vault
- Audit log: replicated to separate append-only storage
- Configuration: versioned in Git (this repo)
- Keys: HSM maintains its own backup (cross-HSM replication)
- Recovery: restore from Digital Asset Vault (engine/digital_asset_vault.py)

---

## Engineering Resource Requirements

| Phase | Duration | Team | Hardware Budget |
|-------|----------|------|----------------|
| Phase 1: Software hardening | 4–6 weeks | 2 senior engineers | $0 |
| Phase 2: Crypto hardening | 8–12 weeks | 1 crypto engineer + 1 dev | $0 |
| Phase 3: Hardware integration | 12–20 weeks | 1 HW engineer + 1 dev | $50K–200K |
| Phase 4: Certification | 16–24 weeks | Security consultant + legal | $100K–500K |
| Phase 5: Operations | Ongoing | 1 SRE + 1 security engineer | $0 (personnel) |

**Total estimated budget: $150K–700K (hardware + certification)**
**Total estimated timeline: 9–15 months from prototype to certified**

---

## References

- NIST SP 800-63B: Digital Identity Guidelines (Authentication)
- NIST SP 800-57: Key Management Recommendations
- NIST FIPS 204: ML-DSA (Dilithium) Standard
- OWASP ASVS: Application Security Verification Standard
- UK NCSC Cyber Essentials Technical Requirements
- Common Criteria ISO/IEC 15408
- Intel SGX Developer Guide
- FROST: Flexible Round-Optimized Schnorr Threshold Signatures (RFC 9591)
