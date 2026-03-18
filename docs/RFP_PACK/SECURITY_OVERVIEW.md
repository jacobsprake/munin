# Munin -- Security Overview

**Document Classification:** Procurement-Sensitive | Pre-Decisional
**Version:** 1.0
**Date:** 2026-03-18
**Audience:** Security architects, CISO staff, compliance officers
**Alignment:** NIST SP 800-82 Rev. 3, IEC 62443-3-3

---

## 1. Security Architecture Summary

Munin's security architecture is designed around a single organizing principle:
**the system must be incapable of causing harm to the infrastructure it monitors.**

This principle is enforced through four architectural constraints:

1. **Unidirectional data flow.** Data enters through a diode; no write-back path exists.
2. **Read-only advisory mode.** Version 1 produces signed recommendations only. No
   actuation interface exists in the software.
3. **Zero external dependencies at runtime.** No network calls, no cloud services, no
   DNS resolution, no telemetry.
4. **Cryptographic provenance on all outputs.** Every advisory packet is signed and
   chained, ensuring tamper evidence and attribution.

---

## 2. Air-Gap Enforcement

### 2.1 Network Isolation

- Munin is designed for deployment on an isolated network segment with no routable
  path to operational technology (OT) networks or the public internet.
- The application makes zero outbound network connections. This is verifiable by
  static analysis of the codebase and runtime network monitoring.
- Content Security Policy headers block all external resource loading in the
  operator console.

### 2.2 Data Diode Integration

- All infrastructure data enters through a unidirectional data diode (hardware or
  certified software diode).
- The diode interface accepts file-based batch transfers. No bidirectional protocol
  (TCP handshake, HTTP request/response) crosses the boundary.
- Diode compatibility has been validated against common commercial data diode products.

### 2.3 Update and Provisioning

- Software updates are delivered via signed, offline media.
- Update packages include integrity manifests verified against a known public key
  before installation.
- No auto-update mechanism exists. All updates require explicit operator action.

---

## 3. Cryptographic Controls

### 3.1 Signature Scheme: Ed25519

- All advisory packets are signed using Ed25519 (RFC 8032).
- Ed25519 provides 128-bit security, deterministic signatures, and resistance to
  side-channel attacks on the signing process.
- Key generation and signing occur locally. Private keys never leave the deployment
  environment.

### 3.2 Post-Quantum Readiness: ML-DSA Dual-Stack

- Munin implements a dual-stack signing architecture: each packet is signed with both
  Ed25519 and ML-DSA (FIPS 204, formerly CRYSTALS-Dilithium).
- The dual-stack approach ensures that packets remain verifiable under both classical
  and post-quantum assumptions.
- Migration to ML-DSA-only signing is supported as a configuration option for
  environments with PQC mandates.

### 3.3 Merkle Chain Integrity

- Signed packets are sequenced using a hash chain (Merkle structure).
- Each packet includes the hash of the preceding packet, creating a tamper-evident
  log of all advisory outputs.
- Chain verification can be performed independently by any party holding the public
  key and the packet sequence.

### 3.4 Key Management

- Signing keys are generated on the deployment host at provisioning time.
- In production deployments (v2+), key storage will migrate to a Hardware Security
  Module (HSM).
- Key rotation procedures are documented. Rotation events are recorded in the
  Merkle chain as signed metadata packets.

---

## 4. Access Control

### 4.1 Role-Based Access Control (RBAC)

Munin defines three roles in v1:

| Role | Permissions |
|---|---|
| **Viewer** | View playbooks, shadow links, and packet details. |
| **Analyst** | Viewer permissions, plus ability to annotate shadow links and mark playbooks as reviewed. |
| **Administrator** | Analyst permissions, plus key management, system configuration, and user administration. |

All role assignments are local. No external identity provider is required (though
LDAP/AD integration is planned for v2).

### 4.2 M-of-N Signing

- Critical administrative actions (key rotation, configuration changes, software
  updates) require M-of-N authorization.
- Multiple administrators must independently approve and co-sign the action before
  it is executed.
- The M and N thresholds are configurable at deployment time.

### 4.3 Session Management

- Operator console sessions are authenticated locally.
- Sessions have configurable inactivity timeouts (default: 15 minutes).
- Session tokens are not persisted to disk. Browser storage (localStorage,
  sessionStorage, cookies) is minimized and contains no sensitive data.

---

## 5. Data Protection

### 5.1 Data at Rest

- The SQLite database is stored on the local filesystem.
- Full-disk encryption (e.g., LUKS, BitLocker) is recommended and documented in
  deployment guides but is the responsibility of the host environment.
- Munin does not implement application-layer encryption of the database in v1.
  This is planned for v2 with SQLite Encryption Extension (SEE) or equivalent.

### 5.2 Data in Transit

- In air-gapped deployments, the only "transit" is between the application server
  and the local browser, over localhost.
- TLS is enforced on the local interface to prevent local network sniffing in
  multi-user workstation configurations.

### 5.3 Content Security Policy

The operator console enforces a strict CSP:

```
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data:;
connect-src 'self';
font-src 'self';
object-src 'none';
frame-src 'none';
base-uri 'self';
form-action 'self';
```

No inline scripts, no external resources, no iframes.

---

## 6. Threat Model Summary

| Threat | Mitigation |
|---|---|
| Compromised upstream data source | Data diode prevents write-back. Anomalous ingestion data flagged by normalization stage. |
| Insider manipulation of advisories | All packets are signed and Merkle-chained. Tampering is detectable. M-of-N required for admin actions. |
| Supply chain compromise of software | Signed update packages. Offline delivery. Integrity verification before installation. |
| Exfiltration of infrastructure data | Air-gapped deployment. No outbound network path. No telemetry. |
| Post-quantum cryptanalysis of signatures | Dual-stack Ed25519 + ML-DSA. Forward-compatible packet format. |
| Console-based attacks (XSS, CSRF) | Strict CSP. No inline scripts. No external dependencies. CSRF tokens on all state-changing requests (admin only in v1). |
| Physical access to deployment host | Relies on host environment physical security. Full-disk encryption recommended. |

---

## 7. Compliance Mapping References

Munin's security controls are designed with reference to the following frameworks.
Formal certification has not been pursued at the prototype stage; the mappings below
indicate design intent and alignment.

| Framework | Relevant Sections | Munin Alignment |
|---|---|---|
| **NIST SP 800-82 Rev. 3** | Sections 5 (ICS Security Architecture), 6 (Applying Security Controls) | Air-gap enforcement, unidirectional data flow, RBAC, cryptographic integrity. |
| **IEC 62443-3-3** | SR 1.1-1.13 (Identification and Authentication), SR 3.1-3.9 (System Integrity) | Local authentication, session management, signed outputs, integrity verification. |
| **NIST SP 800-207** | Zero Trust Architecture principles | No implicit trust. All outputs signed. No persistent sessions. |
| **FIPS 204** | ML-DSA (post-quantum digital signatures) | Dual-stack signing implemented. |

---

*For safety analysis, see SAFETY_CASE_SUMMARY.md.*
*For architecture details, see TECH_OVERVIEW.md.*
