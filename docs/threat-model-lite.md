# Munin Threat Model (Lite)

## Sovereign Credibility

Munin is designed to operate as a **sovereign orchestration layer** for critical infrastructure. This document outlines the security and deployment posture that enables sovereign operation.

## Deployment Modes

### On-Prem OT
- Runs entirely within operational technology network
- No external network dependencies
- Air-gapped capability
- Local inference and decision-making
- Signed update bundles only

### Sovereign Cloud
- Government-controlled cloud infrastructure
- Segmented network architecture
- Encrypted data in transit and at rest
- Audit trail for all operations
- No third-party cloud dependencies

### Lab Demo
- Development and demonstration mode
- May include simulated data
- Not for production use

## Security Posture

### Data Integrity
- Provenance hashing for all data
- Immutable audit logs (append-only)
- Signature verification for updates
- Data integrity monitoring in StatusStrip

### Access Control
- Operator authentication for handshake signing
- Role-based approvals
- Audit trail for all authorizations
- No direct OT hardware writes (actuator boundary)

### Network Segmentation
- Local nodes operate independently
- Degraded connectivity mode
- Offline capability for critical functions
- No single point of failure

### Update Security
- Signed bundle verification
- Model version tracking
- Config hash verification
- Data hash verification

## Threat Mitigations

### Threat: Central System Compromise
**Mitigation**: Local nodes continue operating when central goes dark. Graph browsing, simulation replay, and handshake viewing work offline.

### Threat: Data Tampering
**Mitigation**: Provenance hashes on all data. Immutable audit logs. Append-only log structure prevents retroactive modification.

### Threat: Unauthorized Actions
**Mitigation**: Actuator boundary prevents direct OT writes. All actions require human authorization via signed handshakes.

### Threat: Sensor Data Manipulation
**Mitigation**: Sensor health monitoring detects degradation. Observability scores flag suspicious patterns. Confidence degrades gracefully under attack.

### Threat: Model Poisoning
**Mitigation**: Signed model updates. Version tracking. Config hash verification. Evidence windows provide transparency.

## Audit & Compliance

### Audit Log Structure
- Append-only (immutable)
- Hash-chained for integrity
- Timestamped entries
- Operator identification
- Action descriptions

### Regulatory Compliance
- Regulatory basis mapping in handshakes
- Template-driven citations
- Approval workflows
- Immutable records

## Operational Security

### Principle of Least Privilege
- Operators only sign handshakes
- No direct hardware access
- Role-based approvals
- Audit trail for all actions

### Defense in Depth
- Multiple layers of verification
- Graceful degradation
- Offline capability
- Local node autonomy

## Sovereign Credibility Checklist

✅ Air-gapped operation capability  
✅ No external dependencies for core functions  
✅ Local node autonomy  
✅ Signed update bundles  
✅ Immutable audit logs  
✅ Actuator boundary (no direct OT writes)  
✅ Data integrity monitoring  
✅ Sensor health detection  
✅ Offline capability  
✅ Network segmentation support  

## Future Enhancements

- Hardware security module (HSM) integration for signing
- Multi-party signature schemes
- Zero-knowledge proofs for evidence
- Encrypted evidence packs
- Distributed audit log consensus

