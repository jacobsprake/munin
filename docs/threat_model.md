# THREAT MODEL --- Munin v1

| Field              | Value                                                        |
|--------------------|--------------------------------------------------------------|
| **Classification** | OFFICIAL-SENSITIVE                                           |
| **Document ID**    | TM-001                                                       |
| **Version**        | 1.0                                                          |
| **Date**           | 2026-03-18                                                   |
| **Author**         | Munin Security Engineering                                   |
| **Approver**       | Chief Information Security Officer (pending)                 |
| **Status**         | DRAFT --- For Internal Review                                |
| **Standard**       | NIST SP 800-82 Rev 3, IEC 62443, MITRE ATT&CK for ICS      |
| **Related Docs**   | SC-001 (SAFETY_CASE.md), SA-001 (SAFETY_ANALYSIS_STPA.md), IC-001 (IEC62443_MAPPING.md), HL-001 (HAZARD_LOG.md) |

---

## 1. Purpose

This document presents the threat model for Munin v1, aligned with NIST SP
800-82 Rev 3 (Guide to Operational Technology Security). It defines the system
boundary, trust zones, attacker profiles, asset inventory, and attack trees
for the top threats to the Munin deployment.

The threat model is specific to Munin's role as a read-only situational
awareness platform deployed in critical national infrastructure environments.

---

## 2. System Boundary and Trust Zones

### 2.1 Purdue Model Placement

Munin operates at **Purdue Level 3.5**, a logically defined zone between the
Site Operations network (Level 3) and the Enterprise network (Level 4). This
placement is deliberate:

- **Below Level 4**: Munin does not participate in enterprise IT workflows,
  email, or internet-connected services.
- **Above Level 3**: Munin does not directly interact with SCADA servers, HMIs,
  or control system networks.
- **Level 3.5**: Munin receives read-only data from Level 3 via a hardware
  data diode and presents advisory outputs to operators at Level 3/4.

### 2.2 Trust Zone Architecture

```
+===================================================================+
|  ZONE 5: EXTERNAL / INTERNET (UNTRUSTED)                          |
|  - No connectivity to Munin                                       |
|  - Air-gapped by design                                           |
+===================================================================+
                              |
                    [AIR GAP - No connection]
                              |
+===================================================================+
|  ZONE 4: ENTERPRISE NETWORK (LOW TRUST)                           |
|  - Enterprise IT systems                                          |
|  - No direct connectivity to Munin analysis zone                  |
+===================================================================+
                              |
                    [Firewall / Network segmentation]
                              |
+===================================================================+
|  ZONE 3.5: MUNIN ANALYSIS ZONE (MEDIUM TRUST)                    |
|  - Munin analysis engine                                         |
|  - Munin operator console                                        |
|  - Audit log storage                                             |
|  - Key management (HSM)                                          |
|  Assets: engine/*, lib/*, app/*, components/*                    |
|  Ref: middleware.ts (CSP enforcement)                            |
+===================================================================+
                              |
                    [HARDWARE DATA DIODE - Unidirectional]
                    [Ref: engine/data_diode.py]
                              |
+===================================================================+
|  ZONE 3: SITE OPERATIONS (HIGH TRUST)                            |
|  - Historian servers                                             |
|  - Engineering workstations                                      |
|  - Data export interfaces                                        |
+===================================================================+
                              |
                    [Industrial firewall]
                              |
+===================================================================+
|  ZONE 2: SUPERVISORY CONTROL (HIGHEST TRUST)                     |
|  - SCADA servers                                                 |
|  - HMI workstations                                              |
|  - Safety instrumented systems                                   |
+===================================================================+
                              |
+===================================================================+
|  ZONE 1/0: FIELD DEVICES / PHYSICAL PROCESS                      |
|  - PLCs, RTUs, sensors, actuators                                |
|  - Physical infrastructure                                       |
+===================================================================+
```

### 2.3 Data-Diode Guarantee

The hardware data diode between Zone 3 and Zone 3.5 provides a **physically
enforced unidirectional data flow**. Key properties:

- **Physical guarantee**: The diode uses optical isolation (transmit-only fibre
  on the source side, receive-only fibre on the destination side). No
  electrical or optical return path exists.
- **Software discipline**: `engine/data_diode.py` implements the software
  protocol for receiving diode data. It validates framing, checksums, and
  sequence numbers but has no capability to transmit.
- **Certification**: The hardware diode shall be certified to EAL4+ or NCSC
  CPA Foundation Grade.
- **Test evidence**: Integration tests verify that no code path in the Munin
  codebase can invoke any transmit function on the diode interface.

**Implication**: Munin v1 cannot directly cause harm to operational technology
systems because there is no physical path for control commands to reach
Levels 0-2 from the Munin analysis zone.

---

## 3. Attacker Profiles

| Profile ID | Name                    | Capability    | Motivation              | Access Vector                    | MITRE ATT&CK Alignment |
|------------|-------------------------|---------------|-------------------------|----------------------------------|-------------------------|
| AP1        | Nation-State Actor      | Very High     | Espionage, sabotage, pre-positioning for conflict | Supply chain, insider recruitment, zero-day exploitation | APT groups (e.g., Sandworm, Volt Typhoon) |
| AP2        | Malicious Insider       | High          | Financial gain, ideological motivation, coercion | Legitimate access credentials, physical access | T0859 (Valid Accounts) |
| AP3        | Ransomware Operator     | Medium-High   | Financial extortion      | Phishing, vulnerability exploitation, initial access brokers | FIN groups |
| AP4        | Supply Chain Compromise | High          | Varies (nation-state proxy, criminal) | Compromised dependencies, build pipeline injection, hardware implant | SolarWinds-class attacks |

### 3.1 AP1 --- Nation-State Actor

**Capability**: Dedicated teams with multi-year operational timelines.
Resources include zero-day vulnerability stockpiles, custom implant
development, HUMINT for insider recruitment, and hardware interdiction
capability.

**Relevant TTPs** (MITRE ATT&CK for ICS):
- T0817: Drive-by Compromise
- T0862: Supply Chain Compromise
- T0859: Valid Accounts
- T0831: Manipulation of Control
- T0882: Theft of Operational Information

**Munin-specific concern**: A nation-state actor could target Munin to:
1. Gain intelligence on infrastructure operational patterns.
2. Manipulate Munin's analysis to provide misleading recommendations during
   a coordinated attack on the underlying infrastructure.
3. Use Munin as a pivot point (mitigated by air-gap and data diode).

### 3.2 AP2 --- Malicious Insider

**Capability**: Legitimate access to the Munin system. May hold Operator,
Analyst, or Administrator role. Physical access to the deployment zone.

**Relevant TTPs**:
- T0859: Valid Accounts
- T0826: Loss of Availability
- Direct manipulation of configuration, logs, or data

**Munin-specific concern**: An insider could:
1. Suppress critical recommendations by manipulating Logic-Lock rules.
2. Corrupt the audit trail to conceal actions.
3. Exfiltrate infrastructure telemetry data.

**Mitigations**: Byzantine quorum (`engine/byzantine_resilience.py`), RBAC
(`lib/auth/rbac.ts`), Merkle chain audit (`lib/merkle.ts`), separation of
duties.

### 3.3 AP3 --- Ransomware Operator

**Capability**: Established criminal organisation with access to initial
access brokers, commodity malware, and RaaS platforms.

**Munin-specific concern**: Ransomware targeting Munin could:
1. Encrypt the analysis engine, denying situational awareness during a crisis.
2. Threaten to publish exfiltrated infrastructure data.

**Mitigations**: Air-gap prevents external access; backup procedures in
operations runbook (`docs/OPERATIONS_RUNBOOK.md`); encrypted-at-rest storage.

### 3.4 AP4 --- Supply Chain Compromise

**Capability**: Compromise of a dependency, build tool, or hardware component
used by Munin.

**Munin-specific concern**: A compromised dependency could:
1. Introduce a backdoor into the analysis engine.
2. Exfiltrate data through covert channels.
3. Manipulate graph inference to produce biased results.

**Mitigations**: Dependency pinning with hash verification; SBOM generation;
reproducible builds; sovereign build pipeline
(`engine/eurostack_sovereign.py`); air-gap prevents exfiltration.

---

## 4. Asset Inventory

Assets are categorised per NIST SP 800-82 Rev 3 asset categories.

| Asset ID | Category              | Description                                    | Confidentiality | Integrity | Availability | Location                     |
|----------|-----------------------|------------------------------------------------|-----------------|-----------|--------------|------------------------------|
| A1       | Software              | Causal graph inference engine                   | Medium          | Critical  | High         | `engine/infer_graph.py`      |
| A2       | Software              | Logic-Lock constraint engine                    | Medium          | Critical  | High         | `engine/logic_lock.py`       |
| A3       | Software              | Playbook recommendation database                | Low             | Critical  | High         | `playbooks/*.yaml`           |
| A4       | Software              | Sensor health classification module             | Medium          | Critical  | High         | `engine/sensor_health.py`    |
| A5       | Data                  | Ingested SCADA telemetry data                   | High            | Critical  | Medium       | Runtime memory / temp storage |
| A6       | Data                  | Causal graph outputs                            | High            | Critical  | High         | Runtime / packet store        |
| A7       | Data                  | Audit log (Merkle chain)                        | Medium          | Critical  | Critical     | `lib/merkle.ts`, `lib/audit/` |
| A8       | Cryptographic Material| Audit signing keys (Ed25519)                    | Critical        | Critical  | Critical     | HSM / `lib/audit/keyManagement.ts` |
| A9       | Cryptographic Material| Byzantine quorum signing keys                   | Critical        | Critical  | Critical     | HSM / `engine/byzantine_resilience.py` |
| A10      | Software              | Authentication and RBAC module                  | Medium          | Critical  | High         | `lib/auth/rbac.ts`           |
| A11      | Infrastructure        | Hardware data diode                             | N/A             | Critical  | Critical     | Physical installation         |
| A12      | Software              | Data diode software interface                   | Medium          | Critical  | High         | `engine/data_diode.py`       |
| A13      | Data                  | Operator session tokens                         | High            | High      | Medium       | `lib/auth/sessions.ts`       |
| A14      | Software              | PQC cryptographic library                       | Medium          | Critical  | Medium       | `lib/pqc.ts`                 |

---

## 5. OT/IT Segmentation and Data-Diode Guarantees

### 5.1 Network Segmentation

| Boundary                    | Enforcement Mechanism      | Evidence                          |
|-----------------------------|----------------------------|-----------------------------------|
| Internet to Enterprise      | Air gap (no connection)    | Network architecture audit        |
| Enterprise to Munin Zone    | Firewall (deny-all default)| Firewall rule review              |
| OT Network to Munin Zone    | Hardware data diode        | `engine/data_diode.py`, diode cert |
| Munin Zone internal         | CSP headers, RBAC          | `middleware.ts`, `lib/auth/rbac.ts` |

### 5.2 Why Munin v1 Cannot Directly Cause Harm

Munin v1 is architecturally incapable of directly causing harm to physical
infrastructure for the following reasons:

1. **No write path**: The hardware data diode physically prevents any data
   from flowing from Munin to the OT network. There is no electrical or
   optical return path.

2. **No SCADA write capability**: The Munin codebase contains no SCADA write
   protocol implementations (no Modbus write, no DNP3 control, no IEC 61850
   command, no OPC UA write). The `WRITE_ACCESS_ENABLED` flag is permanently
   set to `false` with safety guard enforcement (`engine/safety_guard.py`).

3. **Advisory-only outputs**: All Munin outputs are typed as advisory in the
   packet type system (`lib/packet/types.ts`). The type system prevents
   creation of command-type packets.

4. **Air-gapped deployment**: The Munin analysis zone has no outbound network
   connectivity. CSP headers (`middleware.ts`) enforce `connect-src 'self'`
   at the browser level.

5. **Human-in-the-loop**: Operators retain full decision authority. Munin
   recommendations require explicit human acknowledgement and are never
   auto-executed.

---

## 6. Attack Trees

### 6.1 Attack Tree 1: Manipulate Munin Recommendations (AT-1)

```
[GOAL] Cause Munin to issue misleading recommendation
    |
    +-- [OR] Manipulate input data
    |   |
    |   +-- [AND] Compromise sensor at Level 0/1
    |   |   +-- Physical access to field device
    |   |   +-- Reprogram sensor firmware
    |   |   +-- [COUNTERMEASURE] Sensor health filtering (engine/sensor_health.py)
    |   |   +-- [COUNTERMEASURE] Physics-based verification (engine/physical_truth.py)
    |   |
    |   +-- [AND] Compromise historian at Level 3
    |   |   +-- Exploit historian vulnerability
    |   |   +-- Modify data before diode transmission
    |   |   +-- [COUNTERMEASURE] Cross-sensor consistency (engine/consistency_checks.py)
    |   |   +-- [COUNTERMEASURE] Data provenance tracking (engine/provenance_tracker.py)
    |   |
    |   +-- [AND] Compromise data diode interface
    |       +-- Exploit data_diode.py vulnerability
    |       +-- Inject fabricated data into ingestion pipeline
    |       +-- [COUNTERMEASURE] Input validation and checksums
    |       +-- [COUNTERMEASURE] Diode health monitoring
    |
    +-- [OR] Manipulate analysis engine
    |   |
    |   +-- [AND] Supply chain compromise of engine dependency
    |   |   +-- Compromise Python package
    |   |   +-- Introduce bias into graph inference
    |   |   +-- [COUNTERMEASURE] Dependency pinning, hash verification
    |   |   +-- [COUNTERMEASURE] Reproducible builds
    |   |
    |   +-- [AND] Insider modifies engine logic
    |   |   +-- Obtain commit access
    |   |   +-- Modify infer_graph.py or logic_lock.py
    |   |   +-- [COUNTERMEASURE] Two-person review, CI safety tests
    |   |   +-- [COUNTERMEASURE] Byzantine quorum for config changes
    |   |
    |   +-- [AND] Exploit Logic-Lock to suppress constraints
    |       +-- Craft input that triggers false positive in Logic-Lock
    |       +-- Valid recommendation suppressed
    |       +-- [COUNTERMEASURE] Logic-Lock audit trail
    |       +-- [COUNTERMEASURE] Logic-Lock property-based tests
    |
    +-- [OR] Manipulate presentation layer
        |
        +-- [AND] XSS in operator console
        |   +-- Inject malicious payload via sensor metadata
        |   +-- Alter displayed recommendation in browser
        |   +-- [COUNTERMEASURE] CSP headers (middleware.ts)
        |   +-- [COUNTERMEASURE] Input sanitisation at API boundary
        |
        +-- [AND] Insider modifies UI components
            +-- Modify React components to alter display logic
            +-- [COUNTERMEASURE] Code review, CI tests
            +-- [COUNTERMEASURE] UI integration test suite
```

### 6.2 Attack Tree 2: Deny Munin Availability During Crisis (AT-2)

```
[GOAL] Make Munin unavailable when operators need it most
    |
    +-- [OR] Resource exhaustion
    |   +-- Flood data diode with high-volume data
    |   +-- [COUNTERMEASURE] Backpressure management (engine/data_ingestion_status.py)
    |   +-- [COUNTERMEASURE] Rate limiting at ingestion boundary
    |
    +-- [OR] Software crash
    |   +-- Craft malformed data that triggers unhandled exception
    |   +-- [COUNTERMEASURE] Defensive input parsing (engine/ingest.py)
    |   +-- [COUNTERMEASURE] Watchdog restart via health checks
    |   +-- [COUNTERMEASURE] N-version programming (engine/n_version_programming.py)
    |
    +-- [OR] Physical attack on Munin hardware
    |   +-- Destroy or disable server hardware
    |   +-- [COUNTERMEASURE] Physical security controls
    |   +-- [COUNTERMEASURE] Redundant deployment (hot standby)
    |
    +-- [OR] Insider disables system
        +-- Use admin privileges to shut down services
        +-- [COUNTERMEASURE] Quorum required for shutdown
        +-- [COUNTERMEASURE] Audit logging of all admin actions
```

### 6.3 Attack Tree 3: Corrupt Audit Trail (AT-3)

```
[GOAL] Tamper with Munin audit trail to conceal actions
    |
    +-- [OR] Modify historical audit entries
    |   +-- Gain write access to audit storage
    |   +-- Alter entry content
    |   +-- [COUNTERMEASURE] Merkle chain detects tampering (lib/merkle.ts)
    |   +-- [COUNTERMEASURE] Independent verification (lib/audit/auditLogVerification.ts)
    |
    +-- [OR] Forge new audit entries
    |   +-- Compromise Ed25519 signing key
    |   +-- Create entries with valid signatures
    |   +-- [COUNTERMEASURE] HSM-backed key storage (lib/audit/keyManagement.ts)
    |   +-- [COUNTERMEASURE] Key rotation policy
    |
    +-- [OR] Suppress audit entries
    |   +-- Modify audit logging code to skip certain events
    |   +-- [COUNTERMEASURE] CI tests verify audit coverage
    |   +-- [COUNTERMEASURE] Gap detection in verification module
    |
    +-- [OR] Destroy audit storage
        +-- Delete or encrypt audit database
        +-- [COUNTERMEASURE] Replicated storage with integrity checks
        +-- [COUNTERMEASURE] Offline backup with periodic verification
```

### 6.4 Attack Tree 4: Exfiltrate Infrastructure Data (AT-4)

```
[GOAL] Extract SCADA telemetry data from Munin
    |
    +-- [OR] Network exfiltration
    |   +-- Establish outbound connection from Munin zone
    |   +-- [COUNTERMEASURE] Air gap (no outbound connectivity)
    |   +-- [COUNTERMEASURE] CSP connect-src 'self' (middleware.ts)
    |
    +-- [OR] Physical exfiltration
    |   +-- Copy data to removable media
    |   +-- [COUNTERMEASURE] USB port disable policy
    |   +-- [COUNTERMEASURE] Physical access controls and logging
    |
    +-- [OR] Insider exfiltration
    |   +-- Authorised user copies data during normal operations
    |   +-- [COUNTERMEASURE] RBAC limits data access (lib/auth/rbac.ts)
    |   +-- [COUNTERMEASURE] Audit logging of all data access events
    |
    +-- [OR] Covert channel via data diode
        +-- Modulate diode traffic timing to encode data
        +-- [COUNTERMEASURE] Diode is physically unidirectional (no return path)
        +-- [COUNTERMEASURE] Fixed-rate padding on diode link
```

### 6.5 Attack Tree 5: Bypass Byzantine Quorum (AT-5)

```
[GOAL] Execute quorum-protected action without proper authorisation
    |
    +-- [OR] Compromise M quorum keys
    |   +-- Steal M-of-N HSM-backed keys
    |   +-- [COUNTERMEASURE] HSM physical security
    |   +-- [COUNTERMEASURE] Geographic distribution of key holders
    |
    +-- [OR] Exploit quorum verification bug
    |   +-- Find logic error in byzantine_resilience.py
    |   +-- Craft input that bypasses signature verification
    |   +-- [COUNTERMEASURE] Property-based tests for quorum logic
    |   +-- [COUNTERMEASURE] Formal verification of quorum arithmetic
    |
    +-- [OR] Social engineering of quorum members
    |   +-- Convince M members to approve malicious change
    |   +-- [COUNTERMEASURE] Quorum members from independent organisational units
    |   +-- [COUNTERMEASURE] Change description displayed at signing time
    |
    +-- [OR] Replay attack on quorum signatures
        +-- Capture valid signatures and replay for different action
        +-- [COUNTERMEASURE] Nonce binding in signature payload
        +-- [COUNTERMEASURE] Timestamp validation window
```

---

## 7. NIST SP 800-82 Rev 3 Control Family Mapping

| Control Family           | Control ID  | Description                                     | Munin Implementation                              | Status      |
|--------------------------|-------------|--------------------------------------------------|---------------------------------------------------|-------------|
| Access Control           | AC-2        | Account Management                              | `lib/auth/rbac.ts` --- role-based accounts, session management (`lib/auth/sessions.ts`) | Implemented |
| Access Control           | AC-3        | Access Enforcement                               | RBAC policy enforcement at API routes; `middleware.ts` | Implemented |
| Access Control           | AC-4        | Information Flow Enforcement                     | Hardware data diode; CSP headers; `engine/data_diode.py` | Implemented |
| Access Control           | AC-6        | Least Privilege                                  | Role-based views; granular permissions per endpoint | Implemented |
| Access Control           | AC-17       | Remote Access                                    | No remote access (air-gapped deployment)          | N/A (by design) |
| Audit & Accountability   | AU-2        | Event Logging                                    | `lib/audit/auditLog.ts`; `engine/audit_log.py`   | Implemented |
| Audit & Accountability   | AU-3        | Content of Audit Records                         | Actor, action, timestamp, evidence hash, Merkle chain position | Implemented |
| Audit & Accountability   | AU-9        | Protection of Audit Information                  | Merkle chain (`lib/merkle.ts`); Ed25519 signatures (`lib/audit/ed25519.ts`) | Implemented |
| Audit & Accountability   | AU-10       | Non-repudiation                                  | Digital signatures on audit entries; quorum decisions logged | Implemented |
| Configuration Management | CM-2        | Baseline Configuration                           | `engine/config.py`; `docker-compose.yml`; locked configurations | Implemented |
| Configuration Management | CM-3        | Configuration Change Control                     | Byzantine quorum for config changes; `engine/byzantine_resilience.py` | Implemented |
| Configuration Management | CM-7        | Least Functionality                              | Read-only mode; minimal attack surface; no unnecessary services | Implemented |
| Identification & Auth    | IA-2        | Identification and Authentication                | Argon2id password hashing; session tokens; `lib/auth/` | Implemented |
| Identification & Auth    | IA-5        | Authenticator Management                         | Key management via HSM; `lib/audit/keyManagement.ts` | Implemented |
| Incident Response        | IR-4        | Incident Handling                                | Alert routing (`lib/alerting.ts`); playbook recommendations | Implemented |
| Incident Response        | IR-5        | Incident Monitoring                              | Real-time SSE alerts; health monitoring; structured logging (`engine/structured_logging.py`) | Implemented |
| Risk Assessment          | RA-3        | Risk Assessment                                  | This document (TM-001); `docs/HAZARD_LOG.md` (HL-001) | Implemented |
| Risk Assessment          | RA-5        | Vulnerability Monitoring                         | Dependency scanning; SBOM; sovereign build pipeline | Planned     |
| System & Comms Protection| SC-7        | Boundary Protection                              | Hardware data diode; network segmentation; CSP headers | Implemented |
| System & Comms Protection| SC-8        | Transmission Confidentiality and Integrity       | TLS within Munin zone; data diode checksums       | Implemented |
| System & Comms Protection| SC-13       | Cryptographic Protection                         | Ed25519, PQC (`lib/pqc.ts`), Argon2id             | Implemented |
| System & Comms Protection| SC-28       | Protection of Information at Rest                | Encrypted-at-rest storage; audit chain encryption  | Planned     |
| System & Info Integrity  | SI-2        | Flaw Remediation                                 | CI/CD pipeline with security tests                | Implemented |
| System & Info Integrity  | SI-4        | System Monitoring                                | Health checks (`app/api/health/`); observability (`engine/observability_metrics.py`) | Implemented |
| System & Info Integrity  | SI-7        | Software, Firmware, and Information Integrity    | Hash verification; reproducible builds; provenance tracking | Implemented |
| System & Info Integrity  | SI-10       | Information Input Validation                     | Input validation at all API boundaries; `engine/ingest.py` | Implemented |
| Physical & Environmental | PE-3        | Physical Access Control                          | Deployment zone physical security (operational responsibility) | Operational |

---

## 8. Risk Register Summary

| Threat ID | Threat Description                            | Attacker | Likelihood | Impact   | Risk Level | Primary Countermeasure                     |
|-----------|-----------------------------------------------|----------|------------|----------|------------|--------------------------------------------|
| T1        | Manipulated sensor data causes misleading recommendation | AP1, AP2 | Medium | High | HIGH | Sensor health filtering, physics verification |
| T2        | Denial of service during crisis event          | AP1, AP3 | Low    | Critical | MEDIUM | N-version programming, health checks, redundancy |
| T3        | Audit trail corruption conceals attack         | AP1, AP2 | Low    | High     | MEDIUM | Merkle chain, HSM-backed signatures         |
| T4        | Supply chain compromise of engine dependency   | AP1, AP4 | Low    | Critical | MEDIUM | Dependency pinning, SBOM, sovereign builds   |
| T5        | Insider suppresses critical recommendation     | AP2      | Medium | High     | HIGH   | Byzantine quorum, separation of duties       |
| T6        | Exfiltration of infrastructure telemetry       | AP1, AP2 | Low    | High     | MEDIUM | Air gap, RBAC, audit logging                 |
| T7        | XSS via crafted sensor metadata                | AP1      | Low    | Medium   | LOW    | CSP headers, input sanitisation              |
| T8        | Quorum key compromise                          | AP1      | Very Low | Critical | LOW  | HSM, geographic distribution, key rotation   |
| T9        | PQC algorithm vulnerability discovered         | AP1      | Low    | High     | MEDIUM | Cryptographic agility (`lib/pqc.ts`)         |
| T10       | Logic-Lock false positive suppresses valid alert | ---    | Medium | High     | HIGH   | Logic-Lock audit trail, property-based tests |

---

## 9. Document Cross-References

| Document                  | ID     | Relationship                                     |
|---------------------------|--------|--------------------------------------------------|
| Safety Case               | SC-001 | Consumes threat analysis for security claims      |
| STPA Hazard Analysis      | SA-001 | Provides system-level hazard context              |
| IEC 62443 Mapping         | IC-001 | Maps controls to IEC 62443 requirements           |
| Hazard Log                | HL-001 | Records security-related hazards                  |
| Security Practices        | ---    | `docs/SECURITY_PRACTICES.md` implementation guide |
| Operations Runbook        | ---    | `docs/OPERATIONS_RUNBOOK.md` incident procedures  |

---

**END OF DOCUMENT TM-001**

**Classification: OFFICIAL-SENSITIVE**
