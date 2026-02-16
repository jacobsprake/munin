# Plug-and-Play Deployment Guide

Complete guide for deploying Munin on-premises with zero hardware replacement.

## Overview

Munin's plug-and-play architecture allows deployment on existing infrastructure without "rip-and-replace". Universal protocol translators enable Munin to ingest data from any legacy industrial protocol.

## Prerequisites

1. **Hardware**: Any server meeting minimum specs (see below)
2. **Network**: Access to SCADA/OT network (via data diode recommended)
3. **Data Access**: Read access to historian data (CSV files or protocol endpoints)
4. **Permissions**: Ability to install Munin Edge Node on network

## Minimum Requirements

- **CPU**: 4 cores (8 recommended)
- **RAM**: 16GB (32GB recommended)
- **Storage**: 100GB SSD (500GB recommended)
- **Network**: 1Gbps (10Gbps recommended)
- **OS**: Linux (Ubuntu 22.04 LTS or RHEL 8+)

## Deployment Modes

### Mode 1: Demo (Development)

- No air-gap enforcement
- Software TEE simulation
- Local database
- Full logging

**Use Case**: Development, testing, demonstrations

### Mode 2: Pilot (Shadow Mode)

- Air-gap verification enabled
- TEE simulation (or hardware if available)
- Shadow mode active (passive observation)
- 6-12 month evaluation period

**Use Case**: Risk-free pilot deployments

### Mode 3: Production

- Hardware data diode required
- Real TEE hardware required
- Full Byzantine quorum enabled
- Physical verification enabled

**Use Case**: Live critical infrastructure

### Mode 4: War-Emergency

- CMI Protocol activated
- Maximum security (all survival layer features)
- Ministry of Defense authorization required
- Resource prioritization enabled

**Use Case**: National emergency scenarios

## Step-by-Step Deployment

### Step 1: Install Munin

```bash
# Download Munin package
wget https://munin.sovereign/releases/munin-v1.0.0.tar.gz
tar -xzf munin-v1.0.0.tar.gz
cd munin

# Run installation script
./install.sh --mode pilot --air-gap-enabled
```

### Step 2: Configure Protocol Connectors

Edit `config/protocol_connectors.yaml`:

```yaml
protocols:
  - name: modbus
    enabled: true
    vendor: Siemens
    polling_interval: 1.0
    endpoints:
      - address: 192.168.1.100
        port: 502
        device_ids: [1, 2, 3]
  
  - name: dnp3
    enabled: true
    vendor: Schweitzer Engineering
    polling_interval: 2.0
    endpoints:
      - address: 192.168.1.101
        port: 20000
  
  - name: opc_ua
    enabled: true
    vendor: Siemens
    endpoints:
      - url: opc.tcp://192.168.1.102:4840
        security_policy: Basic256Sha256
```

### Step 3: Configure Data Diode

Edit `config/data_diode.yaml`:

```yaml
mode: hardware_diode
hardware_device_path: /dev/diode0
simulation_mode: false  # Set to true for development
inbound_allowed: true
outbound_blocked: true
```

### Step 4: Configure Air-Gap Verification

Run air-gap verification wizard:

```bash
python -m munin.airgap.verify --wizard
```

This will:
1. Test DNS resolution (should fail in air-gap)
2. Test external connectivity (should fail)
3. Verify network interface configuration
4. Generate air-gap certificate

### Step 5: Initialize Engine

```bash
# Run engine pipeline
python -m engine.run \
  --data-dir /path/to/historian/data \
  --out-dir /var/munin/output \
  --seed 42
```

### Step 6: Verify Deployment

```bash
# Check engine status
curl http://localhost:3000/api/engine/status

# Check TEE status
curl http://localhost:3000/api/tee/status

# Check air-gap status
curl http://localhost:3000/api/airgap/verify

# Check protocol connectors
curl http://localhost:3000/api/protocol/translate
```

## Protocol Translation

### Supported Protocols

- **Modbus RTU/TCP**: Siemens, Schneider, Honeywell, Allen-Bradley, ABB
- **DNP3**: Schweitzer Engineering, GE, ABB, Siemens
- **Profibus DP/PA**: Siemens, ABB, Phoenix Contact
- **BACnet/IP**: Johnson Controls, Honeywell, Siemens, Schneider
- **OPC UA**: All major vendors
- **IEC 61850**: Siemens, ABB, GE, Schweitzer Engineering

### Auto-Detection

Munin can auto-detect protocols from frame characteristics:

```python
from engine.protocol_translator import ProtocolLibrary

library = ProtocolLibrary()
detected = library.auto_detect_protocol(frame)
```

### Manual Configuration

If auto-detection fails, specify protocol manually:

```yaml
protocol: modbus
vendor: Siemens
node_mapping:
  "40001": "pump_01"
  "40002": "pump_02"
```

## Data Diode Configuration

### Hardware Data Diode

For production deployments, use hardware data diodes:
- **Owl Cyber Defense**: Unidirectional Security Gateways
- **Waterfall Security**: Unidirectional Gateways
- **Fox-IT**: Data Diode Solutions

Configuration:
```yaml
mode: hardware_diode
hardware_device_path: /dev/diode0
device_type: owl_cyber_defense
serial_number: OWL-001-ABC123
```

### Software Enforcement

For development/testing:
```yaml
mode: software_enforced
simulation_mode: true
iptables_rules: true
```

## EuroStack Compliance

Run sovereignty audit:

```bash
python -m engine.eurostack_sovereign --audit
```

This checks:
- Software library origins
- Cloud service dependencies
- Hardware component sources
- Cryptographic algorithm compliance

Target: **FULLY_SOVEREIGN** (zero foreign proprietary dependencies)

## Health Checks

### Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/health/readiness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/health/liveness
    port: 3000
  initialDelaySeconds: 60
  periodSeconds: 30
```

## Troubleshooting

### Protocol Translation Fails

1. Check protocol connector logs: `tail -f /var/munin/logs/protocol_translator.log`
2. Verify network connectivity to SCADA endpoints
3. Check vendor-specific protocol settings
4. Test with protocol emulator: `python engine/tests/test_protocol_translator.py`

### Air-Gap Verification Fails

1. Verify network interface configuration
2. Check DNS resolution (should fail)
3. Test external connectivity (should fail)
4. Review data diode configuration

### TEE Not Available

1. Check CPU support: `grep -i sgx /proc/cpuinfo`
2. Enable simulation mode: `TEE_USE_REAL_HARDWARE=false`
3. Verify TEE drivers installed

## Next Steps

- See [Operations Runbook](./OPERATIONS_RUNBOOK.md) for day-to-day operations
- See [Shadow Mode Pilot Playbook](./SHADOW_MODE_PILOT_PLAYBOOK.md) for pilot deployments
- See [100-Step Roadmap](../.cursor/plans/munin-100-step-roadmap_d9062531.plan.md) for advanced features
