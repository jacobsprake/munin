# ADR-004: Read-Only Architecture for v1 — No SCADA Write Capability

**Date:** 2025-12-10

## Status

Accepted

## Context

Munin ingests telemetry from operational technology (OT) networks — SCADA systems, distributed control systems (DCS), programmable logic controllers (PLCs), and remote terminal units (RTUs). These systems control physical processes: opening valves, adjusting generator output, switching circuit breakers, modulating chemical dosing.

The fastest way to lose the trust of infrastructure operators — permanently — is to touch their control systems. The history of industrial control system security is littered with examples of well-intentioned software that caused outages, safety incidents, or regulatory violations by sending unexpected commands to OT devices. Stuxnet demonstrated what happens when software writes to PLCs. Every infrastructure operator knows this history.

Munin's value proposition is visibility, not control. The product exists to show operators what they cannot currently see: hidden dependencies, cascading failure chains, cross-sector vulnerabilities. This is a read-only function. There is no v1 use case that requires writing to OT systems, and the risk of including write capability — even as an unused code path — vastly outweighs any potential benefit.

Beyond the operational risk, there is a regulatory dimension. Industrial control systems are governed by safety standards (IEC 61508, IEC 61511) and cybersecurity standards (IEC 62443) that impose stringent requirements on any software that can influence physical processes. A read-only monitoring tool faces a dramatically simpler certification path than a tool with write access to control systems.

## Decision

Munin v1 is architecturally incapable of writing to SCADA, DCS, PLC, or RTU systems. This is enforced at multiple layers:

1. **No write API.** The platform exposes no API endpoint, internal or external, that accepts commands destined for OT systems. This is not a permission check — the code path does not exist.

2. **No outbound sockets to OT networks.** The ingestion layer opens inbound connections (or receives data through data diodes) from OT networks. It never initiates outbound connections to OT network segments.

3. **Compile-time enforcement.** A build flag `WRITE_ACCESS_ENABLED=false` is set at compile time. Any code that references OT write functionality is conditionally excluded from the build. In v1, there is no code behind this flag — it exists as a structural safeguard for future development.

4. **Static analysis CI gate.** The continuous integration pipeline includes static analysis tests that scan the entire codebase for patterns associated with OT write operations: outbound socket creation to OT network ranges, SCADA protocol write commands (Modbus function codes 5, 6, 15, 16; DNP3 direct operate; IEC 104 command types), and any reference to control-plane APIs. A single match fails the build.

5. **Deployment verification.** The installation procedure includes a network scan that verifies the deployed system has no outbound connectivity to OT network segments. This scan is documented and its results are included in the deployment audit log.

## Consequences

**Positive:**
- Eliminates the entire risk category of Munin-induced control system incidents. This is not a mitigated risk — it is a structurally absent risk.
- Dramatically simplifies security certification. A read-only monitoring tool is a fundamentally different regulatory category than a control system component.
- Builds trust with infrastructure operators. The inability to write is demonstrable and verifiable, not just a policy promise.
- Simplifies threat modeling. The system cannot be weaponized to send control commands even if fully compromised by an attacker.
- Reduces liability exposure. If an infrastructure incident occurs, Munin can be definitively excluded as a contributing factor.

**Negative:**
- Limits v1 functionality. Future use cases that involve automated response (e.g., automatically isolating a compromised segment) cannot be implemented without a major architectural change.
- May frustrate operators who want automated remediation. The system can identify a cascading failure in progress but cannot take action to stop it — only alert humans.
- The compile-time flag and static analysis checks add CI complexity and must be maintained as the codebase evolves.

## Alternatives Considered

**Advisory with option to execute:** The system recommends actions and provides a "one-click execute" option that sends commands to OT systems with operator confirmation. This is the most commonly requested feature in early stakeholder conversations. However, the presence of any write path — even behind confirmation dialogs — changes the system's risk profile entirely. A compromised system could auto-confirm. A UI bug could execute without confirmation. The existence of the capability is the risk. Rejected for v1.

**Fully autonomous control:** The system detects threats and automatically executes protective actions without human intervention. This would require safety certification to SIL 2 or higher (IEC 61508), years of validation, and a level of trust in the system's inference engine that is inappropriate at this stage of product maturity. Deploying autonomous control over critical infrastructure based on a statistical correlation engine would be reckless. Rejected categorically.
