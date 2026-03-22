# ADR-001: Byzantine M-of-N Quorum vs Single-Key Authority

**Date:** 2025-11-14

## Status

Accepted

## Context

Munin manages visibility into critical national infrastructure — power grids, water treatment facilities, telecommunications backbones, and transportation networks. Commands issued through the platform carry consequences measured in public safety, not just system availability.

In early design discussions, the question arose of how to authenticate and authorize high-impact actions: acknowledging threat assessments, modifying dependency graph weights, triggering emergency notifications, and adjusting sensor ingestion configurations. These are not routine CRUD operations. A single misconfigured dependency weight could mask a cascading failure chain. A false emergency notification could trigger unnecessary shutdowns across interconnected sectors.

The operating environment assumes adversarial conditions. Nation-state attackers routinely compromise individual credentials through phishing, insider recruitment, or device theft. Any authentication scheme that relies on a single key — no matter how well-protected — creates a single point of failure that an attacker can target with concentrated effort.

Additionally, the institutional context matters. Governments operate through ministries, and ministries operate through chains of accountability. No single official should be able to unilaterally alter the nation's understanding of its infrastructure dependencies. This is not merely a security requirement; it is a governance requirement. Decisions about critical infrastructure must be auditable, attributable, and resistant to coercion of any individual actor.

## Decision

All critical operations in Munin require M-of-N multi-ministry quorum approval, where M and N are configurable per deployment but default to 3-of-5.

Each participating ministry holds an independent signing key. To authorize a critical action, at least M ministries must independently sign the request within a configurable time window (default: 48 hours). The system validates that signatures originate from distinct ministries, preventing a single compromised ministry from replaying multiple approvals.

The quorum mechanism is implemented at the protocol layer, not the application layer. This means it cannot be bypassed by application-level bugs or configuration changes. The quorum parameters themselves require a higher threshold to modify (M+1 of N).

Every quorum decision is written to an append-only audit log with all participating signatures, timestamps, and the full request payload. This log is independently verifiable by any participating ministry.

## Consequences

**Positive:**
- No single point of failure for critical operations. Compromising one ministry's key is insufficient to authorize actions.
- Full auditability. Every critical decision has a cryptographic record of which ministries approved it and when.
- Resistance to coercion. An attacker who coerces a single official cannot force through unauthorized changes.
- Institutional alignment. The technical architecture mirrors how governments actually make decisions — through inter-ministry coordination, not unilateral action.

**Negative:**
- Slower decision-making. Emergency scenarios may be delayed by the time required to gather M signatures. This is mitigated by configurable time windows and the option to pre-authorize emergency response playbooks at a lower threshold.
- Operational complexity. Each ministry must maintain key management practices, including secure storage, rotation schedules, and revocation procedures.
- Coordination overhead. Ministries must establish out-of-band communication channels to coordinate signing during time-sensitive events.
- Key loss risk. If more than (N - M) ministries lose their keys simultaneously, the system becomes locked. This is mitigated by key recovery procedures that themselves require quorum approval.

## Alternatives Considered

**Single-key authority:** A single authorized official holds the signing key. This is the simplest approach and allows the fastest response times. However, it creates an unacceptable single point of failure. One compromised credential means full system compromise. One coerced official means full adversarial control. This was rejected as fundamentally incompatible with the threat model.

**Threshold signatures (e.g., Shamir's Secret Sharing):** Key shares are distributed such that M shares reconstruct the signing key. While mathematically elegant, this approach requires a trusted dealer during key generation and creates a window during reconstruction where the full key exists in memory. It also complicates key rotation — every rotation requires a new sharing ceremony. The operational complexity was deemed too high for the marginal cryptographic benefit over independent multi-signature verification.

**Hierarchical approval chains:** Approvals flow sequentially up a chain of command — analyst to director to minister. This mirrors existing bureaucratic processes but is strictly sequential, creating bottlenecks at each level. It also concentrates veto power at the top of the chain, reintroducing single-point-of-failure risk. The parallel M-of-N model was preferred because it distributes authority without creating sequential dependencies.
