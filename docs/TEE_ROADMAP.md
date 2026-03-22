# Trusted Execution Environment Roadmap

## Current State

- **SOFTWARE_FALLBACK mode**: Logic-Lock constraints are enforced in regular process memory. This provides correct constraint validation but no hardware isolation.
- **Multi-vendor attestation interface**: defined and implemented at the API level. Attestation records are currently simulated — they are structurally correct but not backed by hardware roots of trust.
- **Threat model limitation**: a compromised operating system (root-level attacker) could bypass Logic-Lock constraints in the current implementation. Hardware TEE integration closes this gap.

---

## Phases

### Phase 1 — Current

- Software constraint enforcement for all Logic-Lock validations.
- Attestation interface designed for hardware drop-in — `TEEPlatform`, `TEEAttestation`, and `TEEConfig` types are stable.
- SOFTWARE_FALLBACK attestation records are generated for all operations, maintaining the same data flow that hardware attestation will use.

### Phase 2 — With Hardware (~6 weeks)

- **Intel SGX integration** via the Open Enclave SDK.
- Logic-Lock validation moves inside the SGX enclave. Constraint checking code runs in isolated memory that the OS kernel cannot read or modify.
- Attestation uses **Intel Attestation Service (IAS)** for remote attestation. Each Logic-Lock validation produces a signed attestation quote verifiable by any third party.
- Enclave memory budget: Logic-Lock constraint tables and validation logic must fit within SGX EPC limits (~128 MB on current hardware).

### Phase 3 — ~3 months

- **AMD SEV integration** via sev-tool and the SEV-SNP attestation protocol.
- **Multi-vendor attestation quorum**: a packet's Logic-Lock validation is considered authoritative only when **2-of-3** vendor platforms co-sign the validation result.
- This means the same constraint check runs independently inside both an SGX enclave and an SEV-protected VM. Both attestation reports are bundled with the packet.
- If either platform's attestation fails, the packet is flagged but not rejected (during Phase 3). Both failures trigger immediate investigation.

### Phase 4 — ~6 months

- **ARM TrustZone integration** via OP-TEE for edge deployments. Collector nodes at utility sites (substations, water treatment plants, grid control rooms) run Logic-Lock validation inside TrustZone secure world.
- **Full multi-vendor attestation chain**: central nodes (SGX + SEV) and edge nodes (TrustZone) produce attestation bundles that travel with packets through the system.
- 2-of-3 quorum becomes mandatory. Packets without sufficient attestation coverage are rejected.

---

## Why Multi-Vendor

- **No single hardware vendor should be a single point of trust.** If Intel SGX has a vulnerability (as happened with Foreshadow/L1TF in 2018 and subsequent microarchitectural attacks), AMD SEV provides independent validation on a different architecture.
- Sovereign nations deploying critical infrastructure systems should not depend on one foreign vendor's hardware integrity for their operational safety guarantees.
- The 2-of-3 quorum model means an attacker must compromise two independent hardware security architectures simultaneously — a qualitatively different (and harder) attack than compromising one.

## Deployment Model

- **Central enclave** (SGX + SEV): deployed at the ministry or national operations center. Handles high-throughput Logic-Lock validation for command authorization and audit signing.
- **Edge enclaves** (TrustZone): deployed at collector sites (substations, treatment plants, sensor arrays). Handles local constraint validation with low latency. Operates correctly during network partitions.
- **Attestation bundles travel with packets**: every packet carries its attestation provenance. A downstream verifier can independently confirm which hardware platforms validated the Logic-Lock constraints, without contacting the original enclave.
