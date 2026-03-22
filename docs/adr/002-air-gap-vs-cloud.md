# ADR-002: Air-Gapped On-Premises Deployment vs Cloud SaaS

**Date:** 2025-11-20

## Status

Accepted

## Context

Munin's core data asset is a dependency graph mapping relationships between critical infrastructure systems — which power plants supply which water treatment facilities, which telecommunications links carry SCADA traffic for which substations, which transportation corridors are single points of failure for emergency response. This graph, once populated, constitutes a comprehensive map of national infrastructure vulnerabilities.

The deployment model for Munin determines who has physical and legal access to this data. This is not a theoretical concern. The U.S. CLOUD Act (2018) grants U.S. law enforcement the ability to compel U.S.-headquartered cloud providers to produce data stored on their servers, regardless of where those servers are physically located. Similar legislation exists or is under development in other jurisdictions.

For a non-U.S. government deploying Munin, storing infrastructure dependency maps on AWS, Azure, or GCP means accepting that a foreign government could legally compel access to their most sensitive infrastructure intelligence. This is not a risk that any sovereign government will accept, and early conversations with potential government stakeholders confirmed this as a non-negotiable requirement.

Beyond jurisdictional concerns, the operational environment for critical infrastructure monitoring demands network isolation. The systems being monitored — SCADA controllers, RTUs, PLCs — operate on air-gapped or segmented OT networks. Introducing cloud connectivity into this environment expands the attack surface in ways that violate established industrial control system security frameworks (IEC 62443, NIST SP 800-82).

## Decision

Munin is deployed exclusively as an on-premises, air-gapped system. The deployment target is government-controlled data centers with no persistent internet connectivity.

All software updates are delivered via signed, physically transported media. The update package includes cryptographic manifests signed with the dual-stack signature scheme (see ADR-005) and can be verified offline before installation.

Telemetry, crash reports, and usage analytics are not collected. There is no phone-home capability. The system does not resolve external DNS, does not open outbound connections, and does not accept inbound connections from outside the deployment network.

Sensor data ingestion occurs through one-way data diodes where available, or through tightly controlled ingestion endpoints on the OT-IT boundary. The architecture assumes that the deployment network is the trust boundary.

## Consequences

**Positive:**
- Complete jurisdictional sovereignty. The deploying government has exclusive physical and legal control over all data.
- No exposure to foreign legal instruments (CLOUD Act, equivalent legislation).
- Minimal attack surface. No internet-facing endpoints eliminates entire classes of remote exploitation.
- Alignment with existing OT security frameworks and government security accreditation requirements.
- Builds trust with infrastructure operators who are deeply skeptical of cloud-connected tools in their environments.

**Negative:**
- No automatic updates. Every software update requires physical delivery, verification, and manual installation. This slows the release cycle and increases the cost of patching.
- No centralized monitoring of deployment health. If a deployment encounters an issue, the Munin team has no visibility into it unless the operator reports it through out-of-band channels.
- Scaling is hardware-bound. Each deployment must be provisioned with sufficient compute and storage for its anticipated workload, with no ability to elastically scale.
- Development iteration is slower. Features cannot be A/B tested or gradually rolled out. Each release must be thoroughly validated before physical distribution.
- Higher per-deployment cost. On-premises hardware, installation, and ongoing maintenance are more expensive than equivalent cloud resources.

## Alternatives Considered

**Cloud SaaS:** Deploy Munin as a multi-tenant cloud service. This would dramatically simplify operations — automatic updates, centralized monitoring, elastic scaling, lower marginal cost per deployment. However, it is fundamentally incompatible with the product's value proposition. No government will store infrastructure vulnerability maps on servers subject to foreign jurisdiction. This option was rejected as commercially and politically impossible for the target customer segment.

**Hybrid (on-premises compute, cloud analytics):** Run the core system on-premises but stream anonymized analytics to a cloud backend for performance monitoring and product improvement. While technically feasible, the trust model is complicated. "Anonymized" infrastructure data is difficult to truly de-identify — temporal patterns, graph structure, and metadata can reveal sensitive information even without explicit labels. The risk of data leakage outweighs the operational benefit. Rejected.

**On-premises with cloud telemetry:** Similar to hybrid but limited to system health telemetry (CPU usage, error rates, uptime). Even this minimal data exfiltration was rejected. Connection metadata alone — when the system is active, how much data it processes, when updates are applied — reveals operational patterns that a sophisticated adversary could exploit. The air gap must be complete to be meaningful.
