# Byzantine Multi-Signature Governance Model

**Document ID:** GOV-001
**Classification:** OFFICIAL - SENSITIVE
**Version:** 0.4.0-draft
**Last Updated:** 2026-03-18
**Owner:** Munin Safety Engineering
**Review Cycle:** Quarterly

---

## 1. Purpose

This document defines the governance architecture for the Munin platform, specifying how decisions are authorised, who holds authority, and what cryptographic mechanisms enforce those constraints. The model is designed to prevent unilateral action by any single party, including the system's developers, operators, or deploying organisation.

---

## 2. Design Principles

1. **No unilateral action.** Every consequential system action requires multi-party authorisation.
2. **Byzantine fault tolerance.** The governance model assumes up to f compromised or malicious participants in an N-participant quorum.
3. **Cryptographic enforcement.** Policies are enforced by digital signatures, not by access control lists that can be administratively overridden.
4. **Graduated authority.** Different deployment contexts warrant different quorum thresholds.
5. **Auditability.** Every governance action produces an immutable, independently verifiable audit record.

---

## 3. Ministry Architecture

### 3.1 Overview

The Ministry system (ref: `lib/ministry/roleMapping.ts`) defines the roles, responsibilities, and cryptographic identities of all governance participants. Each participant holds a unique signing key pair and is assigned one or more roles.

### 3.2 Role Definitions

| Role | Responsibility | Scope | Typical Holder |
|------|---------------|-------|----------------|
| Duty Officer | Frontline operational decisions; approves or rejects playbook recommendations | Single incident / session | Shift operator |
| Gold Commander | Strategic oversight; authorises elevated actions; reviews escalations | Deployment-wide | Senior engineer / incident commander |
| Regulator | Independent oversight; audit access; veto on safety-critical changes | Cross-deployment | External safety body representative |
| System Custodian | Key management; configuration changes; software updates | Platform-level | Platform engineering lead |
| Safety Assessor | Hazard review; safety case updates; risk acceptance | Safety lifecycle | Independent safety engineer |

### 3.3 Role Mapping Configuration

Role mappings are defined in `lib/ministry/roleMapping.ts` and bind cryptographic identities (public keys) to role capabilities. A single identity may hold multiple roles, but quorum calculations treat each role independently to prevent consolidation of authority.

```
RoleMapping {
  identity: PublicKey
  roles: Role[]
  validFrom: Timestamp
  validUntil: Timestamp
  grantedBy: QuorumSignature  // The role assignment itself requires quorum approval
}
```

---

## 4. Quorum Policies

### 4.1 M-of-N Quorum Model

All governance actions require M valid signatures from N eligible signers, where M and N are determined by the deployment profile and the action severity.

The quorum verification logic resides in `lib/ministry/quorum.ts`.

### 4.2 Deployment Profiles

#### 4.2.1 Demo Profile (1-of-1)

| Action Class | Quorum (M-of-N) | Eligible Roles | Notes |
|-------------|-----------------|----------------|-------|
| Playbook approval | 1-of-1 | Duty Officer | Single-user demonstration |
| Configuration change | 1-of-1 | System Custodian | Reduced ceremony for evaluation |
| Safety override | 1-of-1 | Any role | Logged but not blocked |

**Constraints:** Demo profile may not be used with live infrastructure data. The system enforces this by requiring a `DEMO_MODE=true` environment flag and refusing connections to production data diodes.

#### 4.2.2 Pilot Profile (2-of-3)

| Action Class | Quorum (M-of-N) | Eligible Roles | Notes |
|-------------|-----------------|----------------|-------|
| Playbook approval | 1-of-2 | Duty Officer, Gold Commander | Standard operational decision |
| Configuration change | 2-of-3 | System Custodian, Gold Commander, Safety Assessor | Requires cross-functional agreement |
| Safety override | 2-of-3 | Gold Commander, Regulator, Safety Assessor | Cannot be performed by operations alone |
| Key rotation | 2-of-3 | System Custodian, Gold Commander, Regulator | Prevents unilateral key manipulation |

#### 4.2.3 Production Profile (3-of-4)

| Action Class | Quorum (M-of-N) | Eligible Roles | Notes |
|-------------|-----------------|----------------|-------|
| Playbook approval | 1-of-2 | Duty Officer, Gold Commander | Operational tempo preserved |
| Configuration change | 3-of-4 | System Custodian, Gold Commander, Safety Assessor, Regulator | High bar for system modification |
| Safety override | 3-of-4 | Gold Commander, Regulator, Safety Assessor, System Custodian | Maximum consensus required |
| Key rotation | 3-of-4 | All roles excluding Duty Officer | Prevents operational staff from key manipulation |
| Software update | 3-of-4 | System Custodian, Gold Commander, Safety Assessor, Regulator | Signed binary with multi-party attestation |
| Audit log export | 2-of-4 | Any two distinct roles | Prevents unilateral data extraction |

#### 4.2.4 Emergency Profile (Reduced Quorum with Enhanced Logging)

When a declared emergency reduces the availability of quorum participants, the following degraded mode applies:

| Action Class | Quorum (M-of-N) | Additional Requirements |
|-------------|-----------------|------------------------|
| Playbook approval | 1-of-1 | Enhanced audit: full decision context recorded; mandatory post-incident review |
| Configuration change | 1-of-2 | Time-limited: expires after 4 hours; auto-revert if not ratified by full quorum |
| Safety override | 2-of-2 | Must include at least one non-operational role; immediate notification to all absent quorum members |

**Emergency declaration** itself requires 2-of-3 approval (or 1-of-1 if communications are degraded, with mandatory retroactive review).

All actions taken under emergency profile are flagged in the audit log with `EMERGENCY_GOVERNANCE` classification and trigger automatic post-incident review workflow.

---

## 5. Key Ceremony Process

### 5.1 Overview

The key ceremony (ref: `scripts/key_ceremony.sh`) establishes the initial cryptographic identities for all governance participants. It is conducted in a controlled environment with independent witnesses.

### 5.2 Pre-Ceremony Requirements

1. Air-gapped key generation machine with verified, audited software
2. Hardware security modules (HSMs) or hardware tokens for each participant
3. At least two independent witnesses not holding governance roles
4. Tamper-evident bags for key material transport
5. Ceremony script (`scripts/key_ceremony.sh`) reviewed and signed by Safety Assessor

### 5.3 Ceremony Procedure

```
Phase 1: Environment Verification
  - Verify air-gap (no network interfaces active)
  - Verify software integrity (hash against signed manifest)
  - Witnesses confirm environment

Phase 2: Key Generation
  - For each participant:
    - Generate Ed25519 key pair (classical)
    - Generate ML-DSA key pair (post-quantum)
    - Store private keys on hardware token
    - Export public keys to ceremony record
  - Witness each generation step

Phase 3: Role Binding
  - Create role mapping configuration
  - Each participant signs their own role acceptance
  - Quorum of existing members (or witnesses for initial ceremony) ratifies mappings

Phase 4: Verification
  - Each participant demonstrates signing capability
  - Verify quorum operation with test transaction
  - Record ceremony transcript with timestamps

Phase 5: Secure Distribution
  - Hardware tokens sealed in tamper-evident bags
  - Recovery shares generated (Shamir's Secret Sharing, 3-of-5)
  - Recovery shares distributed to geographically separated custodians
  - Ceremony machine securely wiped
```

### 5.4 Key Rotation

Key rotation follows the same ceremony process with the additional requirement that the outgoing key signs a delegation to the incoming key. Rotation is triggered by:

- Scheduled rotation (annually for production deployments)
- Suspected compromise (emergency rotation within 1 hour)
- Personnel change (within 24 hours of role transfer)
- PQC algorithm update (as directed by cryptographic advisory)

---

## 6. Escalation Procedures

### 6.1 Escalation Levels

| Level | Trigger | Response | Authority |
|-------|---------|----------|-----------|
| L1: Operational | Anomaly detected; playbook recommended | Duty Officer reviews and approves/rejects | Duty Officer (1-of-1) |
| L2: Elevated | Multiple correlated anomalies; cascade risk identified | Gold Commander engaged; enhanced monitoring | Duty Officer + Gold Commander (2-of-2) |
| L3: Strategic | Cross-sector cascade confirmed; safety boundaries approached | Full governance quorum activated; regulator notified | Production quorum (3-of-4) |
| L4: Emergency | Active infrastructure failure; governance degradation | Emergency profile activated; all available signers engaged | Emergency quorum with enhanced audit |

### 6.2 Escalation Timeframes

| Transition | Maximum Latency | Enforcement |
|-----------|----------------|-------------|
| L1 -> L2 | 15 minutes | Automatic escalation if L1 unresolved |
| L2 -> L3 | 30 minutes | Gold Commander decision or automatic on safety threshold |
| L3 -> L4 | Immediate | Triggered by system safety monitor or Gold Commander |
| L4 -> L3 (de-escalation) | Requires full quorum ratification | Cannot be unilateral |

---

## 7. Emergency Override

### 7.1 Conditions for Override

An emergency override allows a reduced quorum to take actions normally requiring higher consensus. This is a last-resort mechanism for situations where:

1. Quorum participants are unreachable due to the infrastructure incident itself
2. Time-critical action is required to prevent escalation to catastrophic severity
3. Normal communication channels are degraded

### 7.2 Override Requirements

- Minimum 1-of-1 for playbook approval (Duty Officer or Gold Commander)
- Minimum 2-of-2 for safety override (must include at least one non-operational role)
- Override must be declared with explicit justification recorded in audit log
- Override expires after 4 hours and must be ratified or rolled back
- All override actions are automatically flagged for post-incident review
- Notification attempt must be made to all absent quorum members via all available channels

### 7.3 Post-Override Review

Within 72 hours of emergency override termination:

1. Full quorum convenes for retrospective review
2. All override actions reviewed against necessity and proportionality
3. Safety Assessor evaluates whether override caused or prevented harm
4. Regulator receives override report regardless of outcome
5. Governance model updated if systemic issues identified
6. Override report appended to audit chain with full quorum signature

---

## 8. Constitutional Constraints

Certain actions are **constitutionally prohibited** regardless of quorum consensus:

1. **No actuation.** Munin shall not directly control infrastructure. This is enforced architecturally (data diode, no write path) and cannot be overridden.
2. **No silent operation.** All analysis outputs must be visible to at least the Duty Officer. Background-only mode is prohibited.
3. **No audit suppression.** The audit log cannot be paused, truncated, or filtered. Any attempt triggers an immediate L3 escalation.
4. **No role consolidation.** No single identity may satisfy multiple quorum slots for the same action.
5. **No retroactive authorisation.** Actions cannot be authorised after execution. The only exception is emergency override ratification, which does not authorise the action but rather accepts its consequences.

---

## 9. Governance Versioning

Changes to this governance model require:

- Production quorum approval (3-of-4)
- 30-day notice period before activation
- Independent safety assessment of governance change impact
- Version increment recorded in audit chain

| Version | Date | Change Summary | Approved By |
|---------|------|---------------|-------------|
| 0.1.0 | 2026-01-15 | Initial governance framework | Founding team |
| 0.2.0 | 2026-02-10 | Added emergency profile | Safety review |
| 0.4.0 | 2026-03-18 | Constitutional constraints; escalation timeframes | [PENDING] |

---

**END OF DOCUMENT GOV-001**
