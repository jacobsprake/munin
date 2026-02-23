# Technical Requisites: Engineering Talent Requirements

**This document defines the specific engineering talent required to move Munin from "Functional Logic Prototype" to "Production-Grade Sovereign Infrastructure System."**

---

## Executive Summary

**Current Status**: Functional Logic Prototype (AI-assisted development via Cursor)

**Goal**: Production-grade TEE-hardened system for national security standards

**Gap**: We need world-class engineers to harden the stack, implement production-grade security, and build real-time SCADA protocol drivers.

---

## Required Engineering Roles

### 1. Rust Expert for PQC Handshake Implementation

**Priority**: Critical

**Requirements**:
- Deep expertise in Rust systems programming
- Experience with post-quantum cryptography (specifically DILITHIUM-3 or Kyber)
- Understanding of cryptographic signature schemes
- Ability to implement hardware-rooted TEE integration (Intel SGX, ARM TrustZone)

**Deliverables**:
- Production-grade DILITHIUM-3 signature implementation
- TEE enclave integration for handshake signing
- Hardware attestation quote generation
- Performance optimization for sub-100ms signing latency

**Why Rust**: 
- Memory safety for cryptographic operations
- Performance requirements for real-time signing
- TEE SDK compatibility (Intel SGX SDK supports Rust)

**Current Status**: Algorithm selected (DILITHIUM-3), architecture defined, not yet implemented

---

### 2. SCADA Protocol Engineer (DNP3/Modbus Specialist)

**Priority**: Critical

**Requirements**:
- Deep expertise in industrial protocols (DNP3, Modbus RTU/TCP, Profibus, BACnet, OPC UA)
- Experience with real-time SCADA systems
- Understanding of time-series data normalization
- Ability to build protocol-specific optimizations

**Deliverables**:
- Real-time DNP3 polling implementation (replacing CSV ingestion)
- Modbus RTU/TCP driver with sub-second latency
- Protocol-specific time-series normalization
- Error handling and retry logic for unreliable industrial networks

**Why This Matters**:
- Current implementation uses CSV sample data
- Production requires real-time protocol polling
- Protocol-specific optimizations are critical for performance

**Current Status**: Protocol translation framework exists, real-time drivers not yet implemented

---

### 3. TEE (Trusted Execution Environment) Integration Engineer

**Priority**: High

**Requirements**:
- Experience with Intel SGX, ARM TrustZone, or AMD SEV
- Understanding of hardware attestation and enclave programming
- Ability to implement Logic-Lock (physics validation) inside TEE
- Experience with secure enclave communication

**Deliverables**:
- TEE enclave for handshake signing
- Hardware attestation quote generation
- Logic-Lock validation inside enclave (prevents root-level bypass)
- Enclave-to-host secure communication channel

**Why This Matters**:
- Hardware-rooted trust is required for sovereign operations
- Even root administrator cannot bypass TEE-enforced validation
- Provides digital sovereignty over foreign hardware

**Current Status**: Architecture defined, TEE integration not yet implemented

---

### 4. Causal Inference / Graph Theory Specialist

**Priority**: Medium

**Requirements**:
- Deep expertise in causal inference (structural equation modeling, Granger causality)
- Experience with time-series correlation analysis
- Understanding of graph theory and dependency detection
- Ability to distinguish correlation from causation

**Deliverables**:
- Upgrade correlation-based inference to causal inference
- Multi-scale analysis (seconds, minutes, hours) for different dependency types
- Physical constraint validation (e.g., "water flow cannot cause power frequency directly")
- Confidence interval computation for edge detection

**Why This Matters**:
- Current implementation uses correlation (can have false positives)
- Causal inference will reduce false positives and improve accuracy
- Multi-scale analysis captures different types of dependencies

**Current Status**: Correlation-based inference functional, causal inference not yet implemented

---

### 5. Formal Verification Engineer

**Priority**: Medium

**Requirements**:
- Experience with formal verification tools (TLA+, Coq, Alloy, or similar)
- Understanding of safety-critical systems verification
- Ability to verify Byzantine multi-sig logic
- Experience with model checking for distributed systems

**Deliverables**:
- Formal verification of Byzantine multi-sig authorization logic
- Proof that M-of-N quorum prevents single-point-of-failure
- Verification of Logic-Lock physics constraints
- Model checking for cascade simulation correctness

**Why This Matters**:
- National security systems require formal verification
- Proves that the system cannot be compromised by design flaws
- Required for regulatory approval in some jurisdictions

**Current Status**: Architecture defined, formal verification not yet implemented

---

### 6. Physical Verification / RF Engineer

**Priority**: Low (Future)

**Requirements**:
- Experience with RF/acoustic sensor systems
- Understanding of signal processing and fingerprinting
- Ability to build hardware sensors for physical verification
- Experience with cross-verification (digital vs. physical signals)

**Deliverables**:
- RF fingerprinting system for equipment verification
- Acoustic fingerprinting for pump/turbine verification
- Cross-verification logic (detects Stuxnet-style attacks)
- Hardware sensor integration

**Why This Matters**:
- Ultimate defense against Stuxnet-style attacks (digital lies vs. physical truth)
- Verifies that SCADA readings match physical reality
- Detects sensor tampering or SCADA compromise

**Current Status**: Architecture defined, physical verification not yet implemented

---

## Development Roadmap

### Phase 1: Core Hardening (Months 1-3)
- **Rust Expert**: Implement DILITHIUM-3 PQC signatures
- **SCADA Engineer**: Build real-time DNP3/Modbus drivers
- **TEE Engineer**: Integrate Intel SGX/ARM TrustZone for handshake signing

### Phase 2: Algorithm Enhancement (Months 4-6)
- **Causal Inference Specialist**: Upgrade correlation to causal inference
- **Formal Verification Engineer**: Verify Byzantine multi-sig logic

### Phase 3: Physical Verification (Months 7-12)
- **RF Engineer**: Build physical verification sensors
- **Integration**: Cross-verification system (digital vs. physical)

---

## Compensation Philosophy

**We are not a traditional startup. We are a Sovereign Research Project.**

- **Equity**: Significant equity for founding engineers
- **Mission**: Work on technology that prevents national-scale cascading failures
- **Impact**: Your code will be the cryptographic skeleton of the state
- **Technical Challenge**: Hardest problems in infrastructure orchestration

---

## How to Apply

**If you are interested in any of these roles:**

1. **Read the Architecture**: Start with [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/MANIFESTO.md](./docs/MANIFESTO.md)
2. **Understand the Vision**: Read [README.md](./README.md) to understand the core Shadow Link mechanism and the thesis
3. **Run the Prototype**: Execute `python engine/run.py` to see the current implementation
4. **Study the Logic**: Read `engine/infer_graph.py` to understand the Shadow Link detection algorithm
5. **Contact**: [Your contact information here]

---

## Questions?

**If you have questions about:**
- The technical requirements: This file (TECHNICAL_REQUISITES.md)
- The architectural vision: Read [docs/MANIFESTO.md](./docs/MANIFESTO.md)
- The current implementation: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- The development approach: Read [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Remember: We are not building a "product." We are architecting the system that prevents national-scale cascading failures. This requires world-class engineering talent who understand both the technical requirements and the strategic vision.**


