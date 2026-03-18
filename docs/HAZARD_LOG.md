# HAZARD LOG --- Munin v1

| Field              | Value                                                        |
|--------------------|--------------------------------------------------------------|
| **Classification** | OFFICIAL-SENSITIVE                                           |
| **Document ID**    | HL-001                                                       |
| **Version**        | 2.0                                                          |
| **Date**           | 2026-03-18                                                   |
| **Author**         | Munin Safety Engineering                                     |
| **Approver**       | Chief Safety Officer (pending)                               |
| **Status**         | DRAFT --- For Internal Review                                |
| **Standard**       | IEC 61508, UK HSE ALARP Guidance                             |
| **Supersedes**     | HL-001 v0.4.0-draft                                          |
| **Review Cycle**   | Monthly (or after any incident, near-miss, or design change) |
| **Related Docs**   | SC-001 (SAFETY_CASE.md), SA-001 (SAFETY_ANALYSIS_STPA.md), TM-001 (THREAT_MODEL.md), IC-001 (IEC62443_MAPPING.md) |

---

## 1. Purpose

This document constitutes the evolving hazard log for the Munin v1 platform.
It identifies, assesses, and tracks hazards arising from the deployment and
operation of an AI-assisted situational awareness system in critical national
infrastructure environments.

This is a living document. It shall be reviewed at least monthly, and
additionally after any incident, near-miss, design change, or deployment
to a new infrastructure domain.

This version (2.0) supersedes the earlier draft (v0.4.0) with expanded hazard
coverage and cross-references to safety case claims and STPA hazards.

---

## 2. ALARP Methodology

### 2.1 As Low As Reasonably Practicable

All identified hazards are assessed using the ALARP (As Low As Reasonably
Practicable) principle as mandated by UK Health and Safety at Work Act 1974
and applied within IEC 61508 / IEC 61511 frameworks.

ALARP requires that risk is reduced to a level where further reduction would
be grossly disproportionate to the cost (in time, resources, or capability
loss) of achieving it. The burden of proof lies with the duty holder to
demonstrate that residual risk is tolerable.

### 2.2 Risk Matrix

**Likelihood Scale:**

| Level | Descriptor  | Frequency                                    |
|-------|-------------|----------------------------------------------|
| 1     | Improbable  | Less than once per 10,000 operating hours    |
| 2     | Remote      | Once per 1,000--10,000 operating hours       |
| 3     | Occasional  | Once per 100--1,000 operating hours          |
| 4     | Probable    | Once per 10--100 operating hours             |
| 5     | Frequent    | More than once per 10 operating hours        |

**Severity Scale:**

| Level | Descriptor   | Consequence                                        |
|-------|--------------|----------------------------------------------------|
| A     | Catastrophic | Loss of life; permanent infrastructure damage      |
| B     | Critical     | Serious injury; major infrastructure disruption (>24h) |
| C     | Marginal     | Minor injury; infrastructure degradation (<24h)    |
| D     | Negligible   | No injury; minor operational inconvenience         |

**Risk Classification Matrix:**

|               | A (Catastrophic) | B (Critical) | C (Marginal) | D (Negligible) |
|---------------|-------------------|--------------|--------------|----------------|
| 5 (Frequent)  | INTOLERABLE       | INTOLERABLE  | UNDESIRABLE  | UNDESIRABLE    |
| 4 (Probable)  | INTOLERABLE       | UNDESIRABLE  | UNDESIRABLE  | TOLERABLE      |
| 3 (Occasional)| UNDESIRABLE       | UNDESIRABLE  | TOLERABLE    | TOLERABLE      |
| 2 (Remote)    | UNDESIRABLE       | TOLERABLE    | TOLERABLE    | BROADLY ACCEPTABLE |
| 1 (Improbable)| TOLERABLE         | TOLERABLE    | BROADLY ACCEPTABLE | BROADLY ACCEPTABLE |

### 2.3 Risk Classification Definitions

- **INTOLERABLE**: Work must not proceed or continue. Immediate remediation
  required. System must not be deployed until risk is reduced.
- **UNDESIRABLE**: Risk must be reduced unless further measures are grossly
  disproportionate to the benefit. Requires documented justification if
  accepted.
- **TOLERABLE**: Acceptable if maintained at this level. Requires ongoing
  monitoring for drift. No further reduction required unless easily achievable.
- **BROADLY ACCEPTABLE**: No further action required beyond standard
  monitoring and good practice.

---

## 3. Hazard Register

### HAZ-001: Misleading Cascade Visualisation

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-001                                                  |
| **Description** | Causal graph engine produces an incorrect cascade visualisation that misrepresents the actual failure propagation path |
| **Cause**       | Model error in causal inference logic (`engine/infer_graph.py`); insufficient training data for the specific infrastructure domain; confounding variables in sensor data |
| **Consequence** | Operator takes action based on false situational awareness; may respond to a phantom cascade while ignoring the real threat, or vice versa |
| **STPA Ref**    | H1 (Misleading recommendation), UCA-2.1                 |
| **Safety Case** | C2 (Graph accuracy is bounded)                           |
| **Initial Risk**| 3B --- UNDESIRABLE                                       |
| **Mitigation**  | Logic-Lock deterministic verification (`engine/logic_lock.py`); mandatory confidence intervals on all visualisations; dual-display showing raw sensor data alongside model output; golden fixture regression tests (`engine/tests/test_golden_fixtures.py`); property-based tests (`engine/tests/test_infer_graph_properties.py`) |
| **Residual Risk**| 2C --- TOLERABLE                                        |
| **Status**      | OPEN                                                     |
| **Owner**       | Analysis Engine Team                                     |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-002: Sensor Data Manipulation

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-002                                                  |
| **Description** | Adversary manipulates sensor data upstream of the data diode, injecting false readings into the Munin ingestion pipeline |
| **Cause**       | Compromise of field sensor at Level 0/1; compromise of historian at Level 3; exploitation of protocol translator vulnerability |
| **Consequence** | Corrupted ground truth causes incorrect causal analysis; graph engine produces systematically biased recommendations that could lead operator to take harmful action or fail to respond to genuine threat |
| **STPA Ref**    | H7 (Compromised sensor data), UCA-1.1 (CS-1.1.2)        |
| **Safety Case** | C6 (Sensor health filtering)                             |
| **Threat Model**| AT-1 (Manipulate recommendations), T1                    |
| **Initial Risk**| 3B --- UNDESIRABLE                                       |
| **Mitigation**  | Sensor health classification (`engine/sensor_health.py`) with HEALTHY/DEGRADED/SUSPECT/FAILED states; physics-based verification (`engine/physical_truth.py`) cross-referencing against physical models; cross-sensor consistency checks (`engine/consistency_checks.py`); multi-modal physical verification (`engine/physical_verification_multi_modal.py`); data provenance tracking (`engine/provenance_tracker.py`) |
| **Residual Risk**| 2C --- TOLERABLE                                        |
| **Status**      | OPEN                                                     |
| **Owner**       | Sensor Integration Team                                  |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-003: Quorum Bypass via Key Compromise

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-003                                                  |
| **Description** | Attacker obtains sufficient signing keys (M of N) to meet the Byzantine quorum threshold, enabling execution of quorum-protected actions without legitimate multi-party approval |
| **Cause**       | Social engineering of key holders; physical theft of HSM tokens; insider collusion; exploitation of key management vulnerability |
| **Consequence** | Unauthorised configuration changes executed with apparent legitimacy; governance controls circumvented; potential suppression of valid recommendations or injection of false constraints |
| **STPA Ref**    | H1 (via governance bypass)                               |
| **Safety Case** | C5 (Byzantine quorum)                                    |
| **Threat Model**| AT-5 (Bypass Byzantine quorum), T8                       |
| **Initial Risk**| 2B --- TOLERABLE                                         |
| **Mitigation**  | HSM-backed key storage with hardware token requirement (`lib/audit/keyManagement.ts`); geographic distribution of key holders across independent organisational units; key rotation policy (quarterly); anomalous signing pattern detection; M-of-N tests (`engine/tests/test_packetize_minimum_sign_off.py`); key revocation procedure with <1h SLA |
| **Residual Risk**| 1B --- TOLERABLE                                        |
| **Status**      | OPEN                                                     |
| **Owner**       | Cryptographic Engineering Team                           |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-004: Signing Key Compromise (Individual)

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-004                                                  |
| **Description** | A single key holder's signing credentials are compromised through phishing, malware, or physical theft |
| **Cause**       | Targeted phishing attack; malware on key holder's workstation; physical theft of HSM token; coercion of key holder |
| **Consequence** | Attacker can contribute one share toward quorum; reduces effective security margin of M-of-N scheme from (N-M+1) to (N-M) honest parties required; may enable quorum bypass if combined with other compromises |
| **STPA Ref**    | Related to H1 (via governance degradation)               |
| **Safety Case** | C5 (Byzantine quorum)                                    |
| **Threat Model**| AT-5, AP2 (Insider)                                      |
| **Initial Risk**| 3C --- TOLERABLE                                         |
| **Mitigation**  | Hardware token requirement (key material never leaves HSM); key revocation procedure with <1h SLA; automatic re-keying on suspected compromise; monitoring for anomalous signing patterns; personnel security vetting for key holders |
| **Residual Risk**| 2D --- BROADLY ACCEPTABLE                               |
| **Status**      | OPEN                                                     |
| **Owner**       | Cryptographic Engineering Team                           |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-005: Operator Fatigue During Extended Incident

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-005                                                  |
| **Description** | During a multi-day infrastructure crisis, sustained operator engagement with the Munin console leads to cognitive fatigue and degraded decision quality |
| **Cause**       | Extended incident duration (>12h); high alert volume; complex multi-domain cascade requiring sustained concentration; inadequate shift rotation |
| **Consequence** | Degraded decision quality; missed alerts; incorrect approval of playbook recommendations; delayed response to genuine escalation; potential for catastrophic error during critical decision window |
| **STPA Ref**    | H3 (Correct recommendation ignored due to distrust/fatigue) |
| **Safety Case** | C3 (Operator override always available)                  |
| **Initial Risk**| 4C --- UNDESIRABLE                                       |
| **Mitigation**  | Mandatory shift rotation enforcement in UI (configurable shift duration, default 8h); cognitive load indicators in dashboard; progressive alert summarisation to reduce information overload; automatic escalation if operator response time degrades beyond threshold; fatigue-aware UI mode with reduced information density; operator training on fatigue recognition |
| **Residual Risk**| 3D --- TOLERABLE                                        |
| **Status**      | OPEN                                                     |
| **Owner**       | Human Factors Team                                       |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-006: Air-Gap Breach via Maintenance Channel

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-006                                                  |
| **Description** | Introduction of a maintenance laptop, USB device, or other removable media into the Munin analysis zone creates a transient bidirectional path, bypassing the data diode guarantee |
| **Cause**       | Maintenance procedure requires temporary connectivity; USB device introduced for software update or log extraction; maintenance laptop with external network connection brought into zone |
| **Consequence** | Potential for malware introduction into analysis zone; data exfiltration of sensitive infrastructure telemetry; undermines the foundational data diode security guarantee; potential pivot to OT network if maintenance device has cross-zone connectivity |
| **STPA Ref**    | H7 (via data integrity compromise)                       |
| **Safety Case** | C1 (No autonomous actuation --- data diode dependency)   |
| **Threat Model**| AT-4 (Exfiltrate data), AP2 (Insider)                    |
| **IEC 62443**   | IC-001 Conduit C1 (data diode conduit integrity)         |
| **Initial Risk**| 2A --- UNDESIRABLE                                       |
| **Mitigation**  | Physical access controls with two-person rule for all maintenance activities; USB port hardware disabling in analysis zone; automated detection of new network interfaces with immediate alerting; removable media scanner (write-once verification); maintenance audit trail with mandatory pre/post-maintenance security checklist; ban on cross-zone connectivity from any single device |
| **Residual Risk**| 1B --- TOLERABLE                                        |
| **Status**      | OPEN                                                     |
| **Owner**       | Physical Security and Operations Team                    |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-007: PQC Algorithm Weakness Discovered

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-007                                                  |
| **Description** | A selected post-quantum cryptographic algorithm (ML-KEM for key encapsulation or ML-DSA for digital signatures) is found to have an exploitable mathematical weakness before or after standardisation |
| **Cause**       | Cryptanalytic breakthrough; implementation-specific side-channel vulnerability; parameter selection error in standardisation process |
| **Consequence** | Confidentiality of encrypted communications compromised (if ML-KEM broken); integrity of digital signatures weakened (if ML-DSA broken); audit trail non-repudiation guarantee degraded; potential for forgery of quorum signatures |
| **Safety Case** | C4 (Audit trail immutability), C5 (Byzantine quorum)     |
| **Threat Model**| T9, AP1 (Nation-state)                                   |
| **Initial Risk**| 2B --- TOLERABLE                                         |
| **Mitigation**  | Cryptographic agility layer (`lib/pqc.ts`) enabling rapid algorithm substitution without system-wide changes; hybrid classical+PQC mode as default (Ed25519 + ML-DSA dual signatures); continuous monitoring of NIST PQC standardisation process and cryptanalytic literature; pre-tested fallback configurations for immediate deployment; PQC key management module (`lib/pqc_key_management.ts`) supports multiple algorithm families |
| **Residual Risk**| 1C --- BROADLY ACCEPTABLE                               |
| **Status**      | OPEN                                                     |
| **Owner**       | Cryptographic Engineering Team                           |
| **Review Date** | 2026-06-18                                               |

---

### HAZ-008: Logic-Lock False Positive

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-008                                                  |
| **Description** | The Logic-Lock deterministic verification mechanism incorrectly flags a legitimate analysis output as non-reproducible or constraint-violating, suppressing a valid recommendation |
| **Cause**       | Overly strict constraint rules in `engine/logic_lock_rules.yaml`; edge case in determinism verification not covered by tests; floating-point precision differences across execution environments; race condition in parallel verification |
| **Consequence** | Operator denied access to time-critical recommendation during a genuine infrastructure emergency; delayed response window; potential for cascade escalation that could have been prevented by timely advisory |
| **STPA Ref**    | H2 (Delayed recommendation), UCA-1.3 (CS-1.3.3)         |
| **Safety Case** | C3 (Operator override)                                   |
| **Threat Model**| T10                                                      |
| **Initial Risk**| 3C --- TOLERABLE                                         |
| **Mitigation**  | Override mechanism requiring dual approval (two independent authorised personnel); false positive rate monitoring with SLA (target: <0.1% of valid recommendations); tunable sensitivity thresholds per infrastructure domain; bypass audit trail with mandatory post-incident review; property-based tests for Logic-Lock rules; determinism tests (`engine/tests/test_determinism_properties.py`) |
| **Residual Risk**| 2D --- BROADLY ACCEPTABLE                               |
| **Status**      | OPEN                                                     |
| **Owner**       | Safety Engineering Team                                  |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-009: Audit Chain Corruption

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-009                                                  |
| **Description** | The Merkle-tree audit log is corrupted through hash collision, storage failure, insider manipulation, or software bug, compromising the integrity of the decision record |
| **Cause**       | Storage hardware failure causing data corruption; insider with storage access modifying entries; software bug in Merkle chain append logic; hash function vulnerability enabling collision |
| **Consequence** | Loss of non-repudiation for operator decisions; inability to reconstruct decision history during post-incident investigation; governance accountability undermined; regulatory compliance failure; potential concealment of malicious actions |
| **STPA Ref**    | H6 (Corrupted audit trail)                               |
| **Safety Case** | C4 (Audit trail immutability)                            |
| **Threat Model**| AT-3 (Corrupt audit trail), T3                           |
| **Initial Risk**| 2B --- TOLERABLE                                         |
| **Mitigation**  | Append-only storage with write-once media where available; Merkle chain integrity verification (`lib/audit/auditLogVerification.ts`) with scheduled periodic checks; Ed25519 digital signatures on every entry (`lib/audit/ed25519.ts`); independent audit log replication to regulator-controlled storage; tamper-evident storage hardware; gap detection for missing sequence numbers; Merkle chain tests (`lib/__tests__/merkle.test.ts`) |
| **Residual Risk**| 1C --- BROADLY ACCEPTABLE                               |
| **Status**      | OPEN                                                     |
| **Owner**       | Audit and Compliance Team                                |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-010: Training Mode Confusion

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-010                                                  |
| **Description** | Operator fails to distinguish the training/simulation environment from the live production system, leading to either real actions based on simulated scenarios or ignoring genuine alerts believed to be training exercises |
| **Cause**       | Inadequate visual differentiation between training and production modes; mode transition without explicit acknowledgement; shared workstation used for both modes; operator handover without mode status communication |
| **Consequence** | Scenario A: Actions taken in belief of training context affect real infrastructure decisions. Scenario B: Genuine alerts during production operation are dismissed as training scenarios, leading to missed response to real infrastructure threat |
| **STPA Ref**    | H1 (Misleading recommendation --- context confusion), H3 (Correct recommendation ignored) |
| **Safety Case** | C3 (Operator override)                                   |
| **Initial Risk**| 3B --- UNDESIRABLE                                       |
| **Mitigation**  | Distinct visual theming for training mode (full-screen red border, persistent watermark "TRAINING MODE"); training mode flag in all API responses; physical indicator light on console hardware (amber for training, green for production); session recording with mode verification; mandatory explicit acknowledgement dialog on every mode transition; training and production modes on physically separate workstations where feasible; mode status in all audit log entries |
| **Residual Risk**| 2C --- TOLERABLE                                        |
| **Status**      | OPEN                                                     |
| **Owner**       | Human Factors Team                                       |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-011: Data Diode Hardware Failure

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-011                                                  |
| **Description** | The physical data diode device fails (component failure, power loss, fibre break), causing loss of sensor data feed to the Munin analysis zone |
| **Cause**       | Electronic component failure; power supply failure; optical fibre physical damage; environmental conditions (temperature, humidity); scheduled maintenance window |
| **Consequence** | Munin operates on stale data without operator awareness; analysis accuracy degrades as data ages; operators may make decisions based on outdated situational picture; during crisis, loss of real-time situational awareness at the worst possible time |
| **Safety Case** | C1 (No autonomous actuation --- diode dependency)        |
| **IEC 62443**   | IC-001 Conduit C1                                        |
| **Initial Risk**| 3C --- TOLERABLE                                         |
| **Mitigation**  | Heartbeat monitoring on diode output with configurable timeout (default: 5 seconds); automatic staleness detection on ingested data with prominent UI indicator showing data age; redundant diode path (active/standby with automatic failover); power supply redundancy (dual PSU, UPS); prominent "DATA STALE" banner when last reading exceeds threshold; automatic notification to operations team on diode health degradation |
| **Residual Risk**| 2D --- BROADLY ACCEPTABLE                               |
| **Status**      | OPEN                                                     |
| **Owner**       | Infrastructure and Operations Team                       |
| **Review Date** | 2026-04-18                                               |

---

### HAZ-012: Configuration Tampering

| Field           | Value                                                    |
|-----------------|----------------------------------------------------------|
| **Hazard ID**   | HAZ-012                                                  |
| **Description** | Authorised insider or compromised account modifies Munin system configuration to weaken security controls, alter analysis parameters, or change recommendation thresholds |
| **Cause**       | Insider threat (malicious or coerced); compromised administrator account; social engineering of configuration approval quorum; exploitation of configuration management vulnerability |
| **Consequence** | Degraded security posture (e.g., weakened authentication, disabled audit logging); biased analysis output (e.g., altered confidence thresholds, modified graph inference parameters); potential for undetected manipulation of recommendations over an extended period |
| **STPA Ref**    | H1 (Misleading recommendation via parameter manipulation) |
| **Safety Case** | C5 (Byzantine quorum)                                    |
| **Threat Model**| T5 (Insider suppresses recommendation), AP2              |
| **Initial Risk**| 3B --- UNDESIRABLE                                       |
| **Mitigation**  | All configuration changes require Byzantine quorum approval (`engine/byzantine_resilience.py`); configuration stored as signed, versioned artefacts with Merkle chain integrity; drift detection comparing running configuration to signed baseline; configuration change audit trail with mandatory review; separation of duties between configuration authors and approvers; configuration change notification to all quorum members |
| **Residual Risk**| 2C --- TOLERABLE                                        |
| **Status**      | OPEN                                                     |
| **Owner**       | Platform Security Team                                   |
| **Review Date** | 2026-04-18                                               |

---

## 4. Hazard Summary Table

| ID      | Description                          | Initial Risk | Residual Risk      | Status |
|---------|--------------------------------------|--------------|--------------------|--------|
| HAZ-001 | Misleading cascade visualisation     | 3B UNDESIRABLE | 2C TOLERABLE     | OPEN   |
| HAZ-002 | Sensor data manipulation             | 3B UNDESIRABLE | 2C TOLERABLE     | OPEN   |
| HAZ-003 | Quorum bypass via key compromise     | 2B TOLERABLE   | 1B TOLERABLE     | OPEN   |
| HAZ-004 | Individual signing key compromise    | 3C TOLERABLE   | 2D BROADLY ACCEPTABLE | OPEN |
| HAZ-005 | Operator fatigue                     | 4C UNDESIRABLE | 3D TOLERABLE     | OPEN   |
| HAZ-006 | Air-gap breach via maintenance       | 2A UNDESIRABLE | 1B TOLERABLE     | OPEN   |
| HAZ-007 | PQC algorithm weakness               | 2B TOLERABLE   | 1C BROADLY ACCEPTABLE | OPEN |
| HAZ-008 | Logic-Lock false positive            | 3C TOLERABLE   | 2D BROADLY ACCEPTABLE | OPEN |
| HAZ-009 | Audit chain corruption               | 2B TOLERABLE   | 1C BROADLY ACCEPTABLE | OPEN |
| HAZ-010 | Training mode confusion              | 3B UNDESIRABLE | 2C TOLERABLE     | OPEN   |
| HAZ-011 | Data diode hardware failure          | 3C TOLERABLE   | 2D BROADLY ACCEPTABLE | OPEN |
| HAZ-012 | Configuration tampering              | 3B UNDESIRABLE | 2C TOLERABLE     | OPEN   |

---

## 5. Hazard Trend Analysis

| Quarter  | Total | Intolerable | Undesirable (post-mitigation) | Tolerable | Broadly Acceptable | New | Closed |
|----------|-------|-------------|-------------------------------|-----------|--------------------|----|--------|
| Q1 2026  | 12    | 0           | 0                             | 7         | 5                  | 12 | 0      |

**Trend Assessment**: All 12 hazards have been reduced to TOLERABLE or
BROADLY ACCEPTABLE through identified mitigations. No INTOLERABLE or
UNDESIRABLE residual risks remain. Continuous monitoring is required to
ensure no drift toward higher risk levels.

---

## 6. Escalation Thresholds

| Residual Risk Level  | Required Action                                         | Escalation Authority          |
|----------------------|---------------------------------------------------------|-------------------------------|
| INTOLERABLE          | Immediate halt; system must not operate                 | Chief Safety Officer          |
| UNDESIRABLE          | Documented justification required within 5 working days | Safety Engineering Lead       |
| TOLERABLE            | Monitor at next scheduled review                        | Hazard Log Owner              |
| BROADLY ACCEPTABLE   | Standard monitoring; no action required                 | Hazard Log Owner              |

---

## 7. Review History

| Date       | Reviewer            | Changes                                          | Next Review |
|------------|---------------------|--------------------------------------------------|-------------|
| 2026-03-18 | Safety Engineering  | v2.0: Expanded from 12 to 12 hazards with full STPA/TM cross-references; added escalation thresholds; added trend analysis | 2026-04-18 |

---

## 8. Approval

| Role                    | Name        | Date       | Signature   |
|-------------------------|-------------|------------|-------------|
| Safety Lead             | [PENDING]   |            |             |
| Chief Safety Officer    | [PENDING]   |            |             |
| Independent Reviewer    | [PENDING]   |            |             |
| Operational Authority   | [PENDING]   |            |             |

---

## 9. Document Cross-References

| Document                  | ID     | Relationship                                     |
|---------------------------|--------|--------------------------------------------------|
| Safety Case               | SC-001 | Hazards map to safety claims C1-C6; residual risks feed safety case |
| STPA Hazard Analysis      | SA-001 | Hazards H1-H7 and UCAs feed this hazard log      |
| Threat Model              | TM-001 | Attack trees AT-1 to AT-5 and threats T1-T10 inform hazard causes |
| IEC 62443 Mapping         | IC-001 | Zone/conduit model provides context for HAZ-006, HAZ-011 |
| Engine Failure Modes      | ---    | `docs/ENGINE_FAILURE_MODES.md` provides failure mode detail |
| Operations Runbook        | ---    | `docs/OPERATIONS_RUNBOOK.md` provides incident response procedures |

---

**END OF DOCUMENT HL-001**

**Classification: OFFICIAL-SENSITIVE**
