# SAFETY CASE --- Munin v1

| Field              | Value                                                        |
|--------------------|--------------------------------------------------------------|
| **Classification** | OFFICIAL-SENSITIVE                                           |
| **Document ID**    | SC-001                                                       |
| **Version**        | 1.0                                                          |
| **Date**           | 2026-03-18                                                   |
| **Author**         | Munin Safety Engineering                                     |
| **Approver**       | Chief Safety Officer (pending)                               |
| **Status**         | DRAFT --- For Internal Review                                |
| **Standard**       | GSN Community Standard v3 (Goal Structuring Notation)        |
| **Related Docs**   | SA-001 (SAFETY_ANALYSIS_STPA.md), TM-001 (THREAT_MODEL.md), IC-001 (IEC62443_MAPPING.md), HL-001 (HAZARD_LOG.md) |

---

## 1. Purpose

This document presents the structured safety argument for Munin v1 using Goal
Structuring Notation (GSN). It demonstrates that Munin v1 is acceptably safe
for read-only deployment in critical infrastructure environments, including
water, power, and transport sectors.

The safety case follows the GSN Community Standard v3 and is intended to
satisfy the requirements of:

- IEC 61508 (Functional Safety)
- IEC 62443 (Industrial Automation and Control Systems Security)
- NIST SP 800-82 Rev 3 (Guide to ICS Security)
- UK Health and Safety Executive guidance on safety cases

---

## 2. Scope and Context

### 2.1 System Description

Munin v1 is a read-only situational awareness platform for critical national
infrastructure. It ingests telemetry from SCADA/ICS systems via a
unidirectional data diode, performs causal graph analysis, and presents
advisory recommendations to human operators.

### 2.2 Deployment Context

Munin operates at Purdue Model Level 3.5 (between the Site Operations network
and the Enterprise zone). It receives data from Level 2 via a hardware data
diode and presents outputs to operators at Level 4.

### 2.3 Operational Constraints

- **Read-only**: Munin has no write path to any operational technology system.
- **Advisory-only**: All outputs are recommendations; operators retain full
  decision authority.
- **Air-gapped analysis**: The analysis engine operates within a
  network-isolated zone with no outbound connectivity.

---

## 3. GSN Safety Argument

### G1 --- Top-Level Goal

> **Munin v1 is acceptably safe for read-only deployment in critical
> infrastructure environments.**

**Justification**: Acceptable safety is defined as: the system shall not
introduce any new hazard to the operational environment, and shall reduce the
probability of existing hazards through improved situational awareness, while
maintaining operator authority over all decisions.

---

### S1 --- Strategy: Decompose by Failure Mode

The top-level goal G1 is supported by decomposition into six independent
safety claims, each addressing a distinct failure mode category. This strategy
ensures completeness by covering:

1. Actuation hazards (C1)
2. Information accuracy hazards (C2)
3. Operator authority hazards (C3)
4. Audit integrity hazards (C4)
5. Collusion / single-actor abuse hazards (C5)
6. Sensor data quality hazards (C6)

Each claim is supported by specific evidence artefacts, including source code,
tests, configuration, and operational procedures.

---

### C1 --- No Autonomous Actuation

> **Claim**: Munin v1 cannot autonomously actuate any physical system, modify
> any SCADA set-point, or issue any control command to operational technology.

#### Evidence

| Evidence ID | Artefact                                      | Description                                           |
|-------------|-----------------------------------------------|-------------------------------------------------------|
| E1.1        | `engine/safety_guard.py`                      | Safety guard module that enforces read-only mode at the engine boundary. All output functions are gated by `WRITE_ACCESS_ENABLED` flag. |
| E1.2        | `engine/data_diode.py`                        | Unidirectional data diode implementation. Hardware diode ensures physical impossibility of reverse data flow. Software layer validates diode discipline. |
| E1.3        | `engine/tests/test_no_write_access.py`        | Property-based test suite verifying that no code path can produce a write command when `WRITE_ACCESS_ENABLED=false`. Uses Hypothesis to generate arbitrary inputs. |
| E1.4        | `middleware.ts` (CSP headers)                 | Content Security Policy headers preventing any outbound connections from the UI layer. `connect-src 'self'` enforced. |
| E1.5        | `engine/config.py`                            | Configuration module. `WRITE_ACCESS_ENABLED` defaults to `false` and is validated at startup. Override requires physical key ceremony. |
| E1.6        | Network architecture                          | Hardware data diode (Waterfall, Owl, or equivalent) installed between OT network and Munin analysis zone. Certified to EAL4+ or NCSC CPA Foundation Grade. |

#### Argument

The combination of hardware data diode (E1.6), software diode discipline
(E1.2), safety guard enforcement (E1.1), and property-based testing (E1.3)
provides defence-in-depth assurance that Munin cannot actuate physical systems.
The `WRITE_ACCESS_ENABLED` flag is architecturally enforced, not merely a
configuration option: the safety guard module intercepts all output paths and
rejects any payload that would constitute a write command.

The middleware CSP headers (E1.4) provide an additional layer by preventing the
browser-based UI from establishing any connection outside the Munin deployment
boundary.

#### Residual Risk

- **RR1.1**: A future code change could inadvertently bypass the safety guard.
  **Mitigation**: CI pipeline includes mandatory execution of
  `test_no_write_access.py`; merge to `main` requires two independent
  approvals from personnel holding the Safety Reviewer role.
- **RR1.2**: Hardware data diode failure. **Mitigation**: Diode health is
  monitored by independent watchdog; loss of diode signal triggers automatic
  Munin shutdown (fail-safe).

---

### C2 --- Graph Accuracy is Bounded

> **Claim**: The causal graph produced by Munin has quantified accuracy bounds,
> and these bounds are communicated to operators with every recommendation.

#### Evidence

| Evidence ID | Artefact                                         | Description                                           |
|-------------|--------------------------------------------------|-------------------------------------------------------|
| E2.1        | `engine/infer_graph.py`                          | Causal inference engine. Every edge in the output graph carries a confidence score in [0.0, 1.0]. |
| E2.2        | `engine/tests/test_infer_graph_properties.py`    | Property-based tests (Hypothesis) verifying: (a) confidence scores are always in valid range, (b) graph is acyclic, (c) deterministic replay produces identical output. |
| E2.3        | `engine/tests/test_determinism_properties.py`    | Determinism tests ensuring identical inputs produce identical graph outputs across multiple runs. |
| E2.4        | `engine/tests/test_golden_fixtures.py`           | Golden fixture tests comparing engine output against manually verified baseline datasets including Storm Desmond replay data. |
| E2.5        | `engine/formal_verification.py`                  | Formal verification harness for critical graph properties (acyclicity, bounded fan-out, monotonic confidence decay). |
| E2.6        | `engine/analysis/evidence_quality.py`            | Evidence quality scoring module. Assigns quality grades (A-F) to each data source feeding the graph. |

#### Argument

Graph accuracy is bounded through three complementary mechanisms:

1. **Confidence scoring** (E2.1): Every causal relationship carries a
   quantified confidence score. Operators see both the recommendation and its
   confidence level.
2. **Property-based testing** (E2.2, E2.3): Hypothesis-driven tests verify
   structural invariants (acyclicity, valid ranges) across millions of
   generated inputs.
3. **Golden fixture validation** (E2.4): Output is compared against
   manually-verified historical events to ensure accuracy against known-good
   baselines.

The formal verification harness (E2.5) provides mathematical guarantees on
critical graph properties. Evidence quality scoring (E2.6) ensures operators
can assess the reliability of underlying data.

#### Residual Risk

- **RR2.1**: Novel failure modes not present in training/test data may produce
  inaccurate graphs. **Mitigation**: Confidence scores will be low for
  unfamiliar patterns; operator training emphasises that low-confidence
  recommendations require independent verification.
- **RR2.2**: Adversarial sensor data could produce misleading graphs.
  **Mitigation**: See C6 (Sensor Health Filtering).

---

### C3 --- Operator Override Always Available

> **Claim**: Human operators can always override, dismiss, or ignore any Munin
> recommendation. The system cannot compel any action.

#### Evidence

| Evidence ID | Artefact                                      | Description                                           |
|-------------|-----------------------------------------------|-------------------------------------------------------|
| E3.1        | `lib/packet/types.ts`                         | Packet status model. All Munin outputs are typed as `Advisory` --- never `Command` or `Directive`. |
| E3.2        | `lib/packet/validate.ts`                      | Packet validation enforces that no packet can be created with status `Command`. Rejects at serialisation boundary. |
| E3.3        | `engine/packetize.py`                         | Engine packetisation module. Output packets are tagged `ADVISORY_ONLY` with mandatory human acknowledgement fields. |
| E3.4        | `engine/logic_lock.py`                        | Logic-Lock rule engine. Constitutional constraints prevent any recommendation from being framed as mandatory. |
| E3.5        | `playbooks/constraints/constitution.yaml`     | Constitutional constraint definitions. Includes rule: "All outputs shall be advisory. No output shall be presented as a command, order, or mandatory action." |
| E3.6        | UI design documentation                       | All recommendation displays include "Dismiss" and "Override" controls. No recommendation auto-executes. |

#### Argument

Operator authority is preserved through a layered approach:

1. **Type system** (E3.1, E3.2): The packet type system makes it structurally
   impossible to create a command-type output.
2. **Logic-Lock** (E3.4): Constitutional constraints enforce advisory-only
   language at the recommendation generation stage.
3. **UI design** (E3.6): Every recommendation includes explicit dismiss/override
   controls.

This ensures that Munin serves as a decision-support tool, not a
decision-making system.

#### Residual Risk

- **RR3.1**: Operators may develop automation bias and treat recommendations
  as commands. **Mitigation**: Operator training programme includes automation
  bias awareness; periodic drills present deliberately incorrect
  recommendations to verify operator critical thinking.
- **RR3.2**: Under time pressure, operators may not read confidence scores.
  **Mitigation**: High-criticality recommendations use visual differentiation
  (colour coding, mandatory acknowledgement dialogs).

---

### C4 --- Audit Trail Immutability

> **Claim**: The Munin audit trail is tamper-evident and provides cryptographic
> proof of integrity for all system actions and recommendations.

#### Evidence

| Evidence ID | Artefact                                         | Description                                           |
|-------------|--------------------------------------------------|-------------------------------------------------------|
| E4.1        | `lib/merkle.ts`                                  | Merkle tree implementation for audit log entries. Each entry is hashed and chained to its predecessor. |
| E4.2        | `lib/audit/auditLogVerification.ts`              | Audit log verification module. Provides chain integrity verification, gap detection, and tamper alerting. |
| E4.3        | `lib/audit/auditLog.ts`                          | Core audit logging module. All system actions are logged with timestamp, actor, action, and evidence hash. |
| E4.4        | `lib/__tests__/merkle.test.ts`                   | Merkle chain test suite verifying: (a) chain integrity across appends, (b) tamper detection, (c) independent verification. |
| E4.5        | `lib/audit/ed25519.ts`                           | Ed25519 digital signature module for audit entry signing. |
| E4.6        | `lib/audit/keyManagement.ts`                     | Key management for audit signing keys. Supports HSM-backed key storage. |
| E4.7        | `engine/audit_log.py`                            | Engine-side audit logging. All inference runs are logged with input hash, output hash, and execution metadata. |
| E4.8        | `engine/provenance_ledger.py`                    | Provenance ledger providing full chain-of-custody for every data element from ingestion to recommendation. |

#### Argument

Audit trail immutability is guaranteed through:

1. **Merkle chaining** (E4.1): Each audit entry includes the hash of the
   previous entry, creating a tamper-evident chain. Any modification to a
   historical entry invalidates all subsequent hashes.
2. **Digital signatures** (E4.5): Each entry is signed with Ed25519, binding
   the entry to a specific signing key and preventing forgery.
3. **Verification tooling** (E4.2): Independent verification can be performed
   at any time to confirm chain integrity.
4. **Provenance tracking** (E4.8): Full data lineage from sensor reading to
   operator recommendation.

#### Residual Risk

- **RR4.1**: Key compromise could allow forged audit entries.
  **Mitigation**: Keys are stored in HSM; key rotation policy requires
  quarterly rotation; compromised key revocation is immediate.
- **RR4.2**: Audit storage exhaustion could prevent new entries.
  **Mitigation**: Storage monitoring with 90% threshold alerting; archival
  procedures for aged entries.

---

### C5 --- Byzantine Quorum Prevents Single-Actor Abuse

> **Claim**: No single actor (human or software component) can unilaterally
> modify Munin's operational behaviour, suppress recommendations, or alter
> the audit trail.

#### Evidence

| Evidence ID | Artefact                                          | Description                                           |
|-------------|---------------------------------------------------|-------------------------------------------------------|
| E5.1        | `engine/byzantine_resilience.py`                  | Byzantine fault-tolerant quorum module. Implements M-of-N signing for critical operations. |
| E5.2        | `engine/tests/test_approval_workflow_extended.py` | Extended approval workflow tests verifying quorum enforcement across all critical paths. |
| E5.3        | `engine/tests/test_packetize_minimum_sign_off.py` | Tests verifying minimum sign-off requirements for packet publication. |
| E5.4        | `lib/audit/decisions.ts`                          | Decision audit module. All quorum decisions are logged with individual votes and timestamps. |
| E5.5        | `lib/auth/rbac.ts`                                | Role-based access control. Enforces separation of duties between Operator, Analyst, and Administrator roles. |
| E5.6        | `engine/verify_single_signoff.py`                 | Verification tool that scans the codebase for any path that permits single-signoff for critical actions. |

#### Argument

Byzantine resilience is achieved through:

1. **M-of-N quorum** (E5.1): Critical operations require M signatures from N
   authorised key-holders. Default configuration: 3-of-5 for configuration
   changes, 2-of-3 for recommendation suppression.
2. **Separation of duties** (E5.5): RBAC enforces that no single role has
   sufficient permissions to both generate and approve a recommendation.
3. **Decision auditing** (E5.4): All quorum decisions are immutably logged,
   enabling post-hoc verification of proper procedure.

#### Residual Risk

- **RR5.1**: Collusion among quorum members. **Mitigation**: Quorum members
  are drawn from independent organisational units; periodic rotation of quorum
  membership.
- **RR5.2**: Quorum unavailability during crisis. **Mitigation**: Emergency
  degraded-mode procedures documented in operations runbook; degraded mode
  increases logging verbosity and restricts available actions.

---

### C6 --- Sensor Health Filtering Prevents False Correlations

> **Claim**: Munin filters sensor data by health status before performing
> causal analysis, preventing degraded or malicious sensor data from
> producing false correlations.

#### Evidence

| Evidence ID | Artefact                                         | Description                                           |
|-------------|--------------------------------------------------|-------------------------------------------------------|
| E6.1        | `engine/sensor_health.py`                        | Sensor health monitoring module. Classifies sensors as HEALTHY, DEGRADED, SUSPECT, or FAILED based on statistical analysis. |
| E6.2        | `engine/physical_verification.py`                | Physical verification module. Cross-references sensor readings against physics-based models to detect anomalous data. |
| E6.3        | `engine/physical_truth.py`                       | Physical truth engine. Validates sensor data against known physical constraints (e.g., water cannot flow uphill). |
| E6.4        | `engine/tests/test_infer_graph_properties.py`    | Property-based tests verifying that FAILED sensors are excluded from graph inference and DEGRADED sensors are down-weighted. |
| E6.5        | `engine/quantum_sensors.py`                      | Quantum sensor integration for high-assurance measurement verification (future capability). |
| E6.6        | `engine/consistency_checks.py`                   | Cross-sensor consistency checks. Detects when multiple sensors report physically impossible combinations. |

#### Argument

Sensor health filtering provides three layers of protection:

1. **Statistical health monitoring** (E6.1): Continuous monitoring of sensor
   behaviour detects drift, stuck values, noise floor changes, and
   communication failures.
2. **Physics-based verification** (E6.2, E6.3): Sensor readings are validated
   against physical models. Readings that violate physical laws are flagged
   and excluded from analysis.
3. **Cross-sensor consistency** (E6.6): Multiple sensors monitoring the same
   or related physical quantities are cross-checked for consistency.

#### Residual Risk

- **RR6.1**: Sophisticated adversary could manipulate sensors to produce
  physically plausible but incorrect readings. **Mitigation**: Multi-modal
  verification (`engine/physical_verification_multi_modal.py`) cross-references
  with independent data sources including satellite verification
  (`engine/satellite_verification.py`).
- **RR6.2**: Physics models may be incomplete for novel operational
  conditions. **Mitigation**: Models are continuously updated; novel conditions
  trigger elevated uncertainty indicators.

---

## 4. Residual Risks Summary

| Risk ID | Description                                      | Severity | Likelihood | Mitigation Status |
|---------|--------------------------------------------------|----------|------------|-------------------|
| RR1.1   | Code change bypasses safety guard                | Critical | Very Low   | Mitigated          |
| RR1.2   | Hardware data diode failure                      | Critical | Very Low   | Mitigated          |
| RR2.1   | Novel failure modes produce inaccurate graphs    | High     | Low        | Partially Mitigated |
| RR2.2   | Adversarial sensor data                          | High     | Low        | Mitigated (via C6) |
| RR3.1   | Operator automation bias                         | High     | Medium     | Partially Mitigated |
| RR3.2   | Operator ignores confidence scores               | Medium   | Medium     | Partially Mitigated |
| RR4.1   | Audit signing key compromise                     | Critical | Very Low   | Mitigated          |
| RR4.2   | Audit storage exhaustion                         | Medium   | Low        | Mitigated          |
| RR5.1   | Quorum member collusion                          | Critical | Very Low   | Partially Mitigated |
| RR5.2   | Quorum unavailability during crisis              | High     | Low        | Mitigated          |
| RR6.1   | Sophisticated sensor manipulation                | High     | Low        | Partially Mitigated |
| RR6.2   | Incomplete physics models                        | Medium   | Medium     | Partially Mitigated |

---

## 5. Assumptions

| Assumption ID | Description                                                          | Validation Method         |
|---------------|----------------------------------------------------------------------|---------------------------|
| A1            | Hardware data diode is correctly installed and certified              | Installation audit         |
| A2            | Operator training programme is completed before operational use       | Training records           |
| A3            | HSM is available and correctly configured for key management          | HSM certification          |
| A4            | Network segmentation is enforced by infrastructure independent of Munin | Network audit             |
| A5            | Sensor calibration is maintained by asset owners                      | Calibration certificates   |
| A6            | Physical security of the Munin deployment zone is maintained          | Physical security audit    |

---

## 6. Undeveloped Claims

The following claims are identified as requiring further development before
Munin v1 achieves full operational approval:

| Claim ID | Description                                          | Target Completion |
|----------|------------------------------------------------------|-------------------|
| UC1      | Performance under sustained high-throughput ingestion | Q3 2026           |
| UC2      | Behaviour during partial sensor network failure       | Q3 2026           |
| UC3      | Long-term audit chain integrity over 10+ year horizon | Q4 2026           |
| UC4      | Post-quantum cryptographic migration readiness        | Q1 2027           |

---

## 7. Document Cross-References

| Document                  | ID     | Relationship                                     |
|---------------------------|--------|--------------------------------------------------|
| STPA Hazard Analysis      | SA-001 | Provides hazard identification feeding this safety case |
| Threat Model              | TM-001 | Provides threat analysis for security-related claims |
| IEC 62443 Mapping         | IC-001 | Provides compliance mapping for security claims   |
| Hazard Log                | HL-001 | Living record of identified hazards and their status |
| Architecture              | ---    | `ARCHITECTURE.md` provides system design context  |
| Security Practices        | ---    | `docs/SECURITY_PRACTICES.md` provides security implementation details |

---

## 8. Review and Approval

| Role                    | Name    | Date       | Decision          |
|-------------------------|---------|------------|-------------------|
| Safety Engineer         | ---     | ---        | PENDING           |
| Chief Safety Officer    | ---     | ---        | PENDING           |
| Independent Assessor    | ---     | ---        | PENDING           |
| Operational Authority   | ---     | ---        | PENDING           |

---

**END OF DOCUMENT SC-001**

**Classification: OFFICIAL-SENSITIVE**
