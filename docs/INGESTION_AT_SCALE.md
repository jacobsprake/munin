# Munin: Ingestion at Scale

Classification: OFFICIAL -- SENSITIVE

Version: 1.0
Last revised: 2026-03-18
Owner: Critical Infrastructure Directorate

---

## 1. Protocol Unification

### 1.1 The Problem

National critical infrastructure runs on decades of accumulated vendor
choices. A single region may operate:

- **Water:** Modbus TCP to modern PLCs, Modbus RTU over serial to legacy
  pump controllers, BACnet for building-integrated water treatment.
- **Power:** DNP3 for substation automation, IEC 61850 MMS for protection
  relays, IEC 61850 GOOSE for fast bus-transfer signalling.
- **Telecom:** SNMP for network element management, OPC UA for newer
  fibre-optic monitoring systems.

Munin does not attempt to speak every protocol centrally. Instead, protocol
translation happens at the edge, inside each utility's network boundary.

### 1.2 Adapter Model

Each Munin Collector runs one or more protocol adapters, selected during
site commissioning. Adapters are implemented as pluggable modules within
`engine/protocol_translator.py`. The current adapter inventory:

| Adapter            | Protocols Handled                        | Typical Deployment       |
|--------------------|------------------------------------------|--------------------------|
| `modbus_tcp`       | Modbus TCP, Function Codes 03/04         | Water, power, HVAC       |
| `modbus_rtu`       | Modbus RTU over RS-485/232               | Legacy pump stations     |
| `dnp3`             | DNP3 (TCP and serial)                    | Power substations        |
| `iec61850_mms`     | IEC 61850 MMS (Manufacturing Message)    | Protection relays        |
| `iec61850_goose`   | IEC 61850 GOOSE (multicast)              | Fast bus transfer        |
| `bacnet`           | BACnet/IP, BACnet MSTP                   | Building management      |
| `opc_ua`           | OPC UA (binary, no discovery service)    | Modern SCADA gateways    |
| `snmp_v2c`         | SNMP v2c GET/GETBULK                     | Telecom NMS              |
| `snmp_v3`          | SNMP v3 (authPriv)                       | Secure telecom NMS       |

### 1.3 Unified Schema

Regardless of source protocol, every adapter emits records conforming to
this schema:

```json
{
  "timestamp":        "ISO 8601, UTC, millisecond precision",
  "node_id":          "string, hierarchical asset identifier",
  "value":            "number, in engineering units",
  "quality_flag":     "enum: GOOD | SUSPECT | BAD | STALE",
  "protocol_source":  "string, adapter name (e.g. modbus_tcp)",
  "site_id":          "string, deployment site identifier"
}
```

**Design rationale.** The Munin inference engine and graph store operate
exclusively on this unified schema. They have no knowledge of Modbus
registers, DNP3 data objects, or OPC UA node hierarchies. This decoupling
means:

- Adding a new protocol requires only a new adapter, not changes to the core.
- The inference engine can correlate readings across protocols without
  translation logic.
- Security review of the core is simplified: it processes a single, well-
  defined data format.

### 1.4 Quality Flags

Quality flags are mapped from protocol-native quality indicators:

| Flag     | Meaning                                                     |
|----------|-------------------------------------------------------------|
| `GOOD`   | Reading is within expected range and freshly acquired.      |
| `SUSPECT`| Reading arrived but failed a plausibility check (e.g.,     |
|          | value outside configured engineering bounds).               |
| `BAD`    | Adapter could not acquire the reading (comms failure,       |
|          | device error, CRC mismatch).                                |
| `STALE`  | No new reading received within the configured timeout.      |

The inference engine treats `SUSPECT` and `BAD` readings as reduced-weight
evidence. `STALE` readings trigger a separate sensor-health alert pathway.

---

## 2. Scaling Model

### 2.1 Single-Instance Capacity

A single Munin instance (inference engine + graph store + packet manager)
is sized for regional deployment:

- **Sensor streams:** up to 10,000 concurrently tracked nodes.
- **Ingestion rate:** 1-minute polling intervals per node (configurable
  down to 15 seconds for critical assets, up to 5 minutes for low-priority
  environmental sensors).
- **Inference window:** rolling window, default 15 minutes. The engine
  re-evaluates the dependency graph each window cycle using the most recent
  readings.

### 2.2 Horizontal Scaling by Region

For national-scale deployments covering multiple regions:

```
  Region North          Region South          Region East
  Munin Instance        Munin Instance        Munin Instance
       |                     |                     |
       +----------+----------+----------+----------+
                  |                     |
            Meta-Inference Layer
            (cross-region shadow links,
             national-level cascade detection)
                  |
           National Operator Console
```

Each regional instance operates independently. The meta-inference layer
receives summarised graph state (not raw sensor data) from each region
and detects cross-regional dependencies -- for example, a power grid
failure in one region affecting water treatment in an adjacent region.

### 2.3 Federation Protocol

Regional instances export to the meta-inference layer:

- **Graph summaries:** node states, edge weights, and detected shadow
  links, refreshed each inference cycle.
- **Alert summaries:** any packets generated, with severity and sector
  classification.
- **Health telemetry:** collector availability, data freshness metrics.

Raw sensor time-series data stays within the regional instance. This
limits bandwidth requirements and respects data sovereignty constraints
where regions fall under different administrative jurisdictions.

---

## 3. Data Volume Analysis

### 3.1 Raw Ingestion

Assumptions for a regional deployment:

| Parameter          | Value                           |
|--------------------|---------------------------------|
| Sensor streams     | 10,000                          |
| Polling interval   | 60 seconds (1 reading/min)      |
| Record size        | ~120 bytes (JSON, compressed)   |
| Readings per day   | 10,000 x 1,440 = 14,400,000    |

**Daily raw volume:**

```
  14,400,000 readings x 120 bytes = 1.73 GB/day (compressed JSON)
  At 8 bytes per value (binary time-series format): ~115 MB/day values only
  With full schema overhead (binary, indexed): ~4.6 GB/day
```

At 4.6 GB/day, a single 2 TB drive holds over 400 days of raw data
before rotation. In practice, raw data older than 90 days is archived
to cold storage and only graph summaries are retained online.

### 3.2 Inference Compute

The inference engine detects shadow links by computing pairwise
correlations across sensor streams within the rolling window.

**Naive approach:**

```
  10,000 nodes -> C(10000, 2) = 49,995,000 pairs (~50M)
  Each correlation: ~200 floating-point operations
  Total per window: ~10 billion FLOPs
  At 15-minute windows: ~11 GFLOPS sustained
```

This is feasible on a single modern CPU but wasteful.

**Pruned approach (production):**

Munin exploits sector locality. Sensors are grouped by sector (water,
power, telecom) and geographic proximity. Cross-sector correlations are
only computed for nodes that share a geographic zone or have known
physical dependencies.

```
  Intra-sector pairs per sector (3 sectors, ~3,300 nodes each):
    C(3300, 2) = ~5.4M pairs x 3 sectors = ~16.3M pairs

  Cross-sector pairs (geographic proximity, ~5% of cross-product):
    3,300 x 3,300 x 3 sector-pairs x 0.05 = ~1.6M pairs

  Total pruned pairs: ~18M (vs. 50M naive)

  With further temporal pruning (only re-evaluate edges whose
  constituent nodes show value changes beyond noise threshold):
    Typical active pairs per window: ~500,000
```

At 500,000 active pairs, inference completes in under 2 seconds on
commodity server hardware (8-core, 64 GB RAM). This leaves ample
headroom within the 15-minute window.

### 3.3 Graph Store Sizing

The dependency graph stores:

| Component          | Estimated Size (10K nodes)   |
|--------------------|------------------------------|
| Node metadata      | ~2 MB                        |
| Edge weights       | ~20 MB (500K active edges)   |
| Shadow link history| ~50 MB (30-day rolling)      |
| Inference snapshots| ~100 MB (one per window)     |

Total graph store footprint: under 200 MB in memory. This fits
comfortably in a single server's RAM, with disk-backed persistence
for durability.

---

## 4. Security Posture

### 4.1 Principle: No Inbound Connections to OT

The foundational security constraint is simple: no network connection
is ever initiated from the Munin enclave (or any ministry network)
toward operational technology systems.

```
  OT Network                    Munin Enclave
  (Purdue 0-3)                  (Purdue 3.5)

  Collector -----> Data Diode -----> Ingestion Service

  (outbound only)  (physically      (receives only)
                    unidirectional)
```

There is no return path. The data diode enforces this at the physical
layer. Even if the Munin enclave were fully compromised, an attacker
could not send a single bit southbound through a correctly installed
hardware data diode.

### 4.2 Where Data Diodes Are Not Available

Some deployments may lack budget for hardware data diodes. In these
cases, the following compensating controls apply:

1. **Connection direction enforcement.** Firewalls at both the collector
   and enclave boundaries permit only collector-initiated outbound TCP
   connections to the enclave ingestion service. No listening ports face
   the OT network.

2. **Application-layer validation.** The ingestion service accepts only
   records conforming to the unified schema. Any malformed input is
   dropped and logged. There is no command channel, no RPC interface,
   no interactive protocol.

3. **Network monitoring.** An independent network tap monitors the link
   for any southbound traffic. Any detected southbound packet triggers
   an immediate alert and automatic link severance.

4. **Quarterly audit.** Firewall rules and network flow logs are reviewed
   quarterly by an independent assessor against the approved conduit
   policy.

### 4.3 Data-in-Transit Integrity

All data leaving a collector is signed using a per-collector ECDSA key
(P-256). The ingestion service verifies signatures before processing.
This ensures:

- **Authenticity.** Data originated from a registered collector.
- **Integrity.** Data was not modified in transit.
- **Non-repudiation.** Each batch can be traced to a specific collector
  and timestamp.

Key management follows the enclave's HSM-backed PKI. Collector keys are
provisioned during site commissioning and rotated annually.

### 4.4 What Never Crosses the Boundary

The following data types are explicitly prohibited from crossing the
OT/IT boundary in either direction:

| Prohibited Southbound         | Prohibited Northbound                |
|-------------------------------|--------------------------------------|
| SCADA commands                | Utility employee PII                 |
| Control setpoints             | Credentials or authentication tokens |
| Firmware or software updates  | Utility commercial data              |
| Configuration changes         | Raw protocol traffic (pre-adapter)   |
| Any executable content        | Unschematised data of any kind       |

### 4.5 Incident Response Isolation

If a security incident is detected within the Munin enclave:

1. The enclave is isolated from ministry networks (firewall kill switch).
2. Collectors continue to operate and buffer data locally.
3. The enclave can be rebuilt from signed configuration without
   affecting OT operations.
4. At no point during incident response is any southbound connection
   to OT systems established.

---

## Appendix: Capacity Planning Reference

| Deployment Scale | Sensors  | Instances | Daily Volume | Hardware Profile          |
|------------------|----------|-----------|--------------|---------------------------|
| Municipal        | 1,000    | 1         | ~0.5 GB      | 4-core, 16 GB RAM, 500 GB |
| Regional         | 10,000   | 1         | ~4.6 GB      | 8-core, 64 GB RAM, 2 TB   |
| National (small) | 50,000   | 5 + meta  | ~23 GB       | 5x regional + coordinator |
| National (large) | 200,000  | 20 + meta | ~92 GB       | 20x regional + coordinator|

All figures assume 1-minute polling intervals and 90-day online retention.

---

*End of document.*
