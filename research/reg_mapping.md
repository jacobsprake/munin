# Regulatory Mapping Matrix: Authorisation Packet Fields to Concrete Regulations

**Document ID:** REG-MAP-001 v1.0  
**Classification:** OFFICIAL  
**Date:** 2026-03-01  
**Owner:** Legal and Compliance Unit, National Resilience Directorate

---

## 1. Overview

This document maps every field of a Munin authorisation packet (`lib/packet/types.ts` — `AuthorisationPacket`) to concrete regulatory requirements across three jurisdictions: United Kingdom, European Union, and United States. The mapping demonstrates that each packet field exists not by engineering convenience but because a specific regulation demands it.

The packet structure is defined in `lib/packet/types.ts`. Validation rules enforcing regulatory compliance are implemented in `lib/packet/validate.ts`. The statutory compliance layer is implemented in `engine/liability_shield.py`. The regulatory mapper for jurisdiction-specific summaries is in `engine/compliance/regulatory_mapper.py`.

---

## 2. Regulatory Mapping Matrix

### 2.1 Core Packet Fields

| Packet Field | Type Definition | UK Law | EU Directive | US Standard | Notes |
|---|---|---|---|---|---|
| `regulatoryBasis` | `string` | **CCA 2004, Section 2(1)(c):** Category 1 responders must maintain arrangements to warn and inform the public; actions must cite the statutory power under which they are taken. **FWMA 2010, Section 9:** Duty to cooperate in flood risk management requires documented legal basis for cross-authority coordination. | **NIS2 Directive (2022/2555), Article 21(2)(c):** Incident handling measures must include documented response procedures with regulatory basis for actions taken on essential services. **EU Floods Directive 2007/60/EC, Article 7:** Flood risk management plans must identify competent authorities and their legal powers. | **NERC CIP-008-6, R1.2:** Each Responsible Entity shall document its incident response plan, including the authority under which response actions are taken. **Stafford Act, Section 501(a):** Federal assistance requires a documented basis for emergency declarations. | `lib/packet/validate.ts` rejects packets with empty `regulatoryBasis` at error severity: `"Missing regulatory basis — packet cannot be legally defensible"`. Populated by `engine/liability_shield.py` — `enhance_handshake_with_compliance()`. |
| `multiSig.required` | `number` (N) | **CCA 2004, Section 2(5):** Category 1 responders must cooperate with each other; high-consequence actions crossing organisational boundaries require multi-agency agreement. **Cabinet Office Guidance on CCA 2004, Chapter 6:** Multi-agency coordination through LRFs must document which agencies approved each action. | **NIS2, Article 21(2)(a):** Risk management measures must include governance arrangements — "policies on risk analysis and information system security" — implying multi-party oversight for critical decisions. **CER Directive 2022/2557, Article 13:** Member States must ensure coordination between competent authorities for cross-sector incidents. | **NERC CIP-003-8, R1:** Senior management must approve cybersecurity policies; critical actions require documented authorisation from responsible parties. **PPD-21 (Critical Infrastructure Security):** Sector-Specific Agencies must coordinate with owners/operators, requiring multi-party sign-off for cross-sector interventions. | `engine/packetize.py` — `determine_multi_sig_requirements()` sets `required` to 3 for high-risk operations (flood, power_instability) and 2 for standard operations. |
| `multiSig.threshold` | `number` (M) | **CCA 2004, Section 2(5)(d):** Not all agencies need agree; a quorum of cooperating responders is sufficient if documented. The CCA does not mandate unanimity but requires coordination. | **NIS2, Article 23(1):** Significant incidents must be reported to CSIRTs — implying that not all parties need to approve response actions, but a threshold of essential parties must concur. | **NERC CIP-008-6, R1.3:** Incident response plan must identify roles and responsibilities; threshold for action authorisation must be documented. **Nuclear Regulatory Commission 10 CFR 50.54(x):** Emergency actions require concurrence from the site emergency director and NRC — a 2-of-N threshold model. | `engine/byzantine_resilience.py` — `ByzantineMultiSig.is_authorized()` verifies `len(signatures) >= threshold` AND `len(unique_ministries) >= threshold`. For CRITICAL consequence level, all required ministries must sign. |
| `evidenceRefs` | `string[]` | **FWMA 2010, Section 9(3):** Flood risk management functions must be exercised "having regard to" available evidence on flood risk. **CCA 2004, Part 2, Section 20(1):** Emergency powers must be exercised on the basis of evidence that the emergency condition exists. | **NIS2, Article 23(4)(f):** Incident notifications must include "any other relevant information" supporting the nature and impact assessment. **GDPR Article 5(2) (Accountability):** Organisations must demonstrate compliance with documented evidence. | **NERC CIP-008-6, R2.1:** Evidence of incident response actions must be retained. **FEMA CPG 101 (Comprehensive Preparedness Guide):** Planning must be based on threat/hazard analysis with documented evidence. | `lib/packet/validate.ts` emits a warning when `evidenceRefs` is empty: `"No evidence references — packet is unsupported"`. Evidence windows are generated by `engine/sensor_health.py` — `build_evidence_windows()` with per-window correlation, quality context, and support/counterexample classification. |
| `uncertainty.overall` | `number` (0.0–1.0) | **CCA 2004 Guidance, Chapter 4 (Risk Assessment):** Risk assessments under CCA must quantify likelihood and impact; decisions must account for uncertainty. **FWMA 2010, Section 11:** Strategies must consider the "probability" of flood events. | **NIS2, Article 21(2)(d):** Supply chain security measures must account for "vulnerabilities specific to each direct supplier" — requiring uncertainty assessment. **EU Floods Directive, Article 4(2)(c):** Preliminary flood risk assessments must describe "potential adverse consequences" including uncertain factors. | **NERC CIP-008-6, R1.2:** Response plans must identify "conditions for activating" — implying confidence thresholds. **NIST SP 800-30 Rev. 1:** Risk assessments must quantify uncertainty and communicate it to decision makers. | `lib/packet/validate.ts` rejects packets with `uncertainty.overall` outside `[0, 1]` and warns when `< 0.5`. The uncertainty block also includes `counterexampleCount` (from `lib/packet/types.ts` — `UncertaintyBlock`) to surface disconfirming evidence. |
| `uncertainty.notes` | `string[]` | **CCA 2004 Guidance, Chapter 4:** Decision makers must be informed of factors affecting confidence. | **NIS2, Recital 89:** Organisations must communicate risks "including when it is difficult to estimate [them] with precision." | **NIST SP 800-30, Section 3.3:** Risk communication must include "a description of the uncertainties associated with the risk assessment." | Generated by `engine/packetize.py`: includes notes like `"Limited historical evidence for this scenario"` and `"Large blast radius increases prediction uncertainty"`. |
| `scope.regions` | `string[]` | **CCA 2004, Section 1(1):** Emergency powers apply to specific geographic areas. LRF boundaries define the scope of multi-agency response. | **EU Floods Directive, Article 5(1):** Flood hazard maps must cover specific geographic areas. **CER Directive, Article 6:** Critical entity assessments are sector-and-geography-specific. | **Stafford Act, Section 401:** Disaster declarations are geography-specific. **NERC CIP-002-5.1a:** Critical assets are identified by geographic region and interconnection. | `engine/packetize.py` derives `scope.regions` from node metadata in the dependency graph (`engine/out/graph.json`). |
| `scope.nodeIds` | `string[]` | **FWMA 2010, Section 4:** Lead local flood authorities must identify the specific infrastructure assets within their jurisdiction. | **CER Directive, Article 6(1)(e):** Critical entity identification must list specific assets. | **NERC CIP-002-5.1a, R1:** Each Responsible Entity must identify each BES (Bulk Electric System) Cyber Asset. | `lib/packet/validate.ts` rejects packets with empty `scope.nodeIds`: `"Packet scope must include at least one node"`. Derived from cascade timeline in `engine/build_incidents.py`. |
| `merkle.receiptHash` | `string` | **CCA 2004, Section 2(1)(g):** Category 1 responders must maintain business continuity arrangements — implying tamper-evident records. **Public Records Act 1958:** Government records must be maintained with integrity guarantees. | **NIS2, Article 21(2)(h):** Cybersecurity measures must include "policies and procedures regarding the use of cryptography and, where appropriate, encryption." **eIDAS Regulation 910/2014, Article 34:** Electronic seals and timestamps must ensure integrity and authenticity. | **NERC CIP-008-6, R2.2:** Evidence retention must ensure records are not altered. **Federal Records Act, 44 U.S.C. Chapter 31:** Records must be managed to ensure reliability and authenticity. **NIST SP 800-53, AU-10 (Non-repudiation):** Systems must provide irrefutable evidence of actions. | `lib/merkle.ts` — `generateMerkleReceipt()` chains each packet to the previous via SHA-256: `receiptHash = SHA-256(previousHash + ":" + packetHash)`. `verifyMerkleChain()` detects any tampering or reordering. |
| `merkle.previousHash` | `string?` | As above — chain integrity requires link to prior record. | As above — eIDAS requires chronological ordering. | As above — NIST AU-10 requires ordered, non-repudiable evidence. | First packet in chain has `previousHash: undefined`. Subsequent packets link to prior `receiptHash`. Python implementation in `engine/packetize.py` — `generate_merkle_receipt()`. |

### 2.2 Security and Signing Fields

| Packet Field | Type Definition | UK Law | EU Directive | US Standard | Notes |
|---|---|---|---|---|---|
| `pqc.algorithm` | `'ML-DSA'` | **UK Cyber Security Strategy 2022:** Commitment to "quantum-safe" cryptography for government systems. **NCSC guidance PQC-2025:** UK government systems handling classified or critical data should begin migration to post-quantum algorithms. | **NIS2, Article 21(2)(h):** Cryptographic policies must reflect current best practice. **ENISA Post-Quantum Cryptography Report (2024):** Essential entities should plan migration to PQC algorithms approved by NIST. | **NIST FIPS 204 (ML-DSA):** Standardised post-quantum digital signature algorithm. **NSA CNSA 2.0:** Requires PQC for National Security Systems by 2030. **NERC CIP-011-3:** Cryptographic protections for BES Cyber Information. | `lib/pqc.ts` implements ML-DSA (Dilithium3). See `research/pqc-whitepaper.md` for full analysis. Algorithm choice driven by FIPS 204 standardisation and 128-bit quantum security level. |
| `pqc.signature` | `string?` | As above. | As above. | As above. | Signature generated over the canonical packet content. Ensures that even if quantum decryption becomes available, Munin's authorisation packets remain cryptographically secure. |
| `tee.platform` | `TEEPlatform` | **UK Secure by Design (SbD) framework:** Hardware-rooted trust is recommended for critical national infrastructure systems. | **EU Cyber Resilience Act (proposed), Article 10:** Products with digital elements must provide hardware-level security guarantees where appropriate. | **NIST SP 800-164 (Draft):** Guidelines for hardware-rooted security in mobile devices; principles applicable to critical infrastructure. **DoD STIG for SGX:** Intel SGX configurations for defence systems. | `lib/tee.ts` — `signPacketInTEE()` performs Logic-Lock physics validation before signing. Supports `INTEL_SGX`, `ARM_TRUSTZONE`, `AMD_SEV`, and `SOFTWARE_FALLBACK`. |
| `tee.quote` | `string` | Hardware attestation proves the signing occurred in a genuine enclave, supporting non-repudiation under UK Electronic Communications Act 2000. | **eIDAS, Article 26:** Advanced electronic signatures must be linked to the signatory and created using data under the signatory's sole control — TEE hardware attestation satisfies this. | **FIPS 140-3, Level 3+:** Cryptographic module must provide physical security mechanisms. TEE attestation proves module identity. | `lib/tee.ts` — `generateTEEAttestation()` produces the quote. `verifyTEESignature()` checks packet hash match, attestation format, and timestamp freshness (< 60 minutes). |

### 2.3 Process and Status Fields

| Packet Field | Type Definition | UK Law | EU Directive | US Standard | Notes |
|---|---|---|---|---|---|
| `status` | `PacketStatus` (`draft → ready → authorized → executed → verified → closed`) | **CCA 2004 Guidance:** Emergency response actions must follow documented stages with clear decision gates. | **NIS2, Article 23(1)-(4):** Incident notification follows a staged process (early warning → incident notification → intermediate report → final report). Munin's status lifecycle mirrors this staging. | **NERC CIP-008-6, R1.2:** Incident response plans must define phases of response. **ICS (Incident Command System):** Standardised incident phases. | `lib/packet/types.ts` — `PacketStatus`. `lib/packet/validate.ts` enforces that `authorized+` packets must have `multiSig` block with sufficient signatures. Status transitions are logged in `lib/audit/auditLog.ts`. |
| `technicalVerification.simulatedSuccessProb` | `number` (0.0–1.0) | **FWMA 2010, Section 9(3):** Actions must be evidence-based. Simulation results constitute technical evidence. | **EU Floods Directive, Article 7(3):** Flood risk management plans must consider "objectives, measures and their prioritisation" — simulation informs prioritisation. | **NERC TPL-001-5.1:** Transmission planning must include assessment of system performance under contingency conditions — analogous to Munin's cascade simulation. | `engine/packetize.py` — base success probability 0.95, adjusted for uncertainty (> 0.3 → −0.10) and scope size (> 15 nodes → −0.05). `lib/packet/validate.ts` warns if failed constraints coexist with high success probability. |
| `technicalVerification.constraintsSatisfied` | `string[]` | **Health and Safety at Work Act 1974, Section 3:** Employers must ensure equipment operates within safe limits — constraints document this compliance. | **Machinery Directive 2006/42/EC, Annex I:** Essential health and safety requirements include operating within documented limits. | **OSHA 29 CFR 1910.147 (Lockout/Tagout):** Energy control procedures must verify equipment constraints. **NERC FAC-001-3:** Facility connection requirements include operating within documented limits. | Derived from Logic-Lock physics validation (`engine/logic_lock.py` — `LogicLockEngine`). Constraints include valve capacity, pressure limits, and safety interlock verification. |
| `technicalVerification.constraintsFailed` | `string[]?` | As above — failure to meet safety constraints triggers escalation duties under HSWA 1974. | As above — Machinery Directive requires documented non-conformities. | As above — OSHA requires documentation of control failures. | Present only when constraints are violated. Triggers `lib/packet/validate.ts` warning: `"Failed constraints with high success probability — inconsistent"`. |
| `proposedAction` | `string` | **CCA 2004, Section 2(1)(a):** Risk assessment must identify actions to prevent or reduce effects. | **NIS2, Article 21(2)(b):** Incident handling must include specific response actions. | **NERC CIP-008-6, R1.2:** Response plan must include specific response actions. | Mapped from incident type in `engine/packetize.py` — `action_map`. Examples: `"Isolate affected pump stations and divert flow to backup reservoirs"`. |
| `playbookId` | `string` | **CCA 2004 Guidance, Chapter 5:** Response plans must reference pre-agreed protocols. LRF plans constitute playbooks under UK law. | **EU Floods Directive, Article 7(3)(a):** Flood risk management plans must define pre-agreed measures. | **FEMA CPG 101, Chapter 4:** Emergency operations plans must reference pre-defined actions. **NERC EOP-005-3:** System restoration plans must be pre-validated. | References YAML playbook in `playbooks/` directory (e.g., `carlisle_flood_gate_coordination.yaml`, `flood_event_pump_isolation.yaml`). |

---

## 3. Validation Rules to Regulatory Mapping

The `lib/packet/validate.ts` — `validatePacket()` function enforces the following regulatory-driven rules:

| Validation Rule | Severity | Regulatory Driver |
|---|---|---|
| Missing `id` | error | All jurisdictions require unique identification of emergency actions |
| Missing `situationSummary` | error | CCA 2004 §2(1)(c) — duty to inform; NIS2 Art. 23(4)(a) — initial assessment |
| Missing `proposedAction` | error | CCA 2004 §2(1)(a) — action identification; NERC CIP-008 R1.2 |
| Missing `playbookId` | error | CCA 2004 Guidance Ch. 5 — pre-agreed protocols; FEMA CPG 101 |
| Missing `regulatoryBasis` | error | CCA 2004 §2; NIS2 Art. 21; NERC CIP-008 — legal basis required |
| Missing `uncertainty` block | error | CCA 2004 Ch. 4 — risk quantification; NIST SP 800-30 |
| `uncertainty.overall` out of `[0,1]` | error | Mathematical validity — probabilities bounded |
| `uncertainty.overall < 0.5` | warning | Policy decision: low-confidence packets require additional evidence |
| `constraintsFailed` with high `simulatedSuccessProb` | warning | HSWA 1974 — inconsistent safety data must be flagged |
| Authorised packet without `multiSig` | error | CCA 2004 §2(5) — multi-agency cooperation; NERC CIP-003 R1 |
| Insufficient signatures (`currentSignatures < threshold`) | error | Byzantine quorum not met — action not legally authorised |
| Empty `scope.nodeIds` | error | FWMA 2010 §4 — must identify affected assets; NERC CIP-002 |
| Empty `evidenceRefs` | warning | FWMA 2010 §9(3) — actions should be evidence-based |

---

## 4. Known Regulatory Identifiers

The `lib/packet/validate.ts` — `KNOWN_REGULATORY_REFS` array lists the recognised regulatory reference codes that can appear in `regulatoryBasis`:

| Code | Full Name | Jurisdiction |
|------|-----------|-------------|
| `CCA-2004` | Civil Contingencies Act 2004 | UK |
| `CCA-SECTION-2` | CCA 2004, Section 2 (Category 1 responder duties) | UK |
| `FWMA-2010` | Flood and Water Management Act 2010 | UK |
| `EA-OPERATIONAL` | Environment Agency Operational Standards | UK |
| `LRF-COORDINATION` | Local Resilience Forum coordination duties | UK |
| `NIS2-ARTICLE-21` | NIS2 Directive, Article 21 (Cybersecurity risk-management measures) | EU |
| `NERC-CIP-008` | NERC Critical Infrastructure Protection Standard 008 (Incident Reporting) | US |
| `EMERGENCY-POWERS-ACT` | Emergency Powers Act (generic reference) | Multi |
| `CIVIL-CONTINGENCIES` | Civil contingencies legislation (generic reference) | Multi |

Additional jurisdiction-specific regulatory data is maintained in `engine/compliance/regulatory_mapper.py` — `REGULATORY_MAP` and `engine/compliance/regulatory_corpus.py`.

---

## 5. Cross-Reference: Playbook Regulatory Compliance

Each playbook YAML in `playbooks/` includes a `regulatory_compliance` section that feeds into the packet's `regulatoryBasis` via `engine/liability_shield.py`:

| Playbook | Cited Act | Section | Requirement |
|----------|-----------|---------|-------------|
| `carlisle_flood_gate_coordination.yaml` | Flood and Water Management Act 2010 | Section 9 | Coordinate flood risk management activities across authorities |
| `carlisle_flood_gate_coordination.yaml` | Civil Contingencies Act 2004 | Section 2 | Maintain effective emergency response coordination |
| `carlisle_flood_gate_coordination.yaml` | Environment Agency Operational Standards | FLO-2026-01 | Document all flood gate operations with evidence and approval chain |
| `flood_event_pump_isolation.yaml` | 2026 Flood Resilience Act | Section 4.2 | Maintain service continuity during declared flood emergencies |
| `flood_event_pump_isolation.yaml` | Water Quality Protection Standards | WQP-2026-01 | Isolate affected systems to prevent contamination spread |
| `power_frequency_instability.yaml` | NERC Reliability Standards | EOP-011 | Maintain frequency within operational limits |
| `drought_reservoir_diversion.yaml` | National Water Act | Section 4.2 | Emergency water management authority |

---

## 6. Gap Analysis

| Gap | Description | Status | Mitigation |
|-----|-------------|--------|------------|
| GDPR data-subject rights | Packets may reference node IDs that correlate to specific facilities; privacy impact assessment needed if nodes can identify individuals | Open | Pseudonymise node IDs in exported packets; conduct DPIA before production deployment |
| UK Investigatory Powers Act 2016 | If Munin ingests communications metadata (e.g., telecom sector), IPA obligations may apply | Open | Exclude telecom metadata from initial deployment; legal review before sector expansion |
| Cross-border EU incidents | Packets crossing member-state boundaries may trigger conflicting regulatory requirements | Open | Implement jurisdiction field in `PacketScope`; map to `engine/compliance/regulatory_corpus.py` per country |
| US state-level emergency law variance | State emergency management authorities vary significantly; a single `regulatoryBasis` string may be insufficient | Open | Extend `regulatoryBasis` to array format; populate from state-level regulatory corpus |

---

## 7. References

- `lib/packet/types.ts` — `AuthorisationPacket` interface
- `lib/packet/validate.ts` — Packet validation with `KNOWN_REGULATORY_REFS`
- `lib/packet/diff.ts` — Packet diff engine
- `lib/merkle.ts` — Merkle-proof receipt chain
- `lib/tee.ts` — Trusted Execution Environment
- `lib/pqc.ts` — Post-quantum cryptography
- `lib/audit/auditLog.ts` — Ed25519-signed audit log
- `engine/packetize.py` — Packet generation with regulatory mapping
- `engine/liability_shield.py` — Statutory compliance mapping and certificate generation
- `engine/byzantine_resilience.py` — Multi-sig and Byzantine fault tolerance
- `engine/compliance/regulatory_mapper.py` — Jurisdiction regulatory summaries
- `engine/compliance/regulatory_corpus.py` — Regulatory corpus for playbook design
- `engine/logic_lock.py` — Physics constraint validation
- `research/statutory-mapping.md` — Statutory mapping whitepaper

**END OF DOCUMENT — REG-MAP-001 v1.0**
