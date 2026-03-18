# Trusted Execution Environment Architecture

**Document ID:** TD-001
**Classification:** OFFICIAL - SENSITIVE
**Version:** 0.4.0-draft
**Last Updated:** 2026-03-18
**Owner:** Munin Safety Engineering
**Review Cycle:** Quarterly

---

## 1. Purpose

This document specifies the Trusted Execution Environment (TEE) architecture for the Munin platform. The TEE subsystem provides hardware-enforced isolation for sensitive computations, including cryptographic operations, quorum verification, and integrity-critical analysis components.

---

## 2. Design Rationale

### 2.1 Why TEEs

Munin operates in environments where the host operating system and hypervisor may not be fully trusted. TEEs provide:

1. **Confidentiality:** Sensitive computations (key operations, quorum logic) are protected even from a compromised host.
2. **Integrity:** TEE attestation proves that the correct code is executing, preventing tampering.
3. **Non-repudiation:** Attestation reports provide cryptographic evidence that a specific computation occurred within a verified enclave.

### 2.2 Advisory-Only Constraint

The TEE subsystem operates within Munin's advisory-only architecture. TEE-protected computations produce verified recommendations, not actuations. The data diode guarantee is maintained at the network layer, independent of TEE integrity.

---

## 3. Multi-Vendor Approach

### 3.1 Supported TEE Platforms

Munin adopts a multi-vendor TEE strategy to avoid single-vendor dependency and provide deployment flexibility across infrastructure environments.

| Platform | Vendor | Primary Use Case | Deployment Target |
|----------|--------|-----------------|-------------------|
| Intel SGX (Software Guard Extensions) | Intel | Server-class enclaves; quorum verification; key operations | x86 server deployments |
| AMD SEV (Secure Encrypted Virtualisation) | AMD | VM-level isolation; full analysis workload protection | Cloud and virtualised deployments |
| ARM TrustZone | ARM | Edge and embedded deployments; resource-constrained environments | Field-deployed analysis nodes |

### 3.2 Abstraction Layer

The TEE abstraction layer (`lib/tee/enclave.ts`) provides a unified API across all three platforms:

```
TEEAbstraction {
  // Lifecycle
  initialise(platform: TEEPlatform): EnclaveHandle
  destroy(handle: EnclaveHandle): void

  // Attestation
  generateAttestation(handle: EnclaveHandle): AttestationReport
  verifyAttestation(report: AttestationReport): VerificationResult

  // Computation
  executeSecure(handle: EnclaveHandle, fn: SecureFunction, input: SealedData): SealedResult

  // Key Management
  sealData(handle: EnclaveHandle, data: Buffer): SealedData
  unsealData(handle: EnclaveHandle, sealed: SealedData): Buffer
}
```

### 3.3 Platform-Specific Considerations

| Aspect | SGX | SEV | TrustZone |
|--------|-----|-----|-----------|
| Isolation granularity | Process-level enclave | VM-level encryption | World-level (Secure/Normal) |
| Memory limit | EPC size (128-512 MB typical) | Full VM memory | Partition-defined |
| Attestation model | EPID / DCAP | SEV-SNP attestation | Platform-specific |
| Side-channel resilience | Requires careful coding; known vulnerability history | Stronger isolation model | Hardware-dependent |
| Remote attestation | Mature (IAS / DCAP) | Maturing (SEV-SNP) | Limited standardisation |
| Availability | Widely deployed in data centres | Growing cloud availability | Ubiquitous in ARM SoCs |

---

## 4. Attestation Flow

### 4.1 Local Attestation

```
+------------------+          +------------------+
| Enclave A        |          | Enclave B        |
|                  |          |                  |
| 1. Generate      |          |                  |
|    local report  +--------->| 2. Verify report |
|                  |          |    using shared   |
|                  |          |    platform key   |
|                  |          |                  |
|                  |<---------+ 3. Return result |
+------------------+          +------------------+
```

Used for: Intra-node verification between Munin components running in separate enclaves on the same physical machine.

### 4.2 Remote Attestation

```
+------------------+     +------------------+     +------------------+
| Munin Enclave    |     | Attestation      |     | Verification     |
| (Prover)         |     | Service          |     | Service          |
|                  |     | (Platform)       |     | (Relying Party)  |
|                  |     |                  |     |                  |
| 1. Generate      |     |                  |     |                  |
|    quote/report  +---->| 2. Co-sign with  |     |                  |
|                  |     |    platform key   +---->| 3. Verify chain  |
|                  |     |                  |     |    of trust       |
|                  |     |                  |     |                  |
|                  |     |                  |     | 4. Check enclave  |
|                  |     |                  |     |    measurement    |
|                  |<----+------------------+-----+    against known |
| 5. Proceed if    |                              |    good value    |
|    verified      |                              +------------------+
+------------------+
```

Used for: Cross-node verification; regulator audit verification; initial deployment attestation.

### 4.3 Attestation Contents

Each attestation report contains:

| Field | Description | Verification Purpose |
|-------|-------------|---------------------|
| MRENCLAVE / measurement | Hash of enclave code and initial data | Proves correct software is loaded |
| MRSIGNER / signer | Identity of enclave signer | Proves enclave was built by authorised party |
| ISV_PROD_ID | Product identifier | Distinguishes Munin components |
| ISV_SVN | Security version number | Ensures minimum patch level |
| Report data | Application-defined (nonce, public key) | Binds attestation to specific session |
| Platform info | TCB level, firmware versions | Verifies platform security posture |

---

## 5. Multi-TEE Quorum Design

### 5.1 Concept

Critical governance operations (key operations, quorum verification) are not entrusted to a single TEE instance. Instead, a multi-TEE quorum ensures that:

- No single TEE compromise defeats the security model
- No single vendor vulnerability is catastrophic
- Cross-platform verification detects platform-specific attacks

### 5.2 Multi-TEE Quorum Flow

```
+----------+    +----------+    +----------+
| SGX      |    | SEV      |    | TrustZone|
| Enclave  |    | VM       |    | Secure   |
|          |    |          |    | World    |
| Compute  |    | Compute  |    | Compute  |
| result_1 |    | result_2 |    | result_3 |
+----+-----+    +----+-----+    +----+-----+
     |               |               |
     +-------+-------+-------+-------+
             |               |
      +------v------+  +-----v------+
      | Cross-check |  | Attestation|
      | Agreement   |  | Validation |
      +------+------+  +-----+------+
             |               |
             +-------+-------+
                     |
              +------v------+
              | Quorum      |
              | Decision    |
              | (2-of-3     |
              |  agreement) |
              +-------------+
```

### 5.3 Disagreement Handling

If TEE instances produce divergent results:

1. **All three agree:** Result accepted; highest confidence
2. **Two of three agree:** Divergent enclave flagged; result accepted with reduced confidence; investigation triggered
3. **All three disagree:** Result rejected; manual review required; potential platform compromise investigation
4. **One enclave unavailable:** Remaining two must agree; degraded mode logged

---

## 6. Failure Modes and Graceful Degradation

### 6.1 Failure Mode Analysis

| Failure Mode | Detection | Impact | Response |
|-------------|-----------|--------|----------|
| Single TEE platform unavailable | Attestation failure | Reduced quorum (2-of-2 instead of 2-of-3) | Continue in degraded mode; alert operations; schedule maintenance |
| Attestation verification failure | Invalid report signature or measurement mismatch | Suspect enclave cannot participate in quorum | Isolate suspect enclave; investigate; re-provision if necessary |
| Side-channel attack detected | Anomalous timing patterns; unexpected cache behaviour | Potential data leakage from enclave | Terminate affected enclave; rotate keys; forensic investigation |
| TEE firmware vulnerability disclosed | External advisory (vendor, CERT) | Platform trust reduced | Evaluate severity; apply patches; re-attest; consider temporary platform exclusion |
| All TEE platforms unavailable | Complete attestation failure | No hardware-backed trust | Fall back to software-only mode with enhanced audit (see 7.1) |

### 6.2 Degradation Levels

| Level | Condition | Capabilities | Governance Impact |
|-------|-----------|-------------|-------------------|
| Full | All three TEE platforms operational and attested | Full multi-TEE quorum; highest confidence operations | Standard quorum policies apply |
| Degraded-1 | Two of three platforms operational | Reduced TEE quorum (2-of-2); single platform excluded | Enhanced logging; Gold Commander notification |
| Degraded-2 | One platform operational | Single TEE; no cross-platform verification | Reduced scope of TEE-protected operations; elevated governance (additional human approval) |
| Software Fallback | No TEE platforms available | Software-only cryptographic operations | Maximum governance requirements; all operations require enhanced audit; time-limited |

---

## 7. Migration Path: Software Fallback to Hardware TEE

### 7.1 Software Fallback Mode

Munin is designed to operate without hardware TEE support for development, testing, and initial deployments where TEE hardware is not available.

Software fallback provides:
- Process-level isolation using OS-level sandboxing
- Software-based key management with encrypted storage
- Simulated attestation for development and testing
- Full functional parity with reduced security guarantees

Software fallback does NOT provide:
- Protection against compromised host OS or hypervisor
- Hardware-rooted attestation
- Side-channel resistance
- Protection against physical access attacks

### 7.2 Migration Phases

| Phase | Environment | TEE Status | Security Posture |
|-------|------------|-----------|------------------|
| Phase 0: Development | Developer workstation | Software fallback | Development only; no production data |
| Phase 1: Initial deployment | Single-vendor TEE (e.g., SGX only) | Single-platform TEE | Production-capable with single-vendor risk |
| Phase 2: Multi-vendor | Two TEE platforms available | Dual-TEE quorum | Production with cross-platform verification |
| Phase 3: Full deployment | Three TEE platforms | Full multi-TEE quorum | Maximum security posture |

### 7.3 Migration Verification

Each migration phase requires:

1. Attestation verification of new TEE platform
2. Key migration ceremony (ref: `scripts/key_ceremony.sh`) to provision keys within new enclave
3. Parallel operation period (minimum 72 hours) running software and hardware paths simultaneously
4. Result comparison to verify functional equivalence
5. Governance approval (production quorum) to activate new TEE platform
6. Decommissioning of software fallback for migrated operations

---

## 8. Security Considerations

### 8.1 Known TEE Limitations

- **Side-channel attacks:** SGX has a documented history of side-channel vulnerabilities. Munin's enclave code follows constant-time programming practices and avoids secret-dependent memory access patterns.
- **Rollback attacks:** TEE platforms may be vulnerable to replaying old enclave states. Munin uses monotonic counters and nonce binding to detect rollback attempts.
- **Supply chain attacks:** Hardware TEE trust ultimately depends on the manufacturer. The multi-vendor approach limits exposure to any single supply chain compromise.
- **Scalability:** SGX EPC size limits the amount of data processable within an enclave. Large analysis workloads use SEV VM-level encryption instead.

### 8.2 Ongoing Monitoring

The TEE subsystem requires continuous monitoring of:
- Vendor security advisories for all three platforms
- Academic publications on TEE attacks
- Firmware update availability and applicability
- Attestation service availability and reliability

---

**END OF DOCUMENT TD-001**
