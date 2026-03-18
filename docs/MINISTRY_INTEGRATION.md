# Munin: Ministry Integration Architecture

Classification: OFFICIAL -- SENSITIVE

Version: 1.0
Last revised: 2026-03-18
Owner: Critical Infrastructure Directorate

---

## 1. System Context: Where Munin Sits

Munin occupies Purdue Level 3.5 -- the demilitarised zone between operational
technology networks (Levels 0-3) and the enterprise/ministry networks (Levels 4-5).
It has no southbound control path. It observes infrastructure; it does not command it.

### 1.1 Deployment Topology

```
                          MINISTRY NETWORKS (Purdue Level 4-5)
  .---------------------------------------------------------------------------
  |                                                                           |
  |   Ministry of               Ministry of            Ministry of            |
  |   Interior /                Infrastructure /        Defence                |
  |   Civil Protection          Transport               (Liaison only)         |
  |        |                         |                       |                 |
  |        +------------+------------+-----------+-----------+                 |
  |                     |                        |                             |
  |              Operator Consoles         Environment Agency                  |
  |              (read-only views)         (flood/seismic feeds)               |
  |                     |                        |                             |
  '---------------------+------------------------+-----------------------------'
                        |
              =====================
              | MINISTRY FIREWALL |   (Purdue Level 4 boundary)
              =====================
                        |
  .---------------------+-------------------------------------------------.
  |                 MUNIN ANALYSIS ENCLAVE  (Purdue Level 3.5)             |
  |                                                                        |
  |   +------------------+    +-------------------+    +-----------------+ |
  |   | Inference Engine  |    | Graph Store        |    | Packet Manager  | |
  |   | (shadow link      |    | (time-series +     |    | (playbook match,| |
  |   |  detection,       |    |  dependency graph)  |    |  M-of-N quorum) | |
  |   |  cascade model)   |    |                    |    |                 | |
  |   +------------------+    +-------------------+    +-----------------+ |
  |            |                        |                       |          |
  |            +------------+-----------+-----------+-----------+          |
  |                         |                                              |
  |                  Ingestion Service                                     |
  |                  (unified schema only)                                 |
  '-------------------------+----------------------------------------------'
                            |
                  ======================
                  | HARDWARE DATA DIODE |   (unidirectional, no return path)
                  ======================
                            |
  .-------------------------+-----------------------------------------------.
  |              COLLECTOR TIER  (Purdue Level 3)                            |
  |                                                                          |
  |  +------------------+  +------------------+  +------------------+        |
  |  | Collector:        |  | Collector:        |  | Collector:        |       |
  |  | Regional Water    |  | Regional Power    |  | Regional Telecom  |       |
  |  | Authority         |  | Grid Operator     |  | Provider          |       |
  |  |                   |  |                   |  |                   |       |
  |  | Modbus TCP/RTU    |  | DNP3, IEC 61850   |  | SNMP, BACnet      |       |
  |  | -> unified schema |  | -> unified schema |  | -> unified schema |       |
  |  +------------------+  +------------------+  +------------------+        |
  |         |                      |                      |                  |
  '---------+----------------------+----------------------+------------------'
            |                      |                      |
      +-----------+          +-----------+          +-----------+
      | Water     |          | Power     |          | Telecom   |
      | SCADA     |          | SCADA     |          | NMS       |
      | Historians|          | Historians|          | Historians|
      +-----------+          +-----------+          +-----------+
        (Level 2)              (Level 2)              (Level 2)
```

### 1.2 Ministry Consumers

| Ministry / Agency              | Role in Munin Workflow                        |
|-------------------------------|-----------------------------------------------|
| Interior / Civil Protection   | Primary operator. Reviews packets, approves.  |
| Infrastructure / Transport    | Co-signatory for transport-related cascades.  |
| Defence                       | Liaison observer. Escalation for hostile acts. |
| Environment Agency            | Provides flood/seismic sensor feeds upstream.  |

No ministry has write access to OT systems through Munin. All ministry
interaction is confined to reviewing evidence, signing packets, and
coordinating response through existing operational channels.

---

## 2. Collector Architecture

### 2.1 Per-Utility Collector

Each regional utility hosts a hardened Munin Collector appliance. The collector
performs three functions:

1. **Protocol translation.** Speaks the utility's native SCADA protocol(s) --
   Modbus TCP, Modbus RTU, DNP3, OPC UA, IEC 61850 MMS/GOOSE, BACnet, SNMP --
   and converts readings into Munin's unified schema. Implementation in
   `engine/protocol_translator.py`.

2. **Normalisation.** Every reading becomes a record conforming to the unified
   schema:

   ```
   {
     "timestamp":        "2026-03-18T14:32:01.000Z",   // ISO 8601, UTC
     "node_id":          "WTR-REG04-PUMP-017",          // hierarchical asset ID
     "value":            3.42,                           // engineering units
     "quality_flag":     "GOOD",                         // GOOD | SUSPECT | BAD
     "protocol_source":  "modbus_tcp",                   // originating protocol
     "site_id":          "REG04-WATER"                   // deployment site
   }
   ```

3. **Batched one-way export.** Normalised records are signed, compressed, and
   pushed through the data diode in configurable batches (default: every 60
   seconds). The connector logic is in `engine/connector_runner.py`.

### 2.2 IEC 62443 Zone/Conduit Compliance

Munin's collector architecture maps directly to IEC 62443-3-3 zones and conduits:

- **Zone: Utility OT** (Security Level 3). The SCADA historians and RTUs.
  Munin collectors reside here but have read-only access to historian databases.
  No write-back path exists.

- **Conduit: Collector to Enclave** (Security Level 4). A unidirectional conduit
  enforced by a hardware data diode. The diode physically prevents any signal
  from travelling southbound. Where a hardware diode is not available, a
  heavily firewalled link with connection-initiation restricted to the
  collector side is used, with compensating monitoring controls.

- **Zone: Munin Enclave** (Security Level 4). Air-gapped or network-isolated.
  Receives normalised data only. Has no knowledge of utility credentials,
  SCADA command syntax, or control paths.

### 2.3 What Collectors Do Not Do

Collectors never:
- Issue SCADA commands (no write function codes, no control requests).
- Store utility credentials beyond what is needed for historian read access.
- Accept inbound connections from the Munin enclave or any ministry network.
- Transmit raw SCADA protocol traffic across the data diode.

---

## 3. Operational Workflows

### 3.1 Normal Day: Steady-State Monitoring

```
Utility SCADA       Munin Collector       Data Diode       Munin Enclave       Operator Console
     |                    |                    |                  |                    |
     |--sensor readings-->|                    |                  |                    |
     |                    |--normalise-------->|                  |                    |
     |                    |                    |--batch (signed)->|                    |
     |                    |                    |                  |--run inference---->|
     |                    |                    |                  |  (rolling window)  |
     |                    |                    |                  |--update graph----->|
     |                    |                    |                  |                    |
     |                    |                    |                  |  No anomalies      |
     |                    |                    |                  |  detected.         |
     |                    |                    |                  |                    |
     |                    |                    |                  |--dashboard: GREEN->|
     |                    |                    |                  |                    |
     |                    |                    |                  |  Operator notes    |
     |                    |                    |                  |  "all clear" in    |
     |                    |                    |                  |  shift log.        |
```

No action is required from operators. The dashboard shows sector-by-sector
health. Operators log confirmation of review at shift handover.

### 3.2 Flood Incident: Cascade Detection and Response

```
Environment       Munin           Munin Enclave         Ministry 1        Ministry 2        Operator
Agency Feed       Collector       (Inference Engine)    (Interior)        (Infrastructure)  Console
     |                |                  |                    |                 |                |
     |--flood gauge -->|                  |                    |                 |                |
     |  anomaly        |--normalise------>|                    |                 |                |
     |                 |                  |                    |                 |                |
     |                 |                  |--detect anomaly--->|                 |                |
     |                 |                  |  (sensor drift,    |                 |                |
     |                 |                  |   shadow link to   |                 |                |
     |                 |                  |   pump station)    |                 |                |
     |                 |                  |                    |                 |                |
     |                 |                  |--predict cascade-->|                 |                |
     |                 |                  |  (pump failure ->  |                 |                |
     |                 |                  |   road flooding -> |                 |                |
     |                 |                  |   telecom outage)  |                 |                |
     |                 |                  |                    |                 |                |
     |                 |                  |--match playbook--->|                 |                |
     |                 |                  |--generate packet-->|                 |                |
     |                 |                  |                    |                 |                |
     |                 |                  |  Packet: "Pre-position pumps,       |                |
     |                 |                  |  reroute traffic on A-roads,        |                |
     |                 |                  |  alert telecom for generator."      |                |
     |                 |                  |                    |                 |                |
     |                 |                  |                    |--review-------->|                |
     |                 |                  |                    |--sign (1/2)---->|                |
     |                 |                  |                    |                 |--review------->|
     |                 |                  |                    |                 |--sign (2/2)--->|
     |                 |                  |                    |                 |                |
     |                 |                  |  Quorum met (2-of-2).               |                |
     |                 |                  |  Packet status: AUTHORIZED.         |                |
     |                 |                  |                    |                 |                |
     |                 |                  |--------------------------------------------packet-->|
     |                 |                  |                    |                 |       execute  |
     |                 |                  |                    |                 |       via OT   |
     |                 |                  |                    |                 |       channels |
```

The operator executes actions through existing utility control channels.
Munin does not issue commands to OT equipment.

### 3.3 Training Exercise: Digital Twin Scenario

```
Exercise           Munin Enclave        Operator         Scoring
Controller         (Digital Twin)       Console          System
     |                  |                    |                |
     |--inject scenario |                    |                |
     |  (simulated      |                    |                |
     |   sensor data)-->|                    |                |
     |                  |                    |                |
     |                  |--run inference---->|                |
     |                  |--generate packet-->|                |
     |                  |                    |                |
     |                  |                    |--review------->|
     |                  |                    |--sign/reject-->|
     |                  |                    |                |
     |                  |  Log operator decision.            |
     |                  |  Compare to expected response.     |
     |                  |                    |                |
     |                  |--score------------|--------------->|
     |                  |                    |                |
     |  Exercise marked COMPLETE.            |                |
     |  No real-world actions taken.         |                |
```

Training exercises are visually distinguished from live operations by a
persistent banner on operator consoles. All exercise data is tagged with
`exercise_id` and excluded from production analytics.

---

## 4. Authorisation Chain: Packet Lifecycle

A Munin response packet passes through a strictly ordered chain of custody.
Each transition is cryptographically logged in an append-only Merkle chain.

### 4.1 Packet States

```
  DRAFT -> EVIDENCE_ATTACHED -> SUPERVISOR_REVIEWED -> SIGNED(1) -> ... -> QUORUM_MET -> AUTHORIZED -> ACTED
    |            |                     |                   |                    |            |          |
    |            |                     |                   |                    |            |          |
    v            v                     v                   v                    v            v          v
  Engine      Engine adds          Enclave supervisor   Ministry            Required       Packet     Operator
  generates   supporting           validates evidence   signatories         number of      released   confirms
  draft       evidence graphs,     completeness,        review and          signatures     to         actions
  packet.     sensor data,         checks confidence    apply digital       reached.       operator   taken and
              uncertainty          thresholds.          signature.                         console.   logs
              bounds.                                                                                outcome.
```

### 4.2 Detailed Steps

| Step | Actor                  | Action                                              | Logged Fields                                    |
|------|------------------------|------------------------------------------------------|--------------------------------------------------|
| 1    | Inference Engine       | Generates draft packet with recommended actions.     | `packet_id`, `timestamp`, `cascade_model_hash`   |
| 2    | Inference Engine       | Attaches evidence: sensor traces, graph snapshots,   | `evidence_hash`, `confidence_score`,              |
|      |                        | confidence intervals, uncertainty bounds.             | `uncertainty_bounds`                              |
| 3    | Enclave Supervisor     | Reviews evidence for completeness. Checks that       | `supervisor_id`, `review_timestamp`,              |
|      |                        | confidence meets ministry-defined thresholds.        | `threshold_check_result`                          |
| 4    | Ministry Signatory 1   | Reviews packet. Signs with ministry-issued digital   | `signatory_1_id`, `signature_1`,                  |
|      |                        | certificate. May attach notes.                       | `signatory_1_timestamp`, `notes`                  |
| 5    | Ministry Signatory 2   | Reviews packet. Signs with ministry-issued digital   | `signatory_2_id`, `signature_2`,                  |
|      |                        | certificate. May attach notes.                       | `signatory_2_timestamp`, `notes`                  |
| ...  | Additional signatories | As required by packet severity classification.       | (same structure per signatory)                    |
| N    | Quorum Logic           | Verifies M-of-N signatures collected. Transitions    | `quorum_policy`, `quorum_met_timestamp`           |
|      |                        | packet to AUTHORIZED.                                |                                                  |
| N+1  | Operator               | Receives authorised packet. Executes actions         | `operator_id`, `action_timestamp`,                |
|      |                        | through existing OT channels. Logs outcome.          | `outcome`, `deviations`                           |

### 4.3 Rejection Path

At any stage, an authorised actor may reject the packet:

- The rejection reason is recorded in the Merkle chain.
- The packet transitions to `REJECTED` state.
- The inference engine logs the rejection for model improvement.
- Operators are free to take alternative action through normal channels.

### 4.4 Merkle Chain Integrity

Every state transition appends a record to the packet's Merkle chain:

```
  Hash(N) = SHA-256( Hash(N-1) || actor_id || action || timestamp || payload_hash )
```

The chain is append-only. Tampering with any intermediate record invalidates
all subsequent hashes. Auditors can independently verify the full chain at
any time.

---

## Appendix A: Referenced Source Files

| File                            | Purpose                                          |
|---------------------------------|--------------------------------------------------|
| `engine/protocol_translator.py` | Protocol adaptation layer (Modbus, DNP3, etc.)   |
| `engine/connector_runner.py`    | Collector orchestration and batch export          |
| `engine/inference.py`           | Shadow link detection and cascade prediction      |
| `engine/packet_manager.py`     | Packet generation, quorum tracking, Merkle chain  |

---

*End of document.*
