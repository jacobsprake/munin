# Munin Wedge Setup: Ready for Tomorrow

This guide covers what's built and how to run Munin for the flood/water wedge.

---

## What's Ready

| Component | Status |
|-----------|--------|
| **Sensor → Engine** | `sensor_readings` DB + `data/munin.db` merged into engine ingest |
| **Recursive CSV** | Engine reads all `**/*.csv` under `engine/sample_data/` |
| **Export API** | `GET /api/ingestion/export?hours=168` writes `engine/sample_data/live/readings.csv` |
| **Connector runner** | Polls EA API (when enabled), pushes to `POST /api/sensors/data` |
| **Incident check** | `POST /api/incidents/check` — real-time threshold + scenario match + packet |
| **Continuous engine** | `npm run engine:continuous` — pipeline every 5 min |
| **Diode watcher** | `engine/diode_receive_watcher.py` — watches dir, pushes to API |

---

## Quick Start (Demo)

```bash
# 1. Install and run engine once
npm run engine

# 2. Start app
npm run dev

# 3. Open http://localhost:3000
# - /graph, /simulation, /handshakes, /ministries, /decisions
```

---

## Wedge Setup (Live Data)

### Option A: EA API + Connectors (when network allowed)

1. Copy and edit connectors:
   ```bash
   cp config/connectors.example.yaml config/connectors.yaml
   # Edit: set ea_flood_api enabled: true, add stations
   ```

2. Start app and connectors:
   ```bash
   npm run dev &
   npm run connectors:continuous
   ```

3. Run engine (continuous):
   ```bash
   npm run engine:continuous
   ```

### Option B: Push from SCADA/Historian

1. Push to Munin API from your gateway:
   ```bash
   curl -X POST http://localhost:3000/api/sensors/data \
     -H "Content-Type: application/json" \
     -d '[{"nodeId":"pump_station_carlisle","timestamp":"2025-03-15T12:00:00Z","value":1150.0}]'
   ```

2. Run engine (it reads from `data/munin.db` + CSV):
   ```bash
   npm run engine:continuous
   ```

### Option C: Data Diode (Air-Gapped)

1. On **send side** (OT network): Export CSV/JSON to diode send directory.
2. **Hardware diode** transfers files to receive directory.
3. On **Munin side**:
   ```bash
   export MUNIN_DIODE_RECEIVE_DIR=/path/to/diode/receive
   PYTHONPATH=engine python engine/diode_receive_watcher.py
   ```
4. Watcher pushes new files to `POST /api/sensors/data`.
5. Run engine continuously.

---

## Real-Time Incident Check

When thresholds are breached or you want to match current state to a scenario:

```bash
# Using latest from engine output + sensor_readings
curl -X POST http://localhost:3000/api/incidents/check

# With explicit live state
curl -X POST http://localhost:3000/api/incidents/check \
  -H "Content-Type: application/json" \
  -d '{"liveState":{"eden_sands_centre":3.2,"pump_station_carlisle":1100}}'
```

Response includes `breached`, `liveMatch`, `packet` for M-of-N signing.

---

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run engine` | Run pipeline once |
| `npm run engine:continuous` | Run pipeline every 5 min |
| `npm run connectors` | Run connectors once |
| `npm run connectors:continuous` | Poll EA API every 5 min, push to API |

---

## Data Flow

```
[EA API / SCADA / CSV] 
       │
       ├─► Connector runner ─► POST /api/sensors/data ─► sensor_readings
       │
       └─► Diode send ─► [Hardware] ─► Diode receive ─► Watcher ─► POST /api/sensors/data
                                                                        │
                                                                        ▼
Engine run.py ◄── ingest (CSV + sensor_readings from data/munin.db)
       │
       ▼
graph.json, incidents.json, packets/
       │
       ▼
POST /api/incidents/check ─► Match + Packet for operators
```

---

## Ministry Onboarding

Before M-of-N signing, register ministries:

```bash
# See docs/AIR_GAP_DEPLOYMENT_GUIDE.md
curl -X POST http://localhost:3000/api/ministries \
  -H "Content-Type: application/json" \
  -d '{"name":"Environment Agency","code":"EA","type":"government","jurisdiction":"UK"}'
# Repeat for NGESO, MOD
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| No graph/incidents | Run `npm run engine`; ensure `engine/sample_data/` has CSV |
| Incident check empty | Run engine once; ensure `engine/out/incidents.json` exists |
| Connectors not pushing | App must be running; check `config/connectors.yaml` enabled |
| DB not found | App creates `data/munin.db` on first API access |
