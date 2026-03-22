# ADR-006: Sovereign Per-Jurisdiction Isolation

**Date:** 2026-01-22

## Status

Accepted

## Context

Munin is designed for deployment by national governments to map and monitor critical infrastructure dependencies within their borders. The resulting dependency graphs are, by definition, national security assets. They reveal which infrastructure systems are vulnerable, which failures would cascade, and which single points of failure an adversary could exploit for maximum impact.

No government will accept a deployment model in which another nation's government — even an allied one — can access their infrastructure dependency data. This is not a hypothetical concern. Intelligence sharing between allied nations is governed by complex bilateral agreements with strict compartmentalization. Infrastructure vulnerability data is among the most sensitive categories of national security information, comparable to signals intelligence or nuclear weapons design.

A multi-tenant or federated architecture, where multiple jurisdictions share infrastructure or data stores, creates unacceptable risks: a vulnerability in the shared layer could expose one jurisdiction's data to another, a legal process in one jurisdiction could compel access to shared infrastructure, and operational personnel with access to shared systems could access cross-jurisdictional data.

At the same time, infrastructure dependencies do not stop at national borders. Power grids cross borders. Undersea cables connect continents. Supply chains span dozens of countries. A complete picture of infrastructure resilience requires some mechanism for cross-border coordination.

## Decision

Each Munin deployment is fully sovereign — an independent instance with its own cryptographic keys, its own dependency graph, its own governance structure, and its own operational team. No deployment shares any infrastructure, data store, key material, or administrative access with any other deployment.

Cross-border coordination is handled through a standardized packet exchange protocol. When two jurisdictions agree to share specific dependency information (e.g., the status of a cross-border power interconnector), they exchange signed packets through a defined protocol. These packets contain only the mutually agreed-upon data — not raw dependency graphs.

The packet exchange protocol has the following properties:
- **Explicit consent.** Both jurisdictions must configure their respective deployments to participate in a specific exchange. No data flows without affirmative configuration on both sides.
- **Minimal disclosure.** Exchanged packets contain only the agreed-upon data points, not the underlying graph structure. A jurisdiction can share "interconnector X is operating at 80% capacity" without revealing which downstream systems depend on that interconnector.
- **Cryptographic attribution.** All exchanged packets carry dual-stack signatures (see ADR-005) from the originating jurisdiction. The receiving jurisdiction can verify authenticity without trusting any shared infrastructure.
- **Unilateral revocation.** Either jurisdiction can terminate an exchange at any time by removing the configuration. No negotiation or mutual agreement is required to stop sharing.

## Consequences

**Positive:**
- Complete data sovereignty. Each government has exclusive control over its infrastructure dependency data, with no exposure to foreign legal instruments, shared vulnerabilities, or administrative access.
- Trust model is simple and verifiable. Each deployment trusts only itself. Cross-border exchanges are explicitly configured, minimally scoped, and unilaterally revocable.
- Regulatory compliance is straightforward. Each deployment operates entirely within one legal jurisdiction, avoiding complex cross-border data protection issues.
- Compromise containment. If one jurisdiction's deployment is compromised, no other jurisdiction's data is affected.
- Political feasibility. Sovereign isolation is the only model that is politically acceptable to the target customer segment.

**Negative:**
- No global view. No single entity can see the complete picture of cross-border infrastructure dependencies. This is a deliberate trade-off — the political cost of a global view exceeds its analytical benefit.
- Duplication of effort. Each deployment must independently discover dependencies that cross borders. Two jurisdictions may independently detect the same cross-border dependency from their respective sides.
- Update coordination. Software updates must be distributed to and installed by each deployment independently. There is no central mechanism to ensure all deployments run the same version.
- Higher aggregate cost. Each deployment requires its own hardware, its own operational team, and its own maintenance. There are no economies of scale from shared infrastructure.
- Limited cross-border analysis. The packet exchange protocol is deliberately constrained. Sophisticated cross-border dependency analysis requires human coordination between jurisdictional teams, not automated data sharing.

## Alternatives Considered

**Federated multi-jurisdiction:** Deploy a shared infrastructure layer with jurisdiction-specific data partitions. Each jurisdiction can see only its own data, but the underlying infrastructure (databases, compute, networking) is shared. This reduces cost and enables cross-border analysis through controlled queries. However, the shared infrastructure creates a single trust domain that spans jurisdictions. A vulnerability in the shared layer could expose cross-jurisdictional data. A legal process in one jurisdiction could compel access to shared infrastructure. Rejected as incompatible with the sovereignty requirements.

**Centralized global instance:** A single Munin deployment operated by an international body (e.g., a UN agency) with access to all participating jurisdictions' infrastructure data. This would provide the most complete analytical picture but is politically impossible. No government will submit its infrastructure vulnerability data to an international body's control. Rejected as unrealistic.

**Bilateral data sharing agreements:** Instead of a standardized protocol, each pair of cooperating jurisdictions negotiates a bilateral agreement specifying what data is shared and how. This approach is legally complex, slow to establish, and does not scale. With N jurisdictions, there are N*(N-1)/2 potential bilateral agreements. The standardized packet exchange protocol provides the same functionality with dramatically lower coordination overhead. Rejected in favor of the protocol-based approach.
