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

## 9. STRIDE Analysis

This section applies the STRIDE framework to the Munin architecture,
enumerating threats by category and mapping each to architectural mitigations
already present in the system design.

### 9.1 Spoofing

| Threat | Description | Mitigation |
|--------|-------------|------------|
| S-1: Ministry signature forgery | An adversary forges a ministry-level approval signature to authorise an illegitimate configuration change or policy override. | All ministry actions require Ed25519 digital signatures verified against a pre-enrolled public key set. Configuration changes further require M-of-N quorum approval (`engine/byzantine_resilience.py`), ensuring no single compromised key can authorise action. |
| S-2: Sensor identity spoofing | An adversary injects fabricated sensor data into the ingestion pipeline by impersonating a legitimate field device. | The hardware data diode (`engine/data_diode.py`) constrains the ingestion path to a single physically authenticated fibre link. Sensor frames are validated against registered device identifiers and checksums at the diode boundary. No arbitrary network source can reach the ingestion interface. |
| S-3: Operator impersonation | An adversary assumes the identity of a legitimate operator to access the Munin console and influence situational awareness. | Operator authentication uses Argon2id password hashing (`lib/auth/`) with per-session tokens (`lib/auth/sessions.ts`). Role-based access control (`lib/auth/rbac.ts`) limits each authenticated session to the minimum privilege set required. Session tokens are bound to origin and expire on a policy-defined schedule. |

### 9.2 Tampering

| Threat | Description | Mitigation |
|--------|-------------|------------|
| T-1: Packet modification in transit | An adversary modifies data packets between the diode interface and the analysis engine to alter sensor readings or metadata. | All ingested data frames are incorporated into a Merkle hash chain (`lib/merkle.ts`) at the point of ingestion. Any subsequent modification invalidates the chain and is detected by the independent verification module (`lib/audit/auditLogVerification.ts`). |
| T-2: Engine logic manipulation | An adversary modifies the inference engine, Logic-Lock constraints, or playbook definitions to bias analysis outputs. | The analysis engine operates within an air-gapped zone with no inbound network management path. Code changes require two-person review and Byzantine quorum approval. CI safety tests and property-based tests verify engine invariants before deployment. |
| T-3: Evidence alteration | An adversary retroactively modifies audit log entries to conceal malicious activity or fabricate a false operational history. | The audit log is append-only, with each entry cryptographically chained via Merkle tree construction (`lib/merkle.ts`) and signed with Ed25519 keys stored in HSM (`lib/audit/keyManagement.ts`). Any modification to a historical entry breaks the chain, and gap detection identifies missing entries. |

### 9.3 Repudiation

| Threat | Description | Mitigation |
|--------|-------------|------------|
| R-1: Ministry denial of authorisation | A ministry authority denies having authorised a configuration change or policy override after the fact. | All quorum-protected actions record the full set of Ed25519 signatures, timestamps, and action descriptions in the immutable audit chain. The Merkle chain provides tamper-evident proof that the signatures were present at the recorded time. |
| R-2: Operator denial of action | An operator denies having acknowledged, dismissed, or acted upon a recommendation displayed by the Munin console. | All UI interactions with recommendations, alerts, and advisory outputs are logged with operator identity, timestamp, and action type. Interaction logs are incorporated into the Merkle-chained audit trail and signed. |
| R-3: Collector denial of data submission | A data collection point denies having submitted a particular sensor reading or telemetry frame. | All data frames received through the diode interface carry source-signed metadata. Frame signatures, sequence numbers, and timestamps are recorded at ingestion and incorporated into the provenance tracking system (`engine/provenance_tracker.py`). |

### 9.4 Information Disclosure

| Threat | Description | Mitigation |
|--------|-------------|------------|
| I-1: Infrastructure dependency map exposure | An adversary obtains Munin's causal graph outputs, revealing dependency relationships between critical infrastructure components. | Munin operates in an air-gapped zone with no outbound network connectivity. No cloud services, telemetry endpoints, or external APIs are reachable from the deployment environment. CSP headers (`middleware.ts`) enforce `connect-src 'self'`. Physical exfiltration controls (USB port disable, physical access logging) further constrain data removal. |
| I-2: Sensor telemetry disclosure | An adversary extracts raw SCADA telemetry data ingested by Munin, revealing operational parameters of the underlying infrastructure. | The Munin zone maintains no outbound network path. Telemetry data resides in runtime memory and temporary storage within the air-gapped zone. RBAC (`lib/auth/rbac.ts`) restricts data access by role, and all data access events are audit-logged. |
| I-3: Packet content exposure across jurisdictions | In multi-site deployments, an adversary gains access to packet data from a jurisdiction outside their authorisation. | Jurisdiction isolation is enforced at the deployment architecture level: each jurisdiction operates an independent Munin instance with no cross-instance data sharing. All data at rest is encrypted. Packet type definitions (`lib/packet/types.ts`) carry jurisdiction metadata for access control enforcement. |

### 9.5 Denial of Service

| Threat | Description | Mitigation |
|--------|-------------|------------|
| D-1: Simulation overload | An adversary or fault condition triggers computationally expensive graph inference operations that exhaust system resources, rendering Munin unresponsive during a critical event. | Resource caps are enforced on inference execution. Backpressure management (`engine/data_ingestion_status.py`) throttles ingestion when processing capacity is saturated. N-version programming (`engine/n_version_programming.py`) provides fallback inference paths. Health monitoring (`app/api/health/`) detects resource exhaustion and triggers alerting. |
| D-2: Sensor data flood | An adversary or malfunctioning device generates high-volume data through the diode interface, overwhelming the ingestion pipeline. | Rate limiting is enforced at the diode ingestion boundary (`engine/data_diode.py`). Backpressure management drops excess frames with audit logging. The hardware diode's fixed bandwidth provides an inherent upper bound on ingestion rate. |
| D-3: Key ceremony disruption | An adversary disrupts the key generation or rotation ceremony, preventing the system from maintaining cryptographic operations. | Signing keys are generated offline in a physically secured environment. Shamir secret sharing provides backup key recovery without single-point-of-failure risk. Key rotation procedures are documented in the operations runbook (`docs/OPERATIONS_RUNBOOK.md`) with contingency procedures for ceremony interruption. |

### 9.6 Elevation of Privilege

| Threat | Description | Mitigation |
|--------|-------------|------------|
| E-1: Role impersonation | An adversary with low-privilege access escalates to a higher role (e.g., Analyst to Administrator) to perform unauthorised actions. | RBAC (`lib/auth/rbac.ts`) enforces role separation with distinct session tokens per role. Role assignment requires quorum approval. Session tokens encode role claims and are validated at every API boundary (`middleware.ts`). |
| E-2: Read-only mode escape | An adversary attempts to enable write capabilities in the analysis engine, circumventing the advisory-only design constraint. | The `WRITE_ACCESS_ENABLED` flag is permanently set to `false` and enforced by the safety guard (`engine/safety_guard.py`). Static analysis in the CI pipeline verifies that no code path can set this flag to `true`. The packet type system (`lib/packet/types.ts`) prevents construction of command-type packets at the type level. |
| E-3: Collector-to-enclave escalation | An adversary who has compromised a data collection point at Level 3 attempts to use the diode link to gain execution capability within the Munin analysis zone. | The hardware data diode provides a physically unidirectional link with no return path. The diode software interface (`engine/data_diode.py`) treats all received data as untrusted input, applying strict parsing, validation, and sandboxed processing. No control channel, shell protocol, or remote execution interface exists on the diode link. |

---

## 10. Extended Attacker Profiles

This section expands upon the attacker profiles defined in Section 3 with
detailed capability assessments, strategic objectives, and comprehensive
mitigation strategies for each adversary class.

### 10.1 Nation-State Advanced Persistent Threat (APT)

**Capabilities**:

- Dedicated offensive cyber units with multi-year operational timelines and
  substantial state funding.
- Zero-day vulnerability stockpiles across operating systems, embedded firmware,
  and application-layer software.
- Custom implant development with anti-forensics capabilities, including
  firmware-level persistence and fileless malware.
- Human intelligence (HUMINT) operations for insider recruitment, social
  engineering, and physical interdiction of hardware supply chains.
- Signals intelligence (SIGINT) capabilities including passive network
  monitoring and side-channel analysis.
- Capability to conduct coordinated multi-domain operations combining cyber,
  physical, and information warfare.

**Strategic Goals**:

1. **Pre-positioning**: Establish persistent access to critical infrastructure
   monitoring systems for activation during geopolitical escalation.
2. **Intelligence collection**: Exfiltrate infrastructure dependency maps,
   operational patterns, and vulnerability assessments to inform kinetic or
   cyber targeting.
3. **Confidence degradation**: Undermine operator trust in Munin's
   recommendations during a coordinated attack, delaying defensive response.
4. **Attribution obfuscation**: Conduct operations through intermediary
   infrastructure and false-flag techniques to complicate attribution.

**Mitigations**:

- Air-gapped deployment eliminates remote access vectors entirely. No internet
  connectivity exists to the Munin analysis zone.
- Hardware data diode prevents lateral movement from OT networks into the
  Munin zone and eliminates any return path for command-and-control.
- Sovereign build pipeline (`engine/eurostack_sovereign.py`) with reproducible
  builds, dependency hash verification, and SBOM generation reduces supply
  chain attack surface.
- Byzantine quorum (`engine/byzantine_resilience.py`) requires compromise of
  M-of-N independent key holders, distributed across separate organisational
  units and geographic locations.
- Merkle-chained audit trail with HSM-backed signatures provides
  tamper-evident logging that survives individual node compromise.
- Physical security controls at the deployment site constrain HUMINT-enabled
  physical access operations.

### 10.2 Malicious Insider

**Capabilities**:

- Legitimate credentials with an assigned role (Operator, Analyst, or
  Administrator) within the Munin deployment.
- Physical access to the deployment zone, including the analysis servers, HSM
  hardware, and operator consoles.
- Institutional knowledge of system architecture, operational procedures, and
  security controls.
- Ability to act over extended periods, establishing patterns of legitimate
  activity before executing malicious actions.
- Potential access to documentation, source code repositories, and internal
  communications describing system limitations.

**Strategic Goals**:

1. **Sabotage**: Suppress or manipulate critical recommendations during an
   infrastructure event to delay or misdirect operator response.
2. **Data exfiltration**: Extract infrastructure telemetry, causal graph
   outputs, or vulnerability assessments for sale or transfer to external
   adversaries.
3. **Audit trail manipulation**: Conceal evidence of malicious activity by
   corrupting or suppressing audit entries.
4. **Credential theft**: Harvest credentials or key material for transfer to
   external threat actors.

**Mitigations**:

- RBAC (`lib/auth/rbac.ts`) enforces least privilege, ensuring each role
  accesses only the data and functions required for its duties.
- Byzantine quorum for critical operations prevents any single insider from
  unilaterally executing configuration changes, key rotations, or system
  shutdowns.
- Merkle-chained audit logging records all operator interactions, data access
  events, and administrative actions with cryptographic integrity guarantees
  that persist even if the insider holds an Administrator role.
- Separation of duties ensures that the individual who authors a change cannot
  be the sole approver.
- Physical exfiltration controls (USB port disable, removable media policy,
  physical access logging) constrain data removal from the air-gapped zone.
- Behavioural monitoring and periodic access reviews detect anomalous patterns
  of system usage.

### 10.3 Compromised Supply Chain

**Capabilities**:

- Ability to inject malicious code into software dependencies (Python packages,
  Node.js modules, system libraries) consumed by the Munin build pipeline.
- Ability to compromise build tools, compilers, or container base images used
  in the Munin deployment process.
- Potential for hardware-level implants in server components, HSM devices, or
  data diode hardware.
- Sophisticated obfuscation techniques that pass superficial code review,
  including typosquatting, dependency confusion, and conditional payload
  activation.
- Long dwell times: compromised components may remain dormant for months or
  years before activation.

**Strategic Goals**:

1. **Backdoor insertion**: Establish persistent access to the Munin analysis
   engine that survives software updates and security audits.
2. **Inference manipulation**: Introduce subtle biases into graph inference
   algorithms that degrade recommendation quality without triggering obvious
   anomalies.
3. **Covert exfiltration**: Embed data exfiltration routines that encode
   sensitive information into seemingly normal system outputs or timing
   patterns.
4. **Cascading compromise**: Use Munin as an entry point to compromise the
   broader operational environment (mitigated by air-gap and data diode).

**Mitigations**:

- Dependency pinning with cryptographic hash verification ensures that no
  package can be substituted or modified without detection.
- Reproducible builds enable independent verification that compiled artefacts
  correspond to audited source code.
- Sovereign build pipeline (`engine/eurostack_sovereign.py`) constructs
  deployment artefacts in a controlled, air-gapped environment.
- SBOM (Software Bill of Materials) generation provides a complete inventory
  of all software components for vulnerability tracking and provenance
  verification.
- Hardware procurement follows established supply chain security procedures
  with tamper-evident packaging and vendor attestation.
- Property-based testing and formal verification of critical engine invariants
  detect behavioural deviations introduced by compromised components.

### 10.4 Quantum Adversary (10--15 Year Horizon)

**Capabilities**:

- Access to a cryptographically relevant quantum computer (CRQC) capable of
  executing Shor's algorithm against currently deployed asymmetric
  cryptographic schemes.
- Ability to conduct "harvest now, decrypt later" operations: capturing
  encrypted data or signed artefacts today for future cryptanalysis once
  quantum capability matures.
- Potential to forge digital signatures on schemes relying on the hardness of
  integer factorisation or discrete logarithm problems (RSA, ECDSA, classical
  Diffie-Hellman).
- Timeline: Current intelligence community assessments place CRQC availability
  at 10--15 years. Munin's design horizon must account for data that remains
  sensitive beyond this window.

**Strategic Goals**:

1. **Signature forgery**: Forge Ed25519 audit log signatures to fabricate or
   repudiate historical operational records.
2. **Harvest-decrypt**: Capture encrypted-at-rest data stores or key material
   today for decryption once quantum capability is available.
3. **Quorum bypass**: Forge quorum member signatures to authorise configuration
   changes without legitimate approval.

**PQC Migration Path**:

Munin implements a cryptographic agility architecture to manage the transition
to post-quantum cryptography:

1. **Current state**: The PQC library (`lib/pqc.ts`) implements
   post-quantum key encapsulation and signature schemes alongside classical
   Ed25519. The architecture supports dual-signature (classical + PQC) for
   audit entries and quorum approvals.

2. **Phase 1 --- Hybrid mode (current)**: All new cryptographic operations
   generate both classical and PQC signatures. Verification accepts either
   scheme, enabling gradual rollout without breaking backward compatibility
   with existing audit chains.

3. **Phase 2 --- PQC-primary (planned)**: Once NIST PQC standards are
   finalised and implementations achieve sufficient maturity, the system
   transitions to PQC-primary with classical signatures retained for
   backward verification of historical records only.

4. **Phase 3 --- Classical deprecation (future)**: Classical-only signatures
   are no longer accepted for new operations. Historical audit chains retain
   their classical signatures as supplementary evidence alongside PQC
   re-signatures of archival records.

5. **Key management**: PQC key sizes and operational characteristics are
   accommodated in the HSM strategy and key ceremony procedures. The
   operations runbook (`docs/OPERATIONS_RUNBOOK.md`) includes PQC-specific
   ceremony procedures.

6. **Algorithm selection**: Munin tracks NIST PQC standardisation
   (ML-KEM, ML-DSA, SLH-DSA) and maintains the ability to substitute
   algorithms via the cryptographic agility layer without architectural
   changes.

---

## 11. Document Cross-References

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
