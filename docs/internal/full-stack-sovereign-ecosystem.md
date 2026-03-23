# Sovereign Federation Architecture

Architecture for multi-site, multi-nation Munin deployments with strict sovereignty guarantees.

## Overview

Munin supports **sovereign federation**: multiple independent deployments that can optionally interoperate while maintaining strict sovereignty boundaries.

## Architecture Principles

1. **Sovereignty First**: Each site is fully independent
2. **Air-Gap Default**: No network connections by default
3. **Optional Federation**: Cross-site coordination only when explicitly enabled
4. **Data Minimization**: Only aggregates cross sites, never raw telemetry
5. **Audit Everything**: All cross-site interactions fully audited

## Multi-Site Abstraction

### Site Structure

Each site has:
- **Engine**: Independent pipeline execution
- **Database**: Isolated data storage
- **Vault**: Independent disaster recovery
- **Mesh**: Site-local mesh network

### Site Registry

```json
{
  "site_id": "uk_north",
  "jurisdiction": "UK",
  "capabilities": ["water", "power"],
  "federation_enabled": false,
  "mesh_endpoints": []
}
```

## Cross-Site Communication

### Message Formats

Cross-site messages contain only:
- Aggregated metrics (anonymized)
- Incident summaries (no raw data)
- Playbook metadata (not full playbooks)
- Coordination requests (high-level)

### Security

- Cryptographically signed messages
- PQC signatures
- End-to-end encryption
- Message authentication

## Federation Patterns

### Pattern 1: Aggregated Metrics

Sites share anonymized metrics:
- Total incidents per domain
- Average response times
- System health scores

### Pattern 2: Cross-Border Incidents

For incidents spanning borders:
- High-level incident summaries
- Coordination requests
- Response status updates

### Pattern 3: Shared Playbooks

Optional playbook sharing:
- Playbook metadata only
- No sensitive details
- Version-controlled

## Sovereignty Guarantees

### Data Sovereignty

- Raw telemetry never leaves site
- Only aggregates cross boundaries
- Configurable data policies
- Full audit trail

### Operational Sovereignty

- Each site operates independently
- No central control
- Site-specific policies
- Local decision-making

### Legal Sovereignty

- Per-jurisdiction compliance
- EuroStack audits per site
- Data residency requirements
- Regulatory boundaries respected

## Implementation

### Site Bootstrapping

```bash
# Create new site
python scripts/create_site.py \
  --site-id uk_north \
  --jurisdiction UK \
  --capabilities water,power
```

### Federation Configuration

```yaml
# config/federation.yaml
federation:
  enabled: true
  sites:
    - site_id: uk_north
      endpoint: https://uk-north.munin.sovereign
      allowed_data: ["aggregated_metrics"]
    - site_id: eu_central
      endpoint: https://eu-central.munin.sovereign
      allowed_data: ["incident_summaries"]
```

## Use Cases

### Regional River Basins

Multiple sites coordinate for:
- Flood management across borders
- Water resource sharing
- Emergency response coordination

### Grid Operators

Multiple grid operators coordinate for:
- Frequency stability
- Load balancing
- Emergency response

### Smart Cities

Multiple cities coordinate for:
- Traffic management
- Emergency services
- Resource sharing

## Security Considerations

- **Air-Gap Default**: No network by default
- **Explicit Federation**: Must be explicitly enabled
- **Data Minimization**: Only necessary data shared
- **Audit Everything**: Full audit trail
- **Cryptographic Signatures**: All messages signed
- **PQC Ready**: Post-quantum cryptography

## Future Work

- Cross-site ZKP proofs
- Federated learning (privacy-preserving)
- Cross-site playbook synchronization
- Multi-nation incident coordination
