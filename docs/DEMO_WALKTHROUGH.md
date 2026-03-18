---
document-id: DW-001
classification: OFFICIAL
version: 1.0
last-updated: 2026-03-18
---

# Demo Walkthrough

This document walks through Munin's end-to-end pipeline using the Carlisle Storm Desmond flood scenario. The demo takes approximately 30 seconds on commodity hardware and produces a self-contained analysis report.

## Prerequisites

```bash
# Clone and install
git clone https://github.com/jacobsprake/munin.git
cd munin
npm ci
pip install pandas numpy pyyaml
```

## Quick Start (One Command)

```bash
./scripts/munin demo carlisle
```

This runs the full pipeline:

1. **Ingest** - Loads Carlisle Storm Desmond SCADA time series (8 sensors, 2881 samples each)
2. **Graph Inference** - Discovers cross-sector shadow links via temporal correlation with lag detection
3. **Evidence Building** - Constructs evidence windows with quality scores per edge
4. **Cascade Simulation** - Simulates all conceivable failure scenarios from the dependency graph
5. **Packet Generation** - Produces authorization packets with playbook recommendations, M-of-N signing requirements, and Merkle chain receipts

### Expected Output

```
############################################################
#  MUNIN DEMO - Carlisle Flood Event (Storm Desmond style)
############################################################

Loading Carlisle flood data...
Detecting Shadow Links...
  (Found N cross-sector dependencies, M edges total)
Simulating cascade...
  (Testing K scenarios)
Generating playbooks...
  (P packets, Q response options)
Report: engine/out/demo_carlisle/report.md

---  Traditional vs Munin  ---
Traditional response: 2-6 hours
Munin response: X.X seconds
Lives potentially saved: 12-18 (Carlisle Storm Desmond estimate)
Damage reduction: GBP 4.2M -> GBP 800K (estimated containment)

############################################################
#  DEMO COMPLETE - Review output in engine/out/demo_carlisle/
############################################################
```

## Output Files

After the demo, examine `engine/out/demo_carlisle/`:

| File | Description |
|------|-------------|
| `normalized_timeseries.csv` | Unified time series (datetime index, one column per sensor) |
| `graph.json` | Dependency graph with nodes, edges, shadow links, confidence scores |
| `evidence.json` | Evidence windows per edge (correlation, lag, stability, confounders) |
| `incidents.json` | Simulated cascade scenarios with timelines |
| `packets/` | Authorization packets ready for M-of-N signing |
| `report.md` | Self-contained Markdown report |

## Step-by-Step CLI Usage

### 1. Ingest Data

```bash
./scripts/munin ingest engine/sample_data/carlisle_storm_desmond
```

### 2. Build Dependency Graph

```bash
./scripts/munin infer-graph engine/out/normalized_timeseries.csv
```

### 3. Inspect the Graph

```bash
./scripts/munin graph show engine/out/graph.json
```

### 4. Explain a Specific Edge

```bash
./scripts/munin edge explain engine/out/graph.json substation_north pump_station_7
```

This prints: confidence score, lag, stability, whether it's a shadow link, confounder notes, and a human-readable interpretation.

### 5. Simulate Cascades

```bash
./scripts/munin simulate engine/out/graph.json
```

### 6. Verify a Packet

```bash
./scripts/munin packet verify engine/out/packets/packet_0000.json
```

Checks: required fields, multi-sig quorum, Merkle receipt, evidence references, regulatory basis, confidence score.

### 7. Explain a Packet

```bash
./scripts/munin explain engine/out/packets/packet_0000.json
```

Human-readable explanation of the recommendation, regulatory basis, authorization requirements, and uncertainty.

## Advanced: Digital Twin Simulation

```bash
./scripts/munin twin 48
```

Runs a 48-hour digital twin simulation with a substation trip at hour 12. Produces ground-truth dependency graph and cascade timeline for evaluation.

## Advanced: Synthetic SCADA Generation

```bash
./scripts/munin synthetic engine/out/synthetic
```

Generates 72 hours of synthetic Modbus/DNP3-style time series with realistic noise, drift, and cross-sector correlations.

## What to Look At

If you have 10 minutes:
1. Run the demo (`./scripts/munin demo carlisle`)
2. Read `engine/out/demo_carlisle/report.md`
3. Run `./scripts/munin graph show engine/out/demo_carlisle/graph.json`

If you have 30 minutes:
4. Read `docs/SAFETY_CASE.md` and `docs/THREAT_MODEL.md`
5. Run `./scripts/munin edge explain` on a shadow link
6. Inspect a packet with `./scripts/munin packet verify`

## Architecture

```
SCADA Logs (CSV/Modbus/DNP3)
        |
  [Protocol Translation]
        |
  [Normalize to unified time series]
        |
  [Sensor Health Assessment]
        |
  [Graph Inference (correlation + lag)]  -->  Shadow Link Discovery
        |
  [Cascade Simulation]
        |
  [Playbook Matching + Regulatory Basis]
        |
  [Authorization Packet Generation]
        |
  [M-of-N Byzantine Signing]  -->  Merkle Chain  -->  Audit Trail
        |
  [Human Operator Reviews and Approves]
```

**Munin never executes actions. All outputs are advisory. Humans always decide.**
