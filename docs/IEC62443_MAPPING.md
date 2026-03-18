# IEC 62443 ZONES AND CONDUITS MAPPING --- Munin v1

| Field              | Value                                                        |
|--------------------|--------------------------------------------------------------|
| **Classification** | OFFICIAL-SENSITIVE                                           |
| **Document ID**    | IC-001                                                       |
| **Version**        | 2.0                                                          |
| **Date**           | 2026-03-18                                                   |
| **Author**         | Munin Security Engineering                                   |
| **Approver**       | Chief Information Security Officer (pending)                 |
| **Status**         | DRAFT --- For Internal Review                                |
| **Standard**       | IEC 62443-3-2 (Security Risk Assessment), IEC 62443-3-3 (System Security Requirements) |
| **Supersedes**     | IC-001 v0.4.0-draft                                          |
| **Related Docs**   | SC-001 (SAFETY_CASE.md), SA-001 (SAFETY_ANALYSIS_STPA.md), TM-001 (THREAT_MODEL.md), HL-001 (HAZARD_LOG.md) |

---

## 1. Purpose

This document maps the Munin v1 deployment architecture to the IEC 62443
zones and conduits model. It defines the security zones, conduit
characteristics, and Foundational Requirement (FR) compliance for each zone.
This mapping supports the security risk assessment required by IEC 62443-3-2
and the system security requirements defined in IEC 62443-3-3.

This version (2.0) supersedes the earlier draft (v0.4.0) with expanded
Foundational Requirements mapping, detailed conduit risk assessment, and
cross-references to actual code artefacts.

---

## 2. Applicable IEC 62443 Parts

| Part        | Title                                                      | Applicability to Munin                         |
|-------------|------------------------------------------------------------|-------------------------------------------------|
| 62443-2-1   | Security Management System Requirements                   | Organisational policies governing Munin deployment |
| 62443-3-2   | Security Risk Assessment for System Design                 | This document (zone/conduit model, risk assessment) |
| 62443-3-3   | System Security Requirements and Security Levels           | Security level targets for each zone            |
| 62443-4-1   | Secure Product Development Lifecycle                       | Munin development practices                     |
| 62443-4-2   | Technical Security Requirements for IACS Components        | Component-level requirements for Munin modules  |

---

## 3. Zone Architecture

### 3.1 Zone Diagram

```
+=======================================================================+
|                                                                        |
|  +---------------------------+                                        |
|  |   ZONE A: SCADA ZONE      |                                        |
|  |   Security Level: SL-T 3  |                                        |
|  |                            |                                        |
|  |   - SCADA servers          |                                        |
|  |   - Historian databases    |                                        |
|  |   - HMI workstations       |                                        |
|  |   - PLCs / RTUs            |                                        |
|  |   - Safety instrumented    |                                        |
|  |     systems (SIS)          |                                        |
|  |   - Field sensors and      |                                        |
|  |     actuators              |                                        |
|  |                            |                                        |
|  |   [Managed by asset owner; |                                        |
|  |    outside Munin scope]    |                                        |
|  +-------------+-------------+                                        |
|                |                                                       |
|                | CONDUIT C1: DATA DIODE CONDUIT                        |
|                | Direction: Unidirectional (A -> B ONLY)                |
|                | Medium: Optical fibre (TX-only / RX-only)              |
|                | Protocol: Proprietary diode framing with CRC32         |
|                | Encryption: None required (physical isolation)          |
|                | Certification: EAL4+ or NCSC CPA Foundation Grade      |
|                | Ref: engine/data_diode.py                              |
|                |                                                        |
|  +-------------v-------------+                                        |
|  |   ZONE B: MUNIN ANALYSIS  |                                        |
|  |   ZONE                    |                                        |
|  |   Security Level: SL-T 2  |                                        |
|  |                            |                                        |
|  |   - Munin analysis engine  |                                        |
|  |     (engine/*)             |                                        |
|  |   - Sensor health module   |                                        |
|  |     (engine/sensor_health) |                                        |
|  |   - Logic-Lock engine      |                                        |
|  |     (engine/logic_lock.py) |                                        |
|  |   - Byzantine quorum       |                                        |
|  |     (engine/byzantine_     |                                        |
|  |      resilience.py)        |                                        |
|  |   - Audit log storage      |                                        |
|  |     (lib/audit/*)          |                                        |
|  |   - Key management (HSM)   |                                        |
|  |     (lib/audit/keyMgmt)    |                                        |
|  |   - Packet store           |                                        |
|  |                            |                                        |
|  |   [Air-gapped, no external |                                        |
|  |    network connectivity]   |                                        |
|  +-------------+-------------+                                        |
|                |                                                       |
|                | CONDUIT C2: OPERATOR INTERFACE CONDUIT                 |
|                | Direction: Bidirectional (B <-> C)                     |
|                | Medium: Dedicated Ethernet (VLAN-isolated)              |
|                | Protocol: HTTPS (TLS 1.3), SSE for real-time           |
|                | Authentication: Argon2id + session tokens               |
|                | Authorisation: RBAC (lib/auth/rbac.ts)                  |
|                | CSP: connect-src 'self' (middleware.ts)                 |
|                |                                                        |
|  +-------------v-------------+                                        |
|  |   ZONE C: OPERATOR        |                                        |
|  |   CONSOLE ZONE            |                                        |
|  |   Security Level: SL-T 1  |                                        |
|  |                            |                                        |
|  |   - Operator workstations  |                                        |
|  |   - Munin web UI           |                                        |
|  |     (app/*, components/*)  |                                        |
|  |   - Control room displays  |                                        |
|  |                            |                                        |
|  |   [Physical access control;|                                        |
|  |    control room secured]   |                                        |
|  +---------------------------+                                        |
|                                                                        |
+=======================================================================+
```

### 3.2 Zone Definitions

| Zone ID | Zone Name               | Description                                              | SL-T  | Purdue Level | Munin Responsibility |
|---------|-------------------------|----------------------------------------------------------|-------|--------------|----------------------|
| A       | SCADA Zone              | Operational technology systems including SCADA servers, historians, PLCs, RTUs, and safety systems. | SL-T 3 | 0-3 | None (asset owner managed) |
| B       | Munin Analysis Zone     | Air-gapped analysis environment containing the Munin engine, audit storage, cryptographic key management, and Byzantine quorum infrastructure. | SL-T 2 | 3.5 | Full responsibility |
| C       | Operator Console Zone   | Control room environment where operators interact with Munin via the web-based UI. Physical access controlled. | SL-T 1 | 3-4 | Shared (Munin software + asset owner physical security) |

### 3.3 Security Level Justification

**Zone A (SL-T 3)**: The SCADA zone contains safety-critical systems capable
of actuating physical infrastructure. SL-T 3 is required to protect against
intentional violation using sophisticated means with moderate resources and
IACS-specific skills. This zone is managed by the asset owner; Munin has no
influence over its security posture. The data diode conduit (C1) ensures that
any compromise of Zone B cannot propagate to Zone A.

**Zone B (SL-T 2)**: The Munin analysis zone processes sensitive infrastructure
telemetry and produces advisory recommendations. SL-T 2 is appropriate
because: (a) Munin is read-only and cannot directly affect the physical
process, (b) the zone is air-gapped with no external connectivity, and
(c) compromise of this zone could produce misleading recommendations but
cannot directly actuate infrastructure. SL-T 2 protects against intentional
violation using simple means with low resources and general skills.

**Zone C (SL-T 1)**: The operator console zone is physically secured within
the control room. SL-T 1 protects against casual or coincidental violation.
Operators retain full decision authority; the console displays advisory
information only.

---

## 4. Conduit Definitions

### 4.1 Conduit C1: Data Diode Conduit (Zone A to Zone B)

| Property              | Value                                                    |
|-----------------------|----------------------------------------------------------|
| **Conduit ID**        | C1                                                       |
| **Source Zone**        | A (SCADA Zone, SL-T 3)                                  |
| **Destination Zone**   | B (Munin Analysis Zone, SL-T 2)                         |
| **Direction**         | Unidirectional: Zone A to Zone B ONLY                    |
| **Physical Medium**   | Single-mode optical fibre with optical isolation          |
| **Protocol**          | Proprietary diode framing protocol with CRC32 checksums   |
| **Data Types**        | SCADA telemetry, historian exports, sensor readings       |
| **Max Throughput**    | Per hardware diode specification (typically 100 Mbps)     |
| **Encryption**        | Not required (physical isolation provides confidentiality) |
| **Authentication**    | Data origin tagging and sequence numbers                  |
| **Integrity**         | CRC32 checksums per frame; sequence number gap detection   |
| **Implementation**    | `engine/data_diode.py` (receive side only)                |
| **Hardware Cert**     | EAL4+ or NCSC CPA Foundation Grade                        |
| **Risk Level**        | LOW                                                       |

**Security Analysis**: The unidirectional nature of C1 is the foundational
security property of the Munin architecture. Physical unidirectionality
eliminates all return-path attack vectors, including:
- Reverse shell or command-and-control channels
- Data exfiltration from Zone B to Zone A
- Malware propagation from Zone B to Zone A
- Timing-based covert channels (mitigated by fixed-rate padding)

### 4.2 Conduit C2: Operator Interface Conduit (Zone B to Zone C)

| Property              | Value                                                    |
|-----------------------|----------------------------------------------------------|
| **Conduit ID**        | C2                                                       |
| **Source Zone**        | B (Munin Analysis Zone, SL-T 2)                         |
| **Destination Zone**   | C (Operator Console Zone, SL-T 1)                       |
| **Direction**         | Bidirectional                                             |
| **Physical Medium**   | Dedicated Ethernet, VLAN-isolated                         |
| **Protocol**          | HTTPS (TLS 1.3) for request/response; SSE for real-time  |
| **Data Types (B->C)** | Advisory recommendations, causal graphs, evidence, alerts |
| **Data Types (C->B)** | Operator acknowledgements, queries, configuration (quorum-protected) |
| **Encryption**        | TLS 1.3 with strong cipher suites                        |
| **Authentication**    | Argon2id password hashing; session tokens                 |
| **Authorisation**     | RBAC (`lib/auth/rbac.ts`)                                 |
| **CSP**               | `connect-src 'self'` (`middleware.ts`)                    |
| **Risk Level**        | MEDIUM                                                    |

**Security Analysis**: C2 is bidirectional and therefore requires active
security controls. The combination of TLS 1.3, Argon2id authentication,
RBAC authorisation, and CSP enforcement provides defence-in-depth. The
bidirectional nature is necessary for operator interaction but is constrained
to the minimum required data flows.

---

## 5. Foundational Requirements (FR) Mapping

### FR 1: Identification and Authentication Control (IAC)

| Req ID  | IEC 62443-3-3 Ref | Description                                  | Munin Implementation                              | Evidence File                     | SL Achieved | Zone |
|---------|-------------------|----------------------------------------------|---------------------------------------------------|-----------------------------------|-------------|------|
| SR 1.1  | 62443-3-3 SR 1.1  | Human user identification and authentication | Username/password with Argon2id hashing; unique identity per user | `lib/auth/rbac.ts`               | SL 2        | B, C |
| SR 1.2  | 62443-3-3 SR 1.2  | Software process identification and auth     | Service-to-service authentication via signed tokens; process identity in audit trail | `lib/auth/sessions.ts`           | SL 2        | B    |
| SR 1.3  | 62443-3-3 SR 1.3  | Account management                           | Role-based accounts (Operator, Analyst, Administrator); account lifecycle procedures | `lib/auth/rbac.ts`               | SL 2        | B, C |
| SR 1.5  | 62443-3-3 SR 1.5  | Authenticator management                     | Argon2id with configurable work factors (memory: 64MB, iterations: 3, parallelism: 4); HSM-backed key storage | `lib/audit/keyManagement.ts` | SL 2        | B    |
| SR 1.7  | 62443-3-3 SR 1.7  | Strength of password-based authentication    | Argon2id (memory-hard KDF); minimum password complexity enforced; brute-force resistance | `lib/auth/rbac.ts`            | SL 2        | B, C |
| SR 1.9  | 62443-3-3 SR 1.9  | Strength of public key authentication        | Ed25519 for audit signatures; PQC readiness via ML-KEM/ML-DSA hybrid mode | `lib/audit/ed25519.ts`, `lib/pqc.ts` | SL 2   | B    |
| SR 1.13 | 62443-3-3 SR 1.13 | Access via untrusted networks                | Not applicable --- air-gapped deployment; no untrusted network paths | Network architecture             | N/A         | ---  |

### FR 2: Use Control (UC)

| Req ID  | IEC 62443-3-3 Ref | Description                                  | Munin Implementation                              | Evidence File                     | SL Achieved | Zone |
|---------|-------------------|----------------------------------------------|---------------------------------------------------|-----------------------------------|-------------|------|
| SR 2.1  | 62443-3-3 SR 2.1  | Authorisation enforcement                    | RBAC policy enforcement at every API endpoint; role-based views restrict data visibility | `lib/auth/rbac.ts`, `middleware.ts` | SL 2   | B, C |
| SR 2.2  | 62443-3-3 SR 2.2  | Wireless use control                         | No wireless interfaces in Munin deployment; policy prohibits wireless in analysis zone | Operational policy               | SL 2        | B, C |
| SR 2.3  | 62443-3-3 SR 2.3  | Use control for portable/mobile devices      | No portable or mobile device access permitted in analysis zone | Operational policy               | SL 2        | B, C |
| SR 2.4  | 62443-3-3 SR 2.4  | Mobile code                                  | CSP prevents execution of untrusted scripts; `script-src 'self'` enforced | `middleware.ts`                  | SL 2        | C    |
| SR 2.5  | 62443-3-3 SR 2.5  | Session lock                                 | Automatic session timeout with configurable interval; lock after 15 min inactivity | `lib/auth/sessions.ts`          | SL 2        | C    |
| SR 2.6  | 62443-3-3 SR 2.6  | Remote session termination                   | Administrator can revoke any active session; immediate invalidation | `lib/auth/sessions.ts`          | SL 2        | B    |
| SR 2.8  | 62443-3-3 SR 2.8  | Auditable events                             | All authorisation decisions logged with actor, action, resource, and outcome | `lib/audit/auditLog.ts`         | SL 2        | B    |
| SR 2.9  | 62443-3-3 SR 2.9  | Audit storage capacity                       | Storage monitoring with 90% threshold alerting; archival procedures for aged entries | Operational procedures          | SL 2        | B    |
| SR 2.12 | 62443-3-3 SR 2.12 | Non-repudiation                              | Ed25519 signed audit entries; Byzantine quorum decision records with individual vote audit | `lib/audit/ed25519.ts`, `lib/audit/decisions.ts` | SL 2 | B |

### FR 3: System Integrity (SI)

| Req ID  | IEC 62443-3-3 Ref | Description                                  | Munin Implementation                              | Evidence File                     | SL Achieved | Zone |
|---------|-------------------|----------------------------------------------|---------------------------------------------------|-----------------------------------|-------------|------|
| SR 3.1  | 62443-3-3 SR 3.1  | Communication integrity                      | Merkle chain for audit log integrity; TLS 1.3 for operator interface; CRC32 on diode frames | `lib/merkle.ts`, TLS config    | SL 2        | B, C |
| SR 3.2  | 62443-3-3 SR 3.2  | Malicious code protection                    | Air-gap prevents malware ingress from external networks; dependency pinning with hash verification; container image signing | `package-lock.json`, build pipeline | SL 2 | B |
| SR 3.3  | 62443-3-3 SR 3.3  | Security functionality verification          | Health checks verify security subsystem operation; readiness probe validates crypto, auth, and audit subsystems | `app/api/health/readiness/route.ts` | SL 2 | B |
| SR 3.4  | 62443-3-3 SR 3.4  | Software and information integrity           | Merkle chain verification for audit trail; hash verification of engine outputs; provenance tracking | `lib/audit/auditLogVerification.ts`, `lib/hash.ts` | SL 2 | B |
| SR 3.5  | 62443-3-3 SR 3.5  | Input validation                             | Input validation at all API boundaries; sensor data schema validation; protocol translation with strict parsing | `engine/ingest.py`, API route validators | SL 2 | B |
| SR 3.7  | 62443-3-3 SR 3.7  | Error handling                               | Structured error responses; no sensitive data in error messages; safe defaults on failure | `lib/apiError.ts`, `engine/errors.py` | SL 2 | B, C |
| SR 3.8  | 62443-3-3 SR 3.8  | Session integrity                            | Session tokens bound to user identity; rotation on privilege change; CSRF protection | `lib/auth/sessions.ts` | SL 2 | B, C |

### FR 4: Data Confidentiality (DC)

| Req ID  | IEC 62443-3-3 Ref | Description                                  | Munin Implementation                              | Evidence File                     | SL Achieved | Zone |
|---------|-------------------|----------------------------------------------|---------------------------------------------------|-----------------------------------|-------------|------|
| SR 4.1  | 62443-3-3 SR 4.1  | Information confidentiality                  | Air-gapped deployment; no external network connectivity; CSP prevents browser-side data leakage | Network architecture, `middleware.ts` | SL 2 | B, C |
| SR 4.2  | 62443-3-3 SR 4.2  | Information persistence                       | Sensitive data not persisted beyond operational need; secure deletion procedures; encrypted-at-rest storage | Operational policy | SL 1+ | B |
| SR 4.3  | 62443-3-3 SR 4.3  | Use of cryptography                          | Ed25519 signatures; Argon2id hashing; PQC readiness via ML-KEM/ML-DSA hybrid mode; cryptographic agility layer | `lib/pqc.ts`, `lib/audit/ed25519.ts` | SL 2 | B |

### FR 5: Restricted Data Flow (RDF)

| Req ID  | IEC 62443-3-3 Ref | Description                                  | Munin Implementation                              | Evidence File                     | SL Achieved | Zone |
|---------|-------------------|----------------------------------------------|---------------------------------------------------|-----------------------------------|-------------|------|
| SR 5.1  | 62443-3-3 SR 5.1  | Network segmentation                         | Three-zone architecture: SCADA (SL3) / Analysis (SL2) / Console (SL1); hardware data diode between A and B; VLAN isolation between B and C; air gap to external | Network architecture, `engine/data_diode.py` | SL 2 | All |
| SR 5.2  | 62443-3-3 SR 5.2  | Zone boundary protection                     | Data diode enforces unidirectional flow at A-B boundary; firewall rules at B-C boundary; CSP at browser level | `engine/data_diode.py`, `middleware.ts` | SL 2 | All |
| SR 5.3  | 62443-3-3 SR 5.3  | General purpose communication restrictions   | No email, messaging, file transfer, or web browsing capabilities in Munin analysis zone | System design | SL 2 | B |
| SR 5.4  | 62443-3-3 SR 5.4  | Application partitioning                     | Engine, UI, and audit subsystems run as separate containerised processes with distinct permissions and resource limits | `docker-compose.yml` | SL 2 | B |

### FR 6: Timely Response to Events (TRE)

| Req ID  | IEC 62443-3-3 Ref | Description                                  | Munin Implementation                              | Evidence File                     | SL Achieved | Zone |
|---------|-------------------|----------------------------------------------|---------------------------------------------------|-----------------------------------|-------------|------|
| SR 6.1  | 62443-3-3 SR 6.1  | Audit log accessibility                      | Audit logs accessible to authorised Analyst and Administrator roles; searchable by timestamp, actor, and action type | `lib/audit/auditLog.ts`, `lib/auth/rbac.ts` | SL 2 | B |
| SR 6.2  | 62443-3-3 SR 6.2  | Continuous monitoring                        | Real-time SSE-based alert delivery to operator console; health check polling at configurable intervals; observability metrics | `lib/alerting.ts`, `app/api/health/`, `engine/observability_metrics.py` | SL 2 | B, C |
| SR 6.3  | 62443-3-3 SR 6.3  | Alert generation                             | Automated alerting for: security events, health degradation, sensor anomalies, threshold breaches, diode health, quorum events | `lib/alerting.ts`, `engine/threshold_monitor.py` | SL 2 | B |
| SR 6.4  | 62443-3-3 SR 6.4  | Alert response                               | Alert routing to appropriate operator role; escalation procedures with configurable severity thresholds; notification delivery | `lib/notifications/index.ts` | SL 2 | B, C |

### FR 7: Resource Availability (RA)

| Req ID  | IEC 62443-3-3 Ref | Description                                  | Munin Implementation                              | Evidence File                     | SL Achieved | Zone |
|---------|-------------------|----------------------------------------------|---------------------------------------------------|-----------------------------------|-------------|------|
| SR 7.1  | 62443-3-3 SR 7.1  | Denial of service protection                  | Rate limiting at ingestion boundary; backpressure management; container resource quotas (CPU, memory) | `engine/data_ingestion_status.py`, container config | SL 2 | B |
| SR 7.2  | 62443-3-3 SR 7.2  | Resource management                          | Performance budgets documented; memory limits enforced by container runtime; CPU quotas per service | `docs/PERFORMANCE_BUDGET.md`, `docker-compose.yml` | SL 1+ | B |
| SR 7.3  | 62443-3-3 SR 7.3  | Control system backup                         | Backup procedures for configuration, audit data, and key material; documented in operations runbook | `docs/OPERATIONS_RUNBOOK.md` | SL 1+ | B |
| SR 7.4  | 62443-3-3 SR 7.4  | Control system recovery                       | Documented recovery procedures; rollback capability; tested restore from backup | `docs/OPERATIONS_RUNBOOK.md`, `docs/ROLLBACK.md` | SL 1+ | B |
| SR 7.6  | 62443-3-3 SR 7.6  | Network and security config settings          | Locked configuration; Byzantine quorum required for changes; configuration drift detection | `engine/byzantine_resilience.py`, `engine/config.py` | SL 2 | B |
| SR 7.7  | 62443-3-3 SR 7.7  | Least functionality                           | Read-only mode enforced by safety guard; no unnecessary services; minimal network ports; `WRITE_ACCESS_ENABLED=false` | `engine/safety_guard.py`, system design | SL 2 | B |
| SR 7.8  | 62443-3-3 SR 7.8  | Component inventory                           | SBOM generation from package lock files; Python and Node.js dependency tracking; container image manifests | `package-lock.json`, Python requirements | SL 1+ | B |

---

## 6. Security Level Achievement Summary

### 6.1 Zone B: Munin Analysis Zone (SL-T 2)

| FR  | Description                          | Target SL | Achieved SL | Gap                                                |
|-----|--------------------------------------|-----------|-------------|-----------------------------------------------------|
| FR1 | Identification and Authentication    | SL 2      | SL 2        | Fully achieved                                      |
| FR2 | Use Control                          | SL 2      | SL 2        | Fully achieved                                      |
| FR3 | System Integrity                     | SL 2      | SL 2        | Fully achieved                                      |
| FR4 | Data Confidentiality                 | SL 2      | SL 2        | Encryption-at-rest implementation in progress        |
| FR5 | Restricted Data Flow                 | SL 2      | SL 2        | Fully achieved                                      |
| FR6 | Timely Response to Events            | SL 2      | SL 2        | Fully achieved                                      |
| FR7 | Resource Availability                | SL 2      | SL 1+       | Availability testing under sustained load pending    |

**Overall Zone B Assessment**: SL 2 substantially achieved across all seven
Foundational Requirements. FR7 requires completion of availability testing
under sustained high-throughput ingestion conditions. FR4 encryption-at-rest
is partially implemented.

### 6.2 Zone A: SCADA Zone (SL-T 3)

Zone A is managed by the asset owner. Munin has no control over or
responsibility for Zone A security. The data diode conduit (C1) ensures that
any compromise of Zone B cannot propagate to Zone A. The asset owner is
responsible for achieving SL-T 3 within Zone A.

### 6.3 Zone C: Operator Console Zone (SL-T 1)

| FR  | Description                          | Target SL | Achieved SL | Gap                                                |
|-----|--------------------------------------|-----------|-------------|-----------------------------------------------------|
| FR1 | Identification and Authentication    | SL 1      | SL 2        | Exceeds target (inherits Zone B authentication)      |
| FR2 | Use Control                          | SL 1      | SL 2        | Exceeds target (inherits Zone B authorisation)        |
| FR3 | System Integrity                     | SL 1      | SL 1        | TLS for communication; CSP for browser integrity     |
| FR4 | Data Confidentiality                 | SL 1      | SL 1        | CSP prevents browser-side data leakage               |
| FR5 | Restricted Data Flow                 | SL 1      | SL 1        | VLAN isolation; dedicated network segment             |
| FR6 | Timely Response to Events            | SL 1      | SL 2        | Exceeds target (real-time SSE alerting)               |
| FR7 | Resource Availability                | SL 1      | SL 1        | Physical access controls; workstation management      |

**Overall Zone C Assessment**: SL 1 achieved; exceeds target in FR1, FR2,
and FR6 due to inheritance from Zone B security controls.

---

## 7. Gap Analysis and Remediation Plan

| Gap ID  | FR  | Description                                            | Priority | Remediation                              | Target Date |
|---------|-----|--------------------------------------------------------|----------|------------------------------------------|-------------|
| GAP-001 | FR4 | Encryption-at-rest not fully implemented for all data stores | High | Implement encrypted-at-rest storage for telemetry cache and packet store | Q2 2026 |
| GAP-002 | FR7 | Availability testing under sustained high-throughput not completed | High | Execute load testing programme with realistic SCADA data volumes | Q2 2026 |
| GAP-003 | FR7 | Automated SBOM verification not yet in CI pipeline     | Medium   | Integrate SBOM scanning tool into CI/CD   | Q3 2026     |
| GAP-004 | FR7 | Backup restore testing not completed under failure conditions | Medium | Conduct backup/restore drill with simulated failures | Q2 2026 |
| GAP-005 | ---  | No formal penetration test by IEC 62443-certified assessor | High | Commission external penetration test      | Q3 2026     |
| GAP-006 | FR3 | Logic-Lock formal verification of determinism guarantees pending | High | Complete formal verification harness (`engine/formal_verification.py`) | Q2 2026 |
| GAP-007 | FR1 | PQC cipher suite migration not yet mandatory           | Medium   | Enable hybrid classical+PQC mode as default; monitor NIST standardisation | Q3 2026 |

---

## 8. Compensating Controls

Where native SL achievement is not yet complete, the following compensating
controls reduce risk to an acceptable level:

| Gap      | Compensating Control                           | Effectiveness | Residual Risk |
|----------|------------------------------------------------|---------------|---------------|
| GAP-001  | Air-gap prevents external access to data at rest; physical security of deployment zone | High | Low |
| GAP-002  | Operational monitoring; manual failover procedures; performance budgets with headroom | Medium | Medium |
| GAP-003  | Manual dependency review; pinned versions with hash verification | Medium | Low |
| GAP-004  | Documented procedures; configuration version control | Medium | Medium |
| GAP-005  | Property-based security tests; code review; threat model analysis | Medium | Medium |
| GAP-006  | Property-based tests (`engine/tests/test_determinism_properties.py`); golden fixture regression | High | Low |
| GAP-007  | Cryptographic agility architecture (`lib/pqc.ts`); hybrid mode available | High | Low |

---

## 9. Conduit Risk Assessment Summary

| Conduit | Source Zone | Dest Zone | Direction       | Risk Level | Justification                          |
|---------|-------------|-----------|-----------------|------------|----------------------------------------|
| C1      | A (SCADA)   | B (Munin) | Unidirectional  | LOW        | Physical unidirectionality eliminates return-path attacks; data integrity via CRC32 checksums; sequence number gap detection |
| C2      | B (Munin)   | C (Console) | Bidirectional | MEDIUM     | TLS 1.3 encryption; Argon2id authentication; RBAC authorisation; CSP enforcement; session management with timeout and rotation |

---

## 10. Certification Roadmap

| Phase   | Scope                                              | Target Date | Status      |
|---------|-----------------------------------------------------|-------------|-------------|
| Phase 1 | Self-assessment against IEC 62443-3-3 and 62443-4-2 | Q2 2026     | In Progress |
| Phase 2 | Independent gap audit by accredited assessor         | Q3 2026     | Planned     |
| Phase 3 | Remediation of identified gaps                       | Q4 2026     | Planned     |
| Phase 4 | Formal certification submission (SL2 for Zone B)     | Q1 2027     | Planned     |

---

## 11. Recommendations

1. **Complete GAP-001 and GAP-002** as highest priority items to achieve full
   SL-T 2 across all Foundational Requirements for Zone B.
2. **Commission formal penetration test** (GAP-005) by an IEC 62443-certified
   assessor before operational deployment.
3. **Implement automated SBOM verification** (GAP-003) in the CI/CD pipeline
   to strengthen supply chain integrity.
4. **Establish formal zone boundary monitoring** with automated alerting for
   anomalous cross-conduit traffic patterns.
5. **Review SL-T assignments annually** as the threat landscape evolves and
   Munin capabilities expand.

---

## 12. Document Cross-References

| Document                  | ID     | Relationship                                     |
|---------------------------|--------|--------------------------------------------------|
| Safety Case               | SC-001 | Consumes IEC 62443 compliance evidence for claims C4, C5 |
| STPA Hazard Analysis      | SA-001 | Provides hazard context for zone risk assessment  |
| Threat Model              | TM-001 | Provides attacker profiles and attack trees for conduit analysis |
| Hazard Log                | HL-001 | Records security-related hazards including air-gap breach (HAZ-006) |
| Architecture              | ---    | `ARCHITECTURE.md` provides system design context  |
| Security Practices        | ---    | `docs/SECURITY_PRACTICES.md` provides implementation details |

---

**END OF DOCUMENT IC-001**

**Classification: OFFICIAL-SENSITIVE**
