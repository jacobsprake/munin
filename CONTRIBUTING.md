# Contributing to Munin

## Development Philosophy

**The current codebase is a Functional Logic Prototype developed via high-velocity AI-assisted iteration (Cursor). The goal is to validate the orchestration schema and cryptographic handshakes before hardening the stack into a production-grade TEE (Trusted Execution Environment) environment.**

### What This Means

- **Rapid Prototyping**: The codebase uses AI-assisted development to rapidly validate core concepts
- **Logic Validation**: The focus is on proving the algorithmic approach, not production-grade code
- **Architectural Clarity**: The architecture and design decisions are more important than the implementation details
- **Production Roadmap**: The next phase will involve hardening the stack for national security standards

### Current Status

**Functional (MVP):**
- ✅ Protocol translation framework (Modbus, DNP3, OPC UA, etc.)
- ✅ Time-series ingestion and normalization
- ✅ Dependency graph inference (correlation-based with lag detection)
- ✅ Sensor health detection (missingness, stuck-at, drift)
- ✅ Evidence window generation
- ✅ Incident simulation and cascade prediction
- ✅ Authoritative handshake packet generation
- ✅ Byzantine fault tolerance engine (M-of-N multi-sig)
- ✅ Biometric handshake verification (standalone demo)

**Directional (Placeholder):**
- ⚠️ UI components (Next.js frontend is a directional placeholder)
- ⚠️ Real-time SCADA integration (currently uses CSV sample data)
- ⚠️ Hardware TEE integration (Intel SGX/ARM TrustZone - architecture defined, not yet integrated)
- ⚠️ Post-quantum cryptography (DILITHIUM-3 - algorithm selected, not yet implemented)
- ⚠️ Physical verification (RF/acoustic sensors - architecture defined, not yet integrated)

### Development Approach

**We are using AI-assisted development (Cursor) to:**
1. Rapidly prototype the logic gates of the state
2. Validate the system's decision-matrix
3. Prove the algorithmic approach before production hardening

**This is a valid 2026 superpower:**
- We are not just "coding" in the traditional sense
- We are **Prompt Engineering an Architecture**
- The goal is to validate the system's decision-matrix before bringing on a world-class CTO to harden the stack

### Intellectual Honesty

We are being intellectually honest about our development approach:
- The codebase is a **Functional Logic Prototype**
- The architecture and design decisions are the core value
- The implementation will be hardened for production by world-class engineers
- The current code demonstrates the algorithmic approach, not production-grade security

### What We're Looking For

**We need engineers who can:**
- Understand the architectural vision (not just write code)
- Harden the stack for national security standards
- Implement production-grade TEE integration
- Build real-time SCADA protocol drivers
- Implement post-quantum cryptography (DILITHIUM-3)

**See [TECHNICAL_REQUISITES.md](./TECHNICAL_REQUISITES.md) for specific requirements.**

### Code Quality Standards

**Current Standards (Prototype Phase):**
- Code should demonstrate the algorithmic approach
- Architecture should be clear and well-documented
- Logic should be validated through simulation
- Security architecture should be defined (even if not yet implemented)

**Future Standards (Production Phase):**
- Production-grade security hardening
- Formal verification of critical logic
- Hardware TEE integration
- Real-time SCADA protocol drivers
- Post-quantum cryptography implementation

### Getting Started

1. **Read the Architecture**: Start with [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/MANIFESTO.md](./docs/MANIFESTO.md)
2. **Understand the Pipeline**: Run `python engine/run.py` to see the complete data pipeline
3. **Explore the Logic**: Read `engine/infer_graph.py` to understand the Shadow Link detection algorithm
4. **Study the Handshake**: Run `python3 engine/sovereign_handshake.py` to see the Byzantine multi-sig in action

### Questions?

**If you have questions about:**
- The architectural vision: Read [docs/MANIFESTO.md](./docs/MANIFESTO.md)
- The technical implementation: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- The development approach: This file (CONTRIBUTING.md)
- What engineers we need: Read [TECHNICAL_REQUISITES.md](./TECHNICAL_REQUISITES.md)

---

**Remember: We are not building a "product." We are architecting the system that prevents national-scale cascading failures. This requires architectural thinking, not just coding.**

