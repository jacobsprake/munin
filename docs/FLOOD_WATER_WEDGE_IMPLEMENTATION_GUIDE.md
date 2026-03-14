# Munin Flood/Water Wedge: Realistic Implementation Guide

**Document Version:** 2.0  
**Last Updated:** March 2025  
**Purpose:** Realistic documentation for implementing Munin in UK flood and water infrastructure. Munin operates on **live operational telemetry**—the same real-time data streams that control room operators use. This guide covers what must be in place, how Munin operates in that environment, and what it actually does.

---

## Core Principle: Munin Is Live

Munin does **not** run on periodic API polls or batch data. Munin ingests **live operational telemetry**—the continuous stream of sensor readings, pump status, valve positions, river levels, and substation metrics that flow into SCADA historians and control rooms every few seconds. National infrastructure decisions happen in real time; Munin must operate at that timescale.

**Cascade timeline (from Munin thesis):**
- 0 seconds: Substation fails
- 30 seconds: Water pumps lose power
- 2 minutes: Water pressure drops
- 5 minutes: Backup generators fail
- 15 minutes: Critical services affected
- **2–6 hours:** Traditional multi-agency authorization

Munin's job: when an incident is detected, the playbook and handshake packet are **already** generated from pre-simulation. The operator sees the recommendation in seconds, not hours. That requires Munin to be fed the same live data the operators see.

---

## Part 1: The Operational Environment—What Actually Exists

### 1.1 Water/Flood Control Rooms (24/7)

| Organisation | Control Room | Data Source | Update Rate |
|--------------|--------------|-------------|-------------|
| **Environment Agency** | Flood Forecasting Centre (Exeter), National Operations Centre (in development) | Internal telemetry, FONT (Future of National Telemetry) | Real-time; site-dependent (seconds to minutes for critical sites) |
| **Water companies** (Severn Trent, United Utilities, Thames, etc.) | 24/7 "nerve centres" | SCADA historians (AVEVA PI, OSIsoft, Ignition), RTUs, PLCs | 1–10 second polling for control-critical points |
| **Canal & River Trust** | MEICA control | 600+ stations, pumps, sluices | Real-time SCADA |
| **Power (DNOs, NGESO)** | Grid control centres | DNP3, IEC 61850, OPC UA | Sub-second for protection, 1–5 sec for monitoring |

**Reality:** The **public** EA flood API updates every 15 minutes. That is for public-facing apps. The **internal** EA telemetry—the data used by flood duty officers and the Flood Forecasting Centre—flows from RTUs and PLCs at the same rates as any industrial SCADA: typically 1–30 second polling for monitoring, faster for critical control points.

### 1.2 Data Flow: Where Live Data Comes From

```
[Field Sensors] → [RTUs / PLCs] → [SCADA Master / Historian] → [Control Room Displays]
                                        │
                                        ├── AVEVA PI / OSIsoft (time-series archive)
                                        ├── OPC UA server (live subscriptions)
                                        ├── Modbus/DNP3 master (polling)
                                        └── [Data Diode] → Munin
```

**Munin sits on the receive side of a data diode.** Live data flows one-way from the OT network (SCADA/historian) into Munin. Munin never sends commands back.

### 1.3 What "Live" Means in Practice

| Asset Type | Typical Polling/Streaming | Protocol |
|------------|---------------------------|----------|
| Pump status, level alarms | 1–5 seconds | Modbus RTU/TCP, DNP3 |
| River level, flow | 1–15 minutes (site-dependent; critical sites faster) | Telemetry, WITS |
| Substation frequency, load | 1–4 seconds | DNP3, IEC 61850 |
| Gate position, valve state | 1–10 seconds | Modbus, Profibus |
| Historian archive (PI, etc.) | Continuous streaming, event-driven | OPC UA, PI AF SDK, OMF |

**For national infrastructure management:** Munin must receive data at the **fastest rate the OT system provides** for the assets in scope. That is typically 1–10 second resolution for control-critical points.

---

## Part 2: What Must Be in Place for Munin

### 2.1 Network and Physical Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│  OT NETWORK (SCADA, Historian, Control Room)                             │
│                                                                         │
│  [RTUs] [PLCs] [IEDs] ──► [SCADA Master] ──► [Historian: AVEVA PI etc]  │
│                                    │                                     │
│                                    │  Live stream (OPC UA / PI export /  │
│                                    │  Syslog / file push)                │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                              [HARDWARE DATA DIODE]
                              (Owl Talon, Waterfall, etc.)
                              One-way only: OT → Munin
                                     │
┌────────────────────────────────────┼─────────────────────────────────────┐
│  MUNIN NETWORK (Air-gapped)        │                                     │
│                                    ▼                                     │
│  [Munin Ingestion Service] ──► [Munin Engine] ──► [Munin App + API]      │
│         │                              │                                 │
│         │  Continuous                  │  Graph inference,                │
│         │  live feed                  │  incident detection,             │
│         │                             │  playbook matching               │
│         ▼                             ▼                                 │
│  [Normalized time-series]      [Graph, evidence, packets]                │
│                                                                         │
│  [Operator Workstations] ◄── Decision support UI, handshake signing      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Required Components

| Component | Purpose |
|-----------|---------|
| **Live data source** | SCADA historian (AVEVA PI, Ignition, etc.) or OPC UA server exposing the same tags the control room uses |
| **Data diode** | Hardware-enforced one-way link. OT pushes data through diode; Munin receives. No return path. |
| **Ingestion service** | Connects to historian/OPC UA on the Munin side of the diode; writes normalized time-series (timestamp, node_id, value) to Munin's data directory |
| **Munin engine** | Runs continuously: ingest → graph inference (rolling window) → incident detection → playbook matching → packet generation |
| **Munin app** | Serves UI and API to operator workstations; displays recommendations, M-of-N signing |

### 2.3 Data Diode: How Live Data Crosses the Air Gap

The diode has two sides:
- **Send side (OT):** A service reads from the historian/OPC UA and pushes data through the diode (e.g., file transfer, Syslog, or protocol-specific diode support like OPC DA).
- **Receive side (Munin):** A watcher ingests files or streams as they arrive and feeds Munin's pipeline.

**Throughput:** Owl Talon supports 1–100 Gbps. A typical water/flood wedge (hundreds to low thousands of points at 1–10 sec) is well within capacity.

---

## Part 3: How Munin Operates in the Water/Flood Wedge

### 3.1 Continuous Operation (Not Batch)

| Phase | What Happens | Cadence |
|-------|--------------|---------|
| **Ingest** | New telemetry arrives; appended to normalized time-series | Continuous (as data arrives) |
| **Graph inference** | Correlation analysis on rolling window (e.g., last 24–72 hours) | Every N minutes (e.g., 15–60) or on significant new data |
| **Incident detection** | Threshold breaches, alarm conditions, cascade triggers | Real-time (as soon as condition is met) |
| **Playbook matching** | Match current state to pre-simulated scenario | Instant (lookup) |
| **Packet presentation** | Handshake packet with evidence, regulatory basis, M-of-N requirements shown to operators | Instant |

**Key point:** The heavy work (graph inference, scenario simulation) is done **before** the crisis. At crisis time, Munin does a fast lookup: "This live state matches scenario X → here is the pre-approved playbook and packet."

### 3.2 What Munin Does When an Incident Occurs

1. **Detection:** Munin (or the SCADA system feeding it) detects: river level breach, pump trip, substation fault, or other trigger.
2. **State snapshot:** Current telemetry state is captured.
3. **Scenario match:** Munin matches to the nearest pre-simulated scenario (from the exhaustive scenario space built offline).
4. **Retrieval:** Pre-generated playbook and handshake packet are retrieved.
5. **Presentation:** Operators see: recommended actions, evidence bundle, regulatory basis, M-of-N signing requirements.
6. **Authorization:** EA, NGESO, MOD (or subset) sign via Munin. Once threshold met, the packet is authorized.
7. **Execution:** Humans execute—Munin does not send SCADA commands. v1 is read-only and advisory.

### 3.3 What Munin Does Not Do

- Munin does **not** replace SCADA. Operators still use SCADA for monitoring and control.
- Munin does **not** send commands to pumps, valves, or gates. It recommends; humans authorize and execute.
- Munin does **not** require 15-minute API polling. It requires a live feed from the same systems the control room uses.

---

## Part 4: Live Data Ingestion—What Must Be Built

### 4.1 Ingestion Architecture (Realistic)

The current Munin engine expects CSV files in `engine/sample_data/`. For live operation, an **ingestion service** must:

1. **Connect to live source** (on Munin side of diode):
   - OPC UA subscription (if OPC UA is forwarded through diode)
   - PI Web API / PI to PI (if AVEVA PI is on OT side and exports through diode)
   - File watcher (if OT side pushes CSV/JSON files through diode at 1–10 second intervals)

2. **Normalize to Munin format:** `timestamp, node_id, value`

3. **Write continuously** to a rolling buffer or append-only store that the engine reads.

### 4.2 Example: OPC UA Live Subscription

```
OT side: OPC UA server (from SCADA/historian)
         → Diode send service subscribes to tags
         → Pushes through diode (e.g., as JSON messages or batched files)

Munin side: Diode receive buffer
         → Ingestion service reads new data
         → Maps tag IDs to node_ids (config: tag → node_id)
         → Appends to engine/sample_data/live/ or equivalent
         → Engine runs on sliding window of latest data
```

### 4.3 Example: AVEVA PI Stream

```
OT side: PI Data Archive
         → PI to PI interface or OMF export
         → Streams through diode (Owl Talon supports PI transfer)

Munin side: PI connector or OMF consumer
         → Receives stream
         → Maps PI tags to node_ids
         → Feeds engine
```

### 4.4 Node Mapping (Tag → node_id)

| PI Tag / OPC UA Node | Munin node_id | Sector |
|----------------------|---------------|--------|
| `Eden.SandsCentre.Level` | `eden_sands_centre` | Water |
| `Petteril.Botcherby.Level` | `petteril_botcherby` | Water |
| `PumpStation.Carlisle.Flow` | `pump_station_carlisle` | Water |
| `Substation.Willowholme.Frequency` | `substation_south_carlisle` | Power |
| `Reservoir.CastleCarrock.Level` | `reservoir_castle_carrock` | Water |

**Config file:** `engine/config/node_mapping.json` or equivalent—defines the mapping from source tag IDs to Munin's graph node IDs.

---

## Part 5: Hardware and Systems in the Water/Flood Sector

### 5.1 What Exists (No Rip-and-Replace)

| Layer | Typical Hardware | Protocol |
|-------|------------------|----------|
| **Sensors** | Ultrasonic level, pressure transducers, flow meters, inclinometers | 4–20 mA, Modbus |
| **RTUs** | SCADAPack, Aqualog, Rugged Telemetry, Mission MyDro | Modbus RTU/TCP, DNP3, IEC 60870-5-104 |
| **PLCs** | Siemens, Schneider, Allen-Bradley (e.g., Thames Barrier: 52 PLCs) | Modbus, Profibus |
| **SCADA master** | Ignition, Geo SCADA, WinCC, etc. | OPC UA, OPC DA, DNP3 |
| **Historian** | AVEVA PI, OSIsoft, Ignition Historian | PI AF, OPC UA, SQL |
| **Control room** | Industrial workstations, large screens | Same network as SCADA |

Munin plugs in **downstream** of the historian or SCADA master, via the data diode. No changes to sensors, RTUs, or PLCs.

### 5.2 Data Diode Hardware

| Product | Throughput | Use Case |
|---------|------------|----------|
| Owl Talon One | 1 Gbps | Standard deployment |
| Owl Talon Torrent | 100 Gbps | High-density historians |
| Waterfall Unidirectional Security Gate | Variable | Alternative |

**Protocol support (Owl):** OPC DA/A&E, Syslog, file transfer, AVEVA PI transfer, TCP/UDP.

### 5.3 Munin Server

| Spec | Requirement |
|------|-------------|
| OS | Linux (Ubuntu 22.04, RHEL 9) |
| RAM | 16 GB minimum |
| Storage | 100 GB+ (time-series buffer, graph, packets) |
| Network | Connected only to diode receive side; no internet |

---

## Part 6: End-to-End Flow—From Live Data to Authorized Packet

### 6.1 Normal Operation (No Incident)

1. Live telemetry flows: sensors → RTUs → SCADA → historian → diode → Munin.
2. Munin ingests into rolling window (e.g., last 7 days).
3. Graph inference runs periodically (e.g., every hour) on recent data; shadow links and dependencies are updated.
4. Scenario space is pre-computed: single-origin failures, multi-fault, correlated. Playbooks and packets are pre-generated.
5. Operators use SCADA as usual; Munin runs in background.

### 6.2 Incident Occurs (e.g., River Level Breach, Pump Trip)

1. **T+0:** Telemetry shows breach; SCADA alarms.
2. **T+seconds:** Munin's incident detector (or integration with SCADA alarm) triggers.
3. **T+seconds:** Munin matches current state to pre-simulated scenario.
4. **T+seconds:** Pre-generated handshake packet is retrieved and displayed.
5. **T+minutes:** Operators from EA, NGESO, MOD (as required) sign via Munin. M-of-N threshold met.
6. **T+minutes:** Authorized packet is logged; humans execute actions via SCADA (Munin does not execute).

**Latency:** From incident detection to packet presentation: **seconds**. From first signer to authorized: **minutes** (human signing time).

### 6.3 Comparison to Traditional

| Phase | Traditional | With Munin |
|-------|-------------|------------|
| Incident detection | 5–15 min | Same (SCADA) |
| Playbook retrieval | 30–90 min (manual) | **&lt;1 sec** |
| Legal/regulatory review | 30–90 min | **Pre-packaged in packet** |
| Multi-ministry approval | 60–120 min | **&lt;15 min** (pre-validated, just sign) |
| **Total** | **2–6 hours** | **~20–30 min** |

---

## Part 7: Implementation Tasks (Realistic)

### 7.1 Must Build

| Task | Description |
|------|-------------|
| **Live ingestion service** | Connects to OPC UA / PI / file stream on Munin side of diode; normalizes to `timestamp, node_id, value`; feeds engine |
| **Node mapping config** | Tag ID → node_id for all assets in scope |
| **Continuous engine mode** | Engine runs in loop: ingest → graph (periodic) → incident check → packet lookup. Not single-shot batch. |
| **Incident trigger integration** | Either: (a) Munin polls for threshold breaches, or (b) SCADA/alarm system pushes events to Munin via diode |
| **Data diode send/receive config** | Configure OT-side pusher and Munin-side watcher for chosen protocol |

### 7.2 Already Exists in Munin

- Protocol translator (Modbus, DNP3, OPC UA, etc.) for when Munin connects directly to devices
- Graph inference, sensor health, evidence windows
- Incident simulation, scenario space enumeration
- Packet generation, playbook matching
- Ministry CRUD, M-of-N policy, Byzantine multi-sig
- Audit log, RBAC, handshake UI

### 7.3 Integration Points

| System | Integration |
|--------|-------------|
| **Historian (PI, etc.)** | OPC UA subscription or PI export through diode |
| **SCADA alarms** | Event feed through diode (Syslog, JSON) to trigger Munin incident check |
| **Control room** | Munin UI on operator workstations; same network as Munin app |

---

## Part 8: What "National Infrastructure" Implies

### 8.1 Scale

- **Assets:** Hundreds to thousands of nodes (pumps, gauges, substations, reservoirs) in one basin.
- **Data rate:** Thousands of points × 1–10 sec = thousands of values per second aggregate.
- **Graph:** O(n²) correlation; manageable for thousands of nodes with periodic inference.
- **Scenario space:** Pre-computed; crisis-time is lookup, not simulation.

### 8.2 Resilience

- **24/7 operation:** Munin runs continuously; no "business hours" mode.
- **Redundancy:** Server redundancy, diode failover per vendor guidance.
- **Audit:** Every action logged; Merkle chain; M-of-N signatures.

### 8.3 Governance

- **Ministries:** EA, NGESO, MOD (or equivalents) registered; operators linked to ministries.
- **Playbooks:** Pre-validated against regulatory basis; approved before crisis.
- **Signing:** M-of-N from physically separated ministries; no single point of failure.

---

## Part 9: Summary—What Must Be in Place

| Requirement | Description |
|-------------|-------------|
| **Live data feed** | Continuous telemetry from SCADA/historian at 1–10 second resolution (or fastest available) for assets in scope |
| **Data diode** | Hardware one-way link; OT pushes, Munin receives |
| **Ingestion service** | Normalizes live stream to Munin format; feeds engine |
| **Node mapping** | Tag IDs from source system mapped to Munin node_ids |
| **Continuous engine** | Ingest → graph (periodic) → incident detection → playbook lookup |
| **Ministry onboarding** | EA, NGESO, MOD registered; operators created |
| **Pre-simulated scenario space** | Exhaustive scenarios; playbooks and packets pre-generated |
| **Operator workstations** | Munin UI accessible; M-of-N signing in place |

**Munin does not run on 15-minute APIs.** It runs on the same live operational telemetry that control room operators use to manage national infrastructure. The implementation must reflect that.

---

*For deployment mechanics (Docker, secrets, ministry onboarding), see [AIR_GAP_DEPLOYMENT_GUIDE.md](AIR_GAP_DEPLOYMENT_GUIDE.md). For security architecture, see [SECURITY.md](../SECURITY.md).*
