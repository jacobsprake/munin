# What's Next

What I'm doing in the next 3-6 months, what requires resources, and what doesn't.

---

## What I'm doing regardless of funding (next 3 months)

These are happening because they're the right next steps, not because anyone is paying for them.

**1. Validate shadow-link discovery on real data.**
The inference engine works on synthetic + public flood data. The next step is real SCADA historian exports from a UK water authority. I've started conversations with Environment Agency contacts and university research groups with access to operational datasets. The goal: prove that temporal correlation detects real cross-sector dependencies that operators didn't know about.

**2. Second historical replay.**
The Carlisle Storm Desmond demo is solid. I need at least one more — likely the UK floods of 2007 (Tewkesbury) — to show the approach generalizes across events and geographies. The data is partially in the repo already (`engine/sample_data/uk_floods_2007/`).

**3. Independent safety review.**
The safety case and STPA analysis need external eyes. I'm approaching university safety engineering groups (particularly those with STPA expertise) for a lightweight independent review. Even a one-page assessment from a credible safety engineer would be significant.

**4. Formal methods expansion.**
The TLA+ spec covers the packet authorization protocol. I want to extend it to cover Logic-Lock constraints and prove that no valid playbook sequence can violate reservoir level invariants. This is tractable with existing tools (TLC model checker) and would be a genuine contribution.

---

## What would accelerate with resources (6-12 months)

These are the experiments and partnerships that require either money, hardware, or institutional access.

**1. Hardware TEE integration ($5-10k for SGX/SEV development hardware)**
Munin's TEE attestation currently runs in software fallback mode. Moving to real Intel SGX or AMD SEV enclaves requires development boards and a secure lab environment. This is the difference between "architecturally designed for hardware trust" and "actually running on hardware trust." The code is ready (`lib/tee.ts` has the abstraction); it needs real hardware to bind to.

**2. Municipal pilot partnership (time + institutional access)**
One small UK water authority willing to run Munin in shadow mode alongside their existing monitoring. No SCADA write access, no risk — just read-only analysis on real historian data. The value: ground-truth validation, real operator feedback, and a case study. The blocker isn't technical; it's institutional access and trust-building.

**3. PQC production implementation ($2-5k for HSM + liboqs engineering)**
The PQC dual-stack currently uses SHA-256 simulation for ML-DSA. Production deployment requires liboqs bindings and ideally an HSM (Hardware Security Module) for key storage. This is well-defined engineering, not research — the standards are finalized (FIPS 204), the libraries exist, and the API surface in `lib/pqc.ts` is already designed for it.

**4. Multi-jurisdiction regulatory corpus (research assistant time)**
The regulatory mapper currently covers UK water/flood legislation. Extending to EU (NIS2 Directive, EU Emergency Civil Protection) and US (Stafford Act, NERC CIP) requires structured legal research. This is parallelizable and doesn't require my direct engineering time, but it does require someone who can read legislation carefully.

**5. Peer-reviewed publication (3-6 months)**
The evaluation harness, digital twin, and adversarial testing are structured like a research paper. With real-data validation from a pilot, this could be submitted to a venue like IEEE S&P, CCS, or an ICS-specific conference. A published paper would be a significant credibility signal for institutional buyers.

---

## Success metrics (12-month view)

| Milestone | How I'll know it worked |
|-----------|------------------------|
| Real-data validation | Shadow links confirmed by operator who didn't know the dependency existed |
| Pilot deployment | One utility running Munin in shadow mode for 3+ months |
| Safety assessment | Independent review with no critical findings |
| Hardware TEE | Logic-Lock running in real SGX enclave, not software fallback |
| Publication | Accepted at a peer-reviewed venue |
| Second sector | Power grid pilot alongside water (cross-sector validation) |

---

## The 10-year outcome

Every nation has a sovereign orchestration layer — air-gapped, on their own hardware, under their own authority — that sees across infrastructure sectors, pre-computes response options, and compresses authorization latency from hours to minutes.

The market for this is every nation that has critical infrastructure and doesn't fully trust the hardware it runs on. That's all of them.

Munin is the beginning of that.
