# Munin -- Safety Case Summary

**Document Classification:** Procurement-Sensitive | Pre-Decisional
**Version:** 1.0
**Date:** 2026-03-18
**Audience:** Procurement officers, safety engineers, risk managers
**Method:** STPA (System-Theoretic Process Analysis)

---

## 1. Top-Level Safety Claim

**Claim S1:** Munin shall not cause, contribute to, or fail to prevent harm to
critical infrastructure, human safety, or operational continuity.

This claim is supported by the following architectural guarantee:

> Munin v1 is a **read-only advisory system**. It possesses no interface, protocol,
> or mechanism capable of issuing commands to operational technology. It cannot
> actuate, modify, or control any infrastructure asset.

---

## 2. Supporting Sub-Claims

### S1.1: No Actuation Pathway Exists

**Claim:** Munin v1 contains no software interface capable of sending control
commands to infrastructure systems.

**Evidence:**
- Architectural review of all external interfaces confirms unidirectional data flow
  (inbound only via data diode).
- No OPC-UA write client, Modbus write function, DNP3 control relay, or equivalent
  exists in the codebase.
- Static analysis of all network-related code confirms zero outbound connection
  initiation.
- The operator console is a read-only display with no command input fields.

### S1.2: Advisories Are Non-Binding

**Claim:** All outputs produced by Munin are advisory in nature. No output is
automatically executed or forwarded to an actuation system.

**Evidence:**
- Advisory packets are rendered in the operator console for human review.
- Packet format specification (specs/munin-packet-v1.md) defines packets as
  informational; no executable payload field exists.
- Operator workflows require manual action outside of Munin to implement any
  recommendation.

### S1.3: Outputs Are Cryptographically Attributable

**Claim:** Every advisory output can be traced to a specific model version, data
snapshot, and signing authority.

**Evidence:**
- Each packet includes: recommendation text, evidence references, model version
  identifier, topology snapshot hash, UTC timestamp, and Ed25519 + ML-DSA signatures.
- Merkle chain provides tamper-evident sequencing of all packets.
- Verification tooling is included in the distribution for independent audit.

### S1.4: Erroneous Advisories Have Bounded Consequences

**Claim:** If Munin produces an incorrect recommendation, the maximum consequence
is a suboptimal human decision, not an automated infrastructure action.

**Evidence:**
- Read-only architecture (S1.1) ensures no automatic actuation.
- Advisory-only output (S1.2) ensures a human decision-maker must intervene.
- Operators are trained to treat Munin outputs as one input among several.

### S1.5: Data Integrity Is Maintained

**Claim:** Ingested data cannot be modified after ingestion, and Munin cannot modify
data at the source.

**Evidence:**
- Data diode enforces physical unidirectionality.
- Ingested data is stored in an append-only internal representation.
- No write-back interface to historian or source systems exists.

---

## 3. STPA Hazard Analysis Summary

The following hazard analysis was conducted using STPA (System-Theoretic Process
Analysis) as described by Leveson (2011).

### 3.1 System-Level Losses

| ID | Loss Description |
|---|---|
| L-1 | Loss of human life or injury due to infrastructure failure. |
| L-2 | Damage to critical infrastructure assets. |
| L-3 | Disruption of essential services (water, power, transport). |
| L-4 | Loss of public trust in emergency response systems. |

### 3.2 System-Level Hazards

| ID | Hazard | Related Loss |
|---|---|---|
| H-1 | Munin issues an advisory that, if followed, worsens the crisis. | L-1, L-2, L-3 |
| H-2 | Munin fails to identify a critical dependency (false negative). | L-1, L-2, L-3 |
| H-3 | Munin produces an advisory based on stale or corrupted data. | L-1, L-2, L-3, L-4 |
| H-4 | Operators place excessive trust in Munin advisories. | L-1, L-2, L-3, L-4 |
| H-5 | Munin's cryptographic chain is compromised, eroding auditability. | L-4 |

### 3.3 Unsafe Control Actions

| UCA ID | Unsafe Control Action | Hazard | Mitigation |
|---|---|---|---|
| UCA-1 | Munin provides a playbook that conflicts with an undiscovered dependency. | H-1 | Shadow link discovery; operator review before action. |
| UCA-2 | Munin fails to surface a validated playbook during an event. | H-2 | Alerting on ingestion gaps; operator training on manual fallback. |
| UCA-3 | Munin presents an advisory based on data older than the operator assumes. | H-3 | Timestamp display on all packets; data freshness indicators. |
| UCA-4 | Munin presents advisories with high confidence when model uncertainty is high. | H-4 | Confidence scores displayed; operator training on limitations. |

### 3.4 Causal Scenarios and Controls

Each unsafe control action has been traced to causal scenarios (process model flaws,
feedback inadequacies, environmental conditions). Detailed causal analysis is
maintained in the internal safety case documentation and is available upon request
under NDA.

---

## 4. Read-Only v1 Guarantee

The single most important safety property of Munin v1 is its **inability to act on
infrastructure**. This guarantee is enforced at multiple levels:

| Level | Enforcement Mechanism |
|---|---|
| **Architecture** | No outbound control interface exists in the system design. |
| **Code** | No control protocol client (OPC-UA write, Modbus write, DNP3 control) is present in the codebase. |
| **Network** | Air-gapped deployment with data diode eliminates network-based actuation paths. |
| **Specification** | The packet format (SOP-v1) defines no executable or command payload. |
| **Operational** | Deployment guides mandate air-gapped installation and operator training on advisory-only use. |

This guarantee will be relaxed in v2 only under controlled conditions: actuation
commands will require Hardware Security Module (HSM) co-signing, M-of-N operator
authorization, and formal safety case extension.

---

## 5. Residual Risks

The following residual risks are acknowledged and accepted at the prototype stage:

| ID | Residual Risk | Severity | Likelihood | Mitigation Status |
|---|---|---|---|---|
| RR-1 | Shadow link discovery produces false negatives on novel infrastructure configurations. | High | Medium | Algorithm improvement ongoing. Operator training emphasizes Munin as supplementary, not authoritative. |
| RR-2 | Operators over-rely on Munin advisories in high-stress scenarios. | High | Medium | Training materials and console UI include prominence warnings. Planned v2 feature: mandatory operator acknowledgment of uncertainty. |
| RR-3 | Stale data ingestion produces advisories based on outdated topology. | Medium | Medium | Data freshness indicators displayed. Alerting on ingestion gaps. |
| RR-4 | Compromise of signing keys allows forged advisories. | High | Low | Key generated locally. M-of-N rotation. HSM planned for v2. |
| RR-5 | Prototype software contains undetected defects. | Medium | Medium | Standard for prototype stage. Formal verification and independent audit planned prior to production deployment. |

---

*For security architecture details, see SECURITY_OVERVIEW.md.*
*For technical architecture, see TECH_OVERVIEW.md.*
