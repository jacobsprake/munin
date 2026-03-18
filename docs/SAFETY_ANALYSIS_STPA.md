# STPA HAZARD ANALYSIS --- Munin v1

| Field              | Value                                                        |
|--------------------|--------------------------------------------------------------|
| **Classification** | OFFICIAL-SENSITIVE                                           |
| **Document ID**    | SA-001                                                       |
| **Version**        | 1.0                                                          |
| **Date**           | 2026-03-18                                                   |
| **Author**         | Munin Safety Engineering                                     |
| **Approver**       | Chief Safety Officer (pending)                               |
| **Status**         | DRAFT --- For Internal Review                                |
| **Standard**       | STPA Handbook (Leveson & Thomas, 2018)                       |
| **Related Docs**   | SC-001 (SAFETY_CASE.md), TM-001 (THREAT_MODEL.md), IC-001 (IEC62443_MAPPING.md), HL-001 (HAZARD_LOG.md) |

---

## 1. Purpose

This document presents a Systems-Theoretic Process Analysis (STPA) for Munin
v1. STPA is a hazard analysis method based on systems theory that identifies
hazardous scenarios arising from inadequate control actions within a control
structure. Unlike traditional methods (FMEA, FTA), STPA can identify hazards
arising from component interactions, software errors, and human factors.

This analysis covers the Munin system as deployed in a critical national
infrastructure environment for read-only situational awareness.

---

## 2. System Description

### 2.1 System Purpose

Munin v1 provides causal graph analysis and advisory recommendations to human
operators responsible for critical infrastructure (water, power, transport).
It is a read-only system with no actuator control capability.

### 2.2 System Boundary

The system boundary encompasses:
- Munin analysis engine (`engine/`)
- Munin web-based operator interface (`app/`, `components/`)
- Data diode interface (`engine/data_diode.py`)
- Audit and provenance subsystems (`lib/audit/`, `lib/merkle.ts`)

The system boundary excludes:
- SCADA/ICS systems (data sources only)
- Hardware data diode (independent certified device)
- Physical infrastructure (observed, never controlled)
- External networks (air-gapped)

---

## 3. Control Structure Diagram

```
+---------------------------------------------------------------------+
|                        LEVEL 4: ENTERPRISE                           |
|                                                                      |
|  +---------------------+        +-----------------------------+      |
|  |  Incident Commander  |<------>|  Regulatory / Government   |      |
|  |  (Strategic Decisions)|       |  Bodies (Policy, Oversight) |      |
|  +----------+----------+        +-----------------------------+      |
|             |                                                        |
|             | Strategic direction, escalation                        |
|             v                                                        |
+---------------------------------------------------------------------+
|                     LEVEL 3.5: MUNIN ANALYSIS ZONE                   |
|                                                                      |
|  +-----------------------------------------------------------------+ |
|  |                     MUNIN SYSTEM                                 | |
|  |                                                                  | |
|  |  +------------------+   +------------------+   +--------------+ | |
|  |  | Causal Graph     |   | Playbook         |   | Evidence     | | |
|  |  | Engine           |-->| Recommendation   |-->| Presentation | | |
|  |  | (infer_graph.py) |   | (playbook_design)|   | (UI)         | | |
|  |  +--------+---------+   +------------------+   +------+-------+ | |
|  |           |                                            |         | |
|  |           v                                            v         | |
|  |  +------------------+                         +--------------+   | |
|  |  | Sensor Health    |                         | Audit Log    |   | |
|  |  | Filter           |                         | (merkle.ts)  |   | |
|  |  | (sensor_health)  |                         +--------------+   | |
|  |  +--------+---------+                                            | |
|  |           ^                                                      | |
|  +-----------+------------------------------------------------------+ |
|              |                                                       |
|              | READ-ONLY (unidirectional via data diode)              |
|              |                                                       |
+---------------------------------------------------------------------+
|                    LEVEL 3: SITE OPERATIONS                          |
|                                                                      |
|  +---------------------+        +-----------------------------+      |
|  |  Control Room        |        |  Historian / Data Server    |      |
|  |  Operators           |        |                             |      |
|  |  (Human Decision     |        +-------------+--------------+      |
|  |   Authority)         |                      |                     |
|  +----------+-----------+                      |                     |
|             |                                  |                     |
+---------------------------------------------------------------------+
|                    LEVEL 2: SUPERVISORY CONTROL                      |
|                                                                      |
|  +---------------------+        +-----------------------------+      |
|  |  HMI Workstations    |        |  SCADA Servers              |      |
|  +---------------------+        +-----------------------------+      |
|                                                                      |
+---------------------------------------------------------------------+
|                    LEVEL 1: BASIC CONTROL                            |
|                                                                      |
|  +---------------------+        +-----------------------------+      |
|  |  PLCs / RTUs         |        |  Safety Instrumented Systems|      |
|  +---------------------+        +-----------------------------+      |
|                                                                      |
+---------------------------------------------------------------------+
|                    LEVEL 0: PHYSICAL PROCESS                         |
|                                                                      |
|  +---------------------+        +-----------------------------+      |
|  |  Sensors / Actuators |        |  Physical Infrastructure    |      |
|  |  (Field Devices)     |        |  (Pumps, Valves, Turbines)  |      |
|  +---------------------+        +-----------------------------+      |
+---------------------------------------------------------------------+
```

**Key interaction**: Munin receives data unidirectionally from Level 2/3 via
a hardware data diode. Munin presents advisory outputs to operators at
Level 3/4. Munin has no return path to Levels 0-2.

---

## 4. Losses

| Loss ID | Description                                                       | Severity   |
|---------|-------------------------------------------------------------------|------------|
| L1      | Loss of life or serious injury to personnel or public             | Catastrophic |
| L2      | Damage to critical infrastructure assets (physical plant)         | Critical   |
| L3      | Environmental contamination or ecological damage                  | Critical   |
| L4      | Loss of essential services (water supply, power, transport)       | Major      |
| L5      | Loss of public confidence in infrastructure safety systems        | Significant |
| L6      | Regulatory sanction or legal liability                            | Significant |

---

## 5. Hazards

Hazards are system-level conditions that, combined with worst-case
environmental conditions, can lead to losses.

| Hazard ID | Description                                                    | Related Losses |
|-----------|----------------------------------------------------------------|----------------|
| H1        | Misleading recommendation is acted upon by operator, leading to incorrect operational response | L1, L2, L3, L4 |
| H2        | Delayed recommendation causes operator to miss critical time window for intervention | L1, L2, L3, L4 |
| H3        | Correct recommendation is ignored by operator due to distrust of system or alert fatigue | L1, L2, L3, L4 |
| H4        | System unavailability during a crisis deprives operators of situational awareness | L1, L2, L4     |
| H5        | System presents contradictory information causing operator confusion | L1, L2, L4     |
| H6        | Corrupted audit trail prevents post-incident investigation       | L5, L6         |
| H7        | Compromised sensor data produces systematically biased analysis  | L1, L2, L3     |

---

## 6. Safety Constraints

Safety constraints are derived from hazards and define the required system
behaviour to prevent hazardous states.

| Constraint ID | Description                                                  | Derived From |
|---------------|--------------------------------------------------------------|--------------|
| SC-1          | Munin shall never present a recommendation without an accompanying confidence score and evidence summary | H1 |
| SC-2          | Munin shall deliver time-critical recommendations within 30 seconds of triggering condition detection | H2 |
| SC-3          | Munin shall maintain a false positive rate below 5% to prevent alert fatigue | H3 |
| SC-4          | Munin shall maintain 99.9% availability during declared incidents | H4 |
| SC-5          | Munin shall flag contradictory data sources and present uncertainty to operators | H5 |
| SC-6          | Munin shall maintain a tamper-evident audit chain with cryptographic integrity | H6 |
| SC-7          | Munin shall validate sensor health before including data in causal analysis | H7 |

---

## 7. Unsafe Control Actions (UCAs)

### 7.1 Action Type: Recommend Playbook

The Munin system recommends a playbook (a pre-defined response procedure)
to operators based on causal graph analysis.

| UCA ID  | Type              | Description                                                      | Hazard |
|---------|-------------------|------------------------------------------------------------------|--------|
| UCA-1.1 | Provided          | Munin recommends an incorrect playbook (wrong scenario match)     | H1     |
| UCA-1.2 | Provided          | Munin recommends a playbook with excessive confidence (false certainty) | H1 |
| UCA-1.3 | Not Provided      | Munin fails to recommend a playbook when a known scenario is detected | H2, H3 |
| UCA-1.4 | Too Late          | Munin recommends the correct playbook after the intervention window has closed | H2 |
| UCA-1.5 | Too Early         | Munin recommends a playbook based on transient data before the situation has stabilised | H1 |
| UCA-1.6 | Wrong Duration    | Munin continues to recommend a playbook after the triggering condition has resolved | H3 |
| UCA-1.7 | Provided          | Munin recommends a playbook that conflicts with a simultaneously active playbook | H5 |

### 7.2 Action Type: Display Cascade Visualisation

Munin displays cascade failure propagation paths to operators.

| UCA ID  | Type              | Description                                                      | Hazard |
|---------|-------------------|------------------------------------------------------------------|--------|
| UCA-2.1 | Provided          | Munin displays a cascade path that does not reflect the actual causal chain | H1, H5 |
| UCA-2.2 | Not Provided      | Munin fails to display a cascade path when one is developing      | H2     |
| UCA-2.3 | Too Late          | Munin displays a cascade path after the cascade has already progressed beyond the displayed state | H2 |
| UCA-2.4 | Provided          | Munin displays a cascade path with incorrect asset identifiers    | H1     |
| UCA-2.5 | Provided          | Munin displays a cascade path based on stale sensor data          | H1, H7 |

### 7.3 Action Type: Present Evidence

Munin presents supporting evidence for its analysis to operators.

| UCA ID  | Type              | Description                                                      | Hazard |
|---------|-------------------|------------------------------------------------------------------|--------|
| UCA-3.1 | Provided          | Munin presents fabricated or erroneous evidence (sensor data mismatch) | H1 |
| UCA-3.2 | Not Provided      | Munin fails to present contradictory evidence alongside a recommendation | H1, H5 |
| UCA-3.3 | Provided          | Munin presents evidence from a compromised or unhealthy sensor without flagging | H7 |
| UCA-3.4 | Too Late          | Munin presents evidence after the operator has already made a decision based on incomplete information | H2 |
| UCA-3.5 | Provided          | Munin presents evidence in a format that is ambiguous or misinterpretable | H1, H5 |

---

## 8. Causal Scenarios

### 8.1 Causal Scenarios for UCA-1.1 (Incorrect Playbook Recommendation)

| Scenario ID | Causal Factor                                            | Safety Constraint Violated | Countermeasure |
|-------------|----------------------------------------------------------|----------------------------|----------------|
| CS-1.1.1    | Causal graph engine matches wrong pattern due to insufficient training data for the specific infrastructure domain | SC-1 | Domain-specific golden fixture tests (`engine/tests/test_golden_fixtures.py`); mandatory domain validation before deployment |
| CS-1.1.2    | Sensor data is spoofed or manipulated by attacker, causing graph to reflect false state | SC-7 | Sensor health filtering (`engine/sensor_health.py`); physics-based verification (`engine/physical_truth.py`) |
| CS-1.1.3    | Playbook database contains an error in the recommended procedure | SC-1 | Playbook review process; playbook version control; constitutional constraints (`playbooks/constraints/constitution.yaml`) |
| CS-1.1.4    | Race condition in concurrent graph updates produces inconsistent state | SC-1 | Determinism tests (`engine/tests/test_determinism_properties.py`); serialised graph evaluation |

### 8.2 Causal Scenarios for UCA-1.3 (Missed Playbook Recommendation)

| Scenario ID | Causal Factor                                            | Safety Constraint Violated | Countermeasure |
|-------------|----------------------------------------------------------|----------------------------|----------------|
| CS-1.3.1    | Data diode throughput exceeded, causing data loss at ingestion | SC-2, SC-4 | Ingestion backpressure monitoring (`engine/data_ingestion_status.py`); throughput alerting |
| CS-1.3.2    | Sensor health filter incorrectly marks healthy sensor as FAILED, excluding valid data | SC-7 | Property-based tests for sensor health classification; conservative degradation thresholds |
| CS-1.3.3    | Logic-Lock rule incorrectly suppresses a valid recommendation | SC-1 | Logic-Lock audit trail (`engine/logic_lock.py`); override mechanism with quorum approval |
| CS-1.3.4    | Analysis engine crash or hang during high-load period    | SC-2, SC-4 | Health checks (`app/api/health/`); watchdog restart; N-version programming (`engine/n_version_programming.py`) |

### 8.3 Causal Scenarios for UCA-1.4 (Late Playbook Recommendation)

| Scenario ID | Causal Factor                                            | Safety Constraint Violated | Countermeasure |
|-------------|----------------------------------------------------------|----------------------------|----------------|
| CS-1.4.1    | Analysis engine performance degradation under sustained high-throughput ingestion | SC-2 | Performance benchmarking (`engine/benchmark_performance.py`); performance budget (`docs/PERFORMANCE_BUDGET.md`) |
| CS-1.4.2    | Network latency between analysis zone and operator console exceeds acceptable bounds | SC-2 | SSE-based real-time delivery; latency monitoring |
| CS-1.4.3    | Quorum approval process introduces delay for time-critical recommendations | SC-2 | Fast-path for advisory outputs (quorum required only for configuration changes, not for displaying recommendations) |

### 8.4 Causal Scenarios for UCA-2.1 (Incorrect Cascade Display)

| Scenario ID | Causal Factor                                            | Safety Constraint Violated | Countermeasure |
|-------------|----------------------------------------------------------|----------------------------|----------------|
| CS-2.1.1    | Graph inference produces incorrect causal edges due to confounding variables | SC-1 | Counterfactual analysis (`engine/counterfactual.py`); confidence thresholds on edges |
| CS-2.1.2    | Cascade visualisation renders stale graph state while new data is being processed | SC-5 | Timestamp-based staleness detection; visual "data age" indicator in UI |
| CS-2.1.3    | Asset registry contains incorrect topology information   | SC-5 | Asset registry validation; cross-reference with physical verification |

### 8.5 Causal Scenarios for UCA-3.3 (Unhealthy Sensor Evidence)

| Scenario ID | Causal Factor                                            | Safety Constraint Violated | Countermeasure |
|-------------|----------------------------------------------------------|----------------------------|----------------|
| CS-3.3.1    | Sensor health classification lags behind actual sensor degradation | SC-7 | Reduced health check intervals during incidents; predictive degradation detection |
| CS-3.3.2    | Attacker slowly drifts sensor readings to avoid detection thresholds | SC-7 | Long-horizon trend analysis; physics-based cross-validation (`engine/physical_truth.py`) |
| CS-3.3.3    | Sensor health module itself is compromised or contains a bug | SC-7 | N-version programming (`engine/n_version_programming.py`); independent sensor health verification |

---

## 9. Safety Constraints Mapped to Implementation

| Constraint | Implementation Artefact                        | Verification Method                              |
|------------|------------------------------------------------|--------------------------------------------------|
| SC-1       | `engine/logic_lock.py` --- rule: `REQUIRE_CONFIDENCE_DISPLAY` | Logic-Lock rule tests; UI integration tests     |
| SC-1       | `playbooks/constraints/constitution.yaml` --- rule: `advisory_only` | Constitutional constraint validation suite       |
| SC-2       | `engine/benchmark_performance.py` --- latency budget: 30s end-to-end | Performance regression tests in CI              |
| SC-3       | `engine/infer_graph.py` --- confidence threshold filtering | Golden fixture false-positive rate measurement   |
| SC-4       | `app/api/health/liveness/route.ts`, `app/api/health/readiness/route.ts` | Health check monitoring; availability SLA tests |
| SC-5       | `engine/consistency_checks.py` --- contradiction detection | Property-based tests for contradiction flagging  |
| SC-6       | `lib/merkle.ts`, `lib/audit/auditLogVerification.ts` | Merkle chain integrity tests (`lib/__tests__/merkle.test.ts`) |
| SC-7       | `engine/sensor_health.py` --- health classification pipeline | Sensor health property-based tests               |

---

## 10. STPA Results Summary

### 10.1 Statistics

| Category                          | Count |
|-----------------------------------|-------|
| Losses identified                 | 6     |
| Hazards identified                | 7     |
| Safety constraints defined        | 7     |
| Unsafe control actions identified | 17    |
| Causal scenarios analysed         | 16    |

### 10.2 Key Findings

1. **H1 (Misleading recommendation)** is the most frequently implicated
   hazard, appearing in 9 of 17 UCAs. This confirms the critical importance
   of graph accuracy bounds (Safety Case claim C2) and sensor health
   filtering (Safety Case claim C6).

2. **H2 (Delayed recommendation)** is the second most common hazard.
   Performance budgets and real-time delivery mechanisms are essential
   safety controls.

3. **H3 (Distrust-driven ignoring)** is a human factors hazard that cannot
   be fully mitigated by technical controls. Operator training, false positive
   rate management, and trust calibration are required.

4. **H7 (Compromised sensor data)** is a cross-cutting concern that amplifies
   multiple other hazards. Defence-in-depth through sensor health monitoring,
   physics-based verification, and cross-sensor consistency checking is
   essential.

### 10.3 Recommendations

1. Implement a dedicated "confidence dashboard" showing real-time system
   self-assessment metrics to operators.
2. Establish a formal playbook review process with domain-expert sign-off.
3. Conduct regular STPA reviews (quarterly) as the system evolves.
4. Develop operator training specifically addressing automation bias and
   trust calibration.

---

## 11. Document Cross-References

| Document                  | ID     | Relationship                                     |
|---------------------------|--------|--------------------------------------------------|
| Safety Case               | SC-001 | Consumes hazard analysis results from this document |
| Threat Model              | TM-001 | Provides adversarial scenarios feeding causal analysis |
| IEC 62443 Mapping         | IC-001 | Maps safety constraints to IEC 62443 requirements |
| Hazard Log                | HL-001 | Records all hazards from this analysis            |
| Engine Failure Modes      | ---    | `docs/ENGINE_FAILURE_MODES.md` provides failure mode catalogue |

---

**END OF DOCUMENT SA-001**

**Classification: OFFICIAL-SENSITIVE**
