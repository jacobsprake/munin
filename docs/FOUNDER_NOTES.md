# How I got here

## Timeline

Empty repo to working platform, solo.

| Date | Milestone |
|------|-----------|
| **Jan 9, 2026** | First commit. Empty repo. |
| **Jan 20** | Inference engine: shadow-link discovery from time-series correlation working on synthetic data. |
| **Feb 3** | Digital twin: power-water-telecom cascade simulation with physics-based models. |
| **Feb 10** | Carlisle 2015 flood demo running end-to-end on real Environment Agency data. |
| **Feb 17** | Safety case (GSN), STPA hazard analysis, threat model (NIST 800-82). |
| **Feb 24** | PQC dual-stack signatures (Ed25519 + ML-DSA). Adversarial testing module. |
| **Mar 3** | Storm Desmond second demo on live data. 96 passing tests. Governance layer complete. |
| **Mar 10** | 90+ files of documentation. CER Directive compliance mapping. Landing page live. |
| **Mar 17** | Full platform: inference, simulation, playbooks, authorization packets, audit trail, CLI. 10 weeks. |

---

I didn't start with infrastructure. I started with the question: what systems are so important that getting them wrong kills people, and so complex that nobody has a complete picture?

The answer is critical infrastructure — power, water, telecom. Not because the individual systems are poorly built (they're not), but because the *connections between them* are invisible. A water utility's monitoring system doesn't know that its pumps depend on a specific substation. The power grid doesn't know that a telecom tower's backup battery is about to die. When one sector fails, the cascade into adjacent sectors is discovered reactively, by humans making phone calls, not by any automated system.

I became obsessed with this gap. Not the sensors-and-dashboards gap (that's well-served), but the gap between "we know what's happening" and "we have authorization to respond." In every major infrastructure disaster I studied — Carlisle 2015, the UK floods of 2007, Katrina — the technical detection was fast enough. The authorization wasn't. People died in the gap.

## What I built

Munin is my attempt to close that gap. The core idea: if you can pre-simulate every plausible cascade scenario, pre-match each one to a validated playbook, and pre-package the evidence, uncertainty, and legal basis into a cryptographic authorization packet, then when a crisis hits, operators don't improvise — they review and sign.

I built this from scratch. The inference engine discovers cross-sector dependencies from time-series correlation. The digital twin simulates power-water-telecom cascades with physics-based models. The adversarial testing module tries to break the inference with spoofed sensors, timestamp manipulation, and replay attacks. The evaluation harness measures graph reconstruction accuracy against ground truth.

The safety engineering is not decoration. I wrote a structured safety case (GSN-style), a full STPA hazard analysis, and a threat model aligned to NIST 800-82. I implemented a hard read-only guarantee — there is no code path in v1 that can send a command to SCADA, and static analysis tests verify this on every commit. The system uses PQC dual-stack signatures (Ed25519 + ML-DSA) because authorization packets need to remain unforgeable for the 30-50 year life of the infrastructure they protect.

I also built the governance layer: multi-ministry M-of-N cryptographic signing with Byzantine fault tolerance, constitutional constraints that no single operator can override, and an explicit misuse analysis covering how an authoritarian regime could abuse the system and what architectural features prevent it.

## What I learned

Building Munin taught me that the hardest problems in infrastructure are not computational — they are institutional. The math for cascade prediction is well-understood. The cryptography is standardized. What's hard is designing a system that a government can actually trust: one that is advisory-only, cryptographically auditable, quantum-resistant, and constitutionally incapable of being weaponized.

I learned that safety engineering is not a checkbox exercise. The STPA analysis changed the architecture — it revealed hazards I hadn't considered (operator fatigue, training mode confusion, sensor health classification lag) and forced me to add mitigations. The safety case is a living document, not a filing requirement.

I learned that the gap between "technically possible" and "someone will actually deploy this" is bridged by trust, not features. Every design decision in Munin optimizes for trust: evidence over assertion, uncertainty over confidence, human authority over automation.

## What's next

The next 3 months, regardless of anything else:

1. Get real SCADA historian data from a UK water authority and validate shadow-link discovery on it.
2. Run the digital twin against at least one more historical flood event beyond Carlisle.
3. Engage an independent safety assessor to review the safety case.
4. Move TEE attestation from software fallback to hardware SGX.

The 10-year vision: every nation has a sovereign orchestration layer — air-gapped, on their own hardware, under their own authority — that sees across infrastructure sectors, pre-computes response options, and compresses authorization latency from hours to minutes. Munin is that layer.

I'll keep building this whether anyone funds it or not. The problem is too important and the architecture is too right to stop.
