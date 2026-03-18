# Munin -- Licensing and Roadmap

**Document Classification:** Procurement-Sensitive | Pre-Decisional
**Version:** 1.0
**Date:** 2026-03-18
**Audience:** Procurement officers, program managers, legal counsel

---

## 1. Current Status

Munin is at the **validated prototype** stage.

| Attribute | Status |
|---|---|
| Core pipeline (5-stage) | Functional on synthetic and public data |
| Shadow link discovery | Validated against known dependency scenarios |
| Cryptographic packet signing (Ed25519) | Operational |
| Post-quantum dual-stack (ML-DSA) | Operational |
| Merkle chain integrity | Operational |
| Operator console | Functional prototype |
| Production hardening | Not yet complete |
| Independent security audit | Not yet conducted |
| Formal safety certification | Not yet pursued |

**Data disclaimer:** The prototype has been validated exclusively on synthetic
infrastructure datasets and publicly available flood-event data. No production
infrastructure data from any operating entity has been ingested.

---

## 2. Licensing

### 2.1 Evaluation License

Munin is available for evaluation under a **no-cost evaluation license** that permits:

- Installation on evaluator-controlled hardware.
- Operation with synthetic data or evaluator-provided test data.
- Internal assessment, benchmarking, and reporting.
- No time limit on evaluation use.

The evaluation license does not permit:

- Use in production operational environments.
- Redistribution of the software.
- Modification of cryptographic components.

### 2.2 Commercial Support Model (Planned)

For production deployments, a commercial support and maintenance model is planned.
The intended structure is:

| Tier | Scope | Availability |
|---|---|---|
| **Deployment Support** | On-site installation, configuration, data diode integration, initial operator training. | Available now (engagement basis). |
| **Annual Maintenance** | Software updates, security patches, connector updates, technical support. | Planned for v1 general availability. |
| **Extended Support** | Custom connector development, integration engineering, safety case extension for specific deployments. | Planned for v2. |

Pricing will be determined based on deployment scale and support requirements.
Government and public-sector pricing models are under development.

### 2.3 Intellectual Property

- Munin is proprietary software.
- The advisory packet format (SOP-v1) is published as an open specification
  (see `specs/munin-packet-v1.md`) to enable independent verification tooling
  and interoperability.
- No open-source licensing of the core platform is planned at this time, though
  the packet verification library may be released under a permissive license to
  facilitate independent audit.

---

## 3. Roadmap

### Phase 1: v1 -- Read-Only Advisory (Current)

**Objective:** Demonstrate value with zero risk to operational infrastructure.

| Capability | Status |
|---|---|
| Five-stage analysis pipeline | Complete |
| Shadow link discovery | Complete |
| Pre-validated playbook mapping | Complete |
| Cryptographic advisory packets (Ed25519 + ML-DSA) | Complete |
| Merkle chain integrity | Complete |
| Operator console (read-only) | Complete |
| Air-gapped deployment support | Complete |
| Synthetic data validation | Complete |
| Production hardening and independent audit | Planned |

**Key constraint:** No actuation capability. All outputs are advisory only.

### Phase 2: v2 -- Controlled Actuation

**Objective:** Enable operator-authorized actions with hardware-enforced safety.

| Planned Capability | Description |
|---|---|
| HSM-backed signing | Signing keys stored in Hardware Security Module. |
| Actuation interface (controlled) | Operator-initiated commands, co-signed by HSM, with M-of-N authorization. |
| LDAP/AD integration | Enterprise identity provider integration for RBAC. |
| Database encryption | Application-layer encryption of stored data. |
| Formal safety case extension | STPA analysis extended to cover actuation pathways. |
| Independent security audit | Third-party penetration testing and code review. |

**Key constraint:** Every actuation command requires explicit operator initiation,
M-of-N co-authorization, and HSM co-signature. No autonomous actuation.

### Phase 3: v3 -- Multi-Jurisdiction Federation

**Objective:** Enable coordinated advisory across organizational boundaries.

| Planned Capability | Description |
|---|---|
| Federated shadow link discovery | Cross-organization dependency mapping with data sovereignty controls. |
| Inter-agency packet exchange | Signed advisory packets shared between jurisdictions via secure transport. |
| Policy-gated data sharing | Configurable rules governing what data crosses organizational boundaries. |
| Multi-jurisdiction playbook coordination | Cross-boundary conflict detection in emergency response procedures. |

**Key constraint:** Each jurisdiction retains full control of its data and signing
authority. Federation is advisory, not command-and-control.

---

## 4. Support Model

### 4.1 Deployment Assistance

The Munin team provides on-site support for:

- Hardware provisioning and air-gapped environment setup.
- Data diode integration and connector configuration.
- Initial data ingestion and normalization validation.
- Operator console deployment and configuration.

Typical evaluation deployment requires one to two days of on-site support.

### 4.2 Operator Training

Training covers:

- System capabilities and limitations.
- Interpreting shadow link discovery results.
- Reading and verifying signed advisory packets.
- Understanding confidence scores and data freshness indicators.
- Manual fallback procedures when Munin is unavailable.

Training is delivered on-site and typically requires one day for operational staff.

### 4.3 Ongoing Maintenance

For production deployments under a maintenance agreement:

- Software updates delivered on signed offline media.
- Security patches with defined response time targets.
- Connector updates for new historian and data source formats.
- Technical support via secure communication channels.

---

## 5. Open Standards

### 5.1 SOP-v1 Packet Format

The Munin advisory packet format is published as an open specification:

- **Specification:** `specs/munin-packet-v1.md`
- **Purpose:** Enable independent verification of advisory packets, interoperability
  with third-party audit tools, and long-term archival of advisory records.
- **Scope:** Defines packet structure, field semantics, signature format, and
  Merkle chain construction.
- **Stability:** The v1 format is considered stable for the current release. Future
  versions will maintain backward compatibility for verification purposes.

Independent parties are encouraged to develop verification tooling against this
specification. A reference verification library may be released under a permissive
open-source license.

---

## 6. Contact and Next Steps

Organizations interested in evaluating Munin are invited to:

1. Request an evaluation license and synthetic dataset.
2. Schedule an on-site or remote demonstration.
3. Discuss pilot design for controlled evaluation with representative data.

---

*For technical architecture, see TECH_OVERVIEW.md.*
*For security details, see SECURITY_OVERVIEW.md.*
*For safety analysis, see SAFETY_CASE_SUMMARY.md.*
*For executive summary, see EXEC_SUMMARY.md.*
