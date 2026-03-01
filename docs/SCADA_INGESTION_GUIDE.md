# Munin SCADA Data Ingestion Guide

> How Munin inhales data from legacy infrastructure systems without ripping and replacing anything

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LEGACY OT SYSTEMS                                │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Siemens  │  │ Schneider│  │ Honeywell│  │  ABB     │          │
│  │ S7-1500  │  │ M580     │  │ Experion │  │ AC800M   │          │
│  │ (Profibus│  │ (Modbus  │  │ (OPC UA) │  │ (IEC     │          │
│  │  DP)     │  │  TCP)    │  │          │  │  61850)  │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │              │                │
│  ┌────▼──────────────▼──────────────▼──────────────▼────┐          │
│  │           SCADA HISTORIAN                             │          │
│  │  (OSIsoft PI / Wonderware / GE iFIX / eDNA)          │          │
│  │                                                       │          │
│  │  Stores time-series: timestamp, tag_id, value         │          │
│  │  Typical volume: 100K–10M points/day                  │          │
│  └──────────────────────┬───────────────────────────────┘          │
│                          │                                          │
│                    ┌─────▼─────┐                                    │
│                    │ Hardware  │                                    │
│                    │ Data Diode│ (one-way fiber optic)              │
│                    │ (Owl/     │                                    │
│                    │ Waterfall)│                                    │
│                    └─────┬─────┘                                    │
│                          │ (data flows IN only)                     │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              MUNIN SERVER (Air-Gapped)                │          │
│  │                                                       │          │
│  │  ┌─────────────┐    ┌──────────────┐                 │          │
│  │  │ Protocol    │    │ Historian    │                 │          │
│  │  │ Translator  │    │ Connector   │                 │          │
│  │  │ (Modbus,    │    │ (PI, eDNA,  │                 │          │
│  │  │  DNP3, etc) │    │  CSV)       │                 │          │
│  │  └──────┬──────┘    └──────┬──────┘                 │          │
│  │         │                   │                        │          │
│  │         ▼                   ▼                        │          │
│  │  ┌──────────────────────────────┐                   │          │
│  │  │    Normalized Time-Series    │                   │          │
│  │  │    (timestamp, node_id,      │                   │          │
│  │  │     value, quality, source)  │                   │          │
│  │  └──────────────┬───────────────┘                   │          │
│  │                 │                                    │          │
│  │                 ▼                                    │          │
│  │  ┌──────────────────────────────┐                   │          │
│  │  │    Engine Pipeline           │                   │          │
│  │  │    1. Ingest                 │                   │          │
│  │  │    2. Graph Inference        │                   │          │
│  │  │    3. Sensor Health          │                   │          │
│  │  │    4. Incident Simulation    │                   │          │
│  │  │    5. Packet Generation      │                   │          │
│  │  └──────────────────────────────┘                   │          │
│  └──────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Supported Protocols

| Protocol | Standard | Coverage | Typical Use |
|----------|----------|----------|-------------|
| **Modbus RTU/TCP** | IEC 61158 | 40% of industrial devices | PLCs, RTUs, meters |
| **DNP3** | IEEE 1815 | 60% of NA utilities | SCADA masters, substations |
| **Profibus DP/PA** | IEC 61158 | Siemens, ABB plants | Process automation |
| **BACnet/IP** | ISO 16484-5 | Building automation | HVAC, fire systems |
| **OPC UA** | IEC 62541 | Modern SCADA | Universal interop |
| **IEC 61850** | IEC 61850 | Power substations | Protection relays |

### Vendor-Specific Quirks Handled
See `engine/protocol_translator_vendor_quirks.py` for vendor-specific parsing:
- **Siemens S7**: Non-standard Profibus frame headers
- **Schneider M580**: Modbus register offset conventions
- **Honeywell Experion**: OPC UA node ID formatting
- **ABB AC800M**: IEC 61850 GOOSE message parsing
- **GE iFIX**: Proprietary historian export format

---

## Ingestion Methods

### Method 1: Batch CSV Import (Offline/Demo)

Simplest method. Export data from your historian as CSV files.

**Format:**
```csv
timestamp,node_id,value
2026-01-01T00:00:00Z,pump_station_01,1250.0
2026-01-01T00:01:00Z,pump_station_01,1248.0
2026-01-01T00:01:00Z,substation_north_01,50.02
```

**Usage:**
```bash
# Place CSVs in engine/sample_data/
cp /path/to/your/export/*.csv engine/sample_data/

# Run pipeline
npm run engine
# or: python3 engine/run.py
```

**Node ID conventions:**
- Use descriptive IDs: `pump_station_carlisle`, `substation_north_01`
- Include sector keywords for auto-classification: `pump`, `reservoir`, `substation`, `tower`
- Keep consistent across all CSV files

### Method 2: REST API Push (Real-Time)

Push sensor readings directly to Munin's API from your SCADA gateway.

**Single reading:**
```bash
curl -X POST https://munin:3000/api/sensors/data \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "pump_station_01",
    "timestamp": "2026-01-15T14:30:00Z",
    "value": 1245.0,
    "sourceProtocol": "modbus",
    "quality": "GOOD"
  }'
```

**Batch push (recommended for efficiency):**
```bash
curl -X POST https://munin:3000/api/sensors/data \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {"nodeId": "pump_station_01", "timestamp": "2026-01-15T14:30:00Z", "value": 1245.0},
    {"nodeId": "substation_north_01", "timestamp": "2026-01-15T14:30:00Z", "value": 50.02},
    {"nodeId": "reservoir_alpha", "timestamp": "2026-01-15T14:30:00Z", "value": 45.1}
  ]'
```

### Method 3: Historian Connector (Automated)

Connect directly to your SCADA historian for automated data pull.

**Supported historians:**

| Historian | Connector | Status |
|-----------|-----------|--------|
| OSIsoft PI | `PIHistorianConnector` | Architecture defined |
| Wonderware | `WonderwareHistorianConnector` | Architecture defined |
| GE iFIX/eDNA | `GEHistorianConnector` | Architecture defined |
| CSV/Flat File | `CSVHistorianConnector` | ✅ Working |

**Configuration (`config/connectors.yaml`):**
```yaml
connectors:
  - id: pi_water
    type: pi_historian
    connection_string: "PI_SERVER=pi.internal.gov.uk;PI_PORT=5450"
    tags:
      - "PUMP.FLOW.01"
      - "PUMP.FLOW.02"
      - "RESERVOIR.LEVEL.ALPHA"
    polling_interval: 60  # seconds
    node_id_mapping:
      "PUMP.FLOW.01": "pump_station_01"
      "PUMP.FLOW.02": "pump_station_02"
      "RESERVOIR.LEVEL.ALPHA": "reservoir_alpha"

  - id: dnp3_power
    type: dnp3
    connection_string: "TCP:10.0.1.100:20000"
    master_address: 1
    outstation_address: 10
    points:
      - {index: 0, type: "analog_input", node_id: "substation_north_01"}
      - {index: 1, type: "analog_input", node_id: "substation_south_01"}
    polling_interval: 5

  - id: modbus_pumps
    type: modbus_tcp
    connection_string: "TCP:10.0.2.50:502"
    unit_id: 1
    registers:
      - {address: 100, type: "holding", node_id: "pump_station_01", scale: 0.1}
      - {address: 102, type: "holding", node_id: "pump_station_02", scale: 0.1}
    polling_interval: 1

  - id: iec61850_grid
    type: iec61850
    connection_string: "10.0.3.100:102"
    logical_devices:
      - {ld: "PROT", ln: "MMXU1", fc: "MX", node_id: "substation_north_01"}
    polling_interval: 2
```

### Method 4: Protocol Translation (Raw Frames)

For sites where you have raw protocol access (e.g., network tap on the OT bus):

```bash
# Translate raw Modbus TCP frame
curl -X POST https://munin:3000/api/protocol/translate \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "modbus",
    "rawFrame": "01 03 00 64 00 02 C5 CE",
    "sourceAddress": "10.0.2.50:502"
  }'

# Response:
{
  "protocol": "modbus",
  "parsed": {
    "function_code": 3,
    "register_address": 100,
    "register_count": 2,
    "values": [1245, 0]
  },
  "normalized": {
    "timestamp": "2026-01-15T14:30:00Z",
    "node_id": "device_10.0.2.50_reg100",
    "value": 1245,
    "quality": "GOOD",
    "source_protocol": "modbus"
  }
}
```

---

## Ministry Data Feeds

Each government ministry/agency provides different types of data:

### Environment Agency (EA) — Water Sector
```yaml
data_feeds:
  - name: "River Level Monitoring"
    source: "EA Flood Monitoring API (environment.data.gov.uk)"
    protocol: REST API (JSON)
    frequency: 15 minutes
    node_ids:
      - eden_river_level
      - petteril_river_level
      - derwent_river_level
    
  - name: "Reservoir Levels"
    source: "EA Telemetry System"
    protocol: Modbus TCP (from level sensors)
    frequency: 1 minute
    node_ids:
      - reservoir_castle_carrock
      - reservoir_thirlmere

  - name: "Pump Station SCADA"
    source: "United Utilities SCADA Historian (PI)"
    protocol: OSIsoft PI AF SDK
    frequency: 1 second (aggregated to 1 minute)
    node_ids:
      - pump_station_carlisle
      - pump_station_penrith
```

### National Grid ESO — Power Sector
```yaml
data_feeds:
  - name: "Grid Frequency"
    source: "National Grid ESO Balancing Mechanism"
    protocol: IEC 61850 / DNP3
    frequency: 1 second
    node_ids:
      - grid_frequency_national
      - substation_north_carlisle
      - substation_south_carlisle

  - name: "Substation Power Flow"
    source: "Electricity North West SCADA"
    protocol: DNP3 via data diode
    frequency: 2 seconds
    node_ids:
      - substation_penrith_132kv
      - substation_carlisle_33kv
```

### BT/Openreach — Telecom Sector
```yaml
data_feeds:
  - name: "Tower Availability"
    source: "BT Network Management System"
    protocol: SNMP / REST API
    frequency: 5 minutes
    node_ids:
      - tower_carlisle_central
      - tower_penrith_beacon
      
  - name: "Fibre Backbone Health"
    source: "Openreach NOC"
    protocol: OPC UA
    frequency: 1 minute
    node_ids:
      - fibre_carlisle_exchange
```

### NHS / Emergency Services
```yaml
data_feeds:
  - name: "Hospital Power Status"
    source: "Cumberland Infirmary BMS"
    protocol: BACnet/IP
    frequency: 30 seconds
    node_ids:
      - hospital_cumberland_power
      - hospital_cumberland_backup_gen

  - name: "Emergency Service Capacity"
    source: "Cumbria Fire & Rescue CAD"
    protocol: REST API (internal)
    frequency: 5 minutes
    node_ids:
      - fire_station_carlisle_availability
```

---

## Data Quality & Provenance

### Sensor Health Detection

Munin automatically detects degraded sensors before they corrupt the dependency graph:

| Detection | Method | Threshold | Action |
|-----------|--------|-----------|--------|
| **Missingness** | Count NaN/null values | >10% missing | Exclude from graph inference |
| **Stuck-at** | Coefficient of variation | CV < 0.01 | Flag as stuck sensor |
| **Drift** | Mean shift between halves | >2σ shift | Flag as calibration drift |
| **Observability** | Composite score | <0.5 | Mark as low-confidence |

### Provenance Tracking

Every data point is hashed at ingestion time (see `engine/provenance_ledger.py`):

```
data_hash = SHA-256(sensor_id + timestamp + value + source_protocol)
```

This creates a provenance chain that detects:
- **Synthetic corruption**: AI-generated fake sensor data
- **Man-in-the-middle**: Modified values in transit
- **Replay attacks**: Old data re-injected as current

---

## Integration Checklist

For each new data source:

```
□ Identify protocol (Modbus/DNP3/OPC UA/IEC 61850/BACnet/CSV)
□ Map SCADA tags to Munin node IDs
□ Configure connector in config/connectors.yaml
□ Test data flow through data diode (if applicable)
□ Verify sensor health detection works for this data
□ Run graph inference and verify edges make physical sense
□ Document the feed in this guide
□ Add to monitoring dashboard
```

---

## Troubleshooting

### No data arriving
1. Check data diode is powered and fibre is connected
2. Verify protocol connector config matches source
3. Check `GET /api/health/readiness` — data_ingestion should be true
4. Check historian connector logs: `docker compose logs engine`

### Bad correlations in graph
1. Check sensor health: `munin evidence-quality`
2. Verify timestamps are synchronized (NTP within the air-gapped network)
3. Check for stuck-at sensors: `GET /api/sensors/verify`
4. Increase data collection window (need >24 hours for stable correlations)

### Protocol translation errors
1. Check raw frame format matches expected protocol
2. Verify byte order (big-endian vs little-endian)
3. Check register addressing (0-based vs 1-based varies by vendor)
4. See `engine/protocol_translator_vendor_quirks.py` for known issues
