# Carlisle Flood Monitoring Demo Setup

This guide explains how to set up and run the Munin demo using real Environment Agency (EA) flood monitoring data from the River Eden system in Carlisle.

## Overview

The Carlisle demo validates Munin's **coordination latency reduction** thesis using:
- **Real EA flood telemetry** from two stations (Eden at Sands Centre, Petteril at Botcherby Bridge)
- **Historical replay** of Storm Desmond (Dec 6, 2015) - a high-consequence flood event
- **Flood gate coordination playbook** demonstrating faster authorized execution

## Prerequisites

1. **Python 3.8+** with required packages:
   ```bash
   pip install pandas requests
   ```

2. **Network access** to EA flood monitoring API:
   - Base URL: `https://environment.data.gov.uk/flood-monitoring`
   - No API key required (open data)

3. **Munin engine** dependencies (see `engine/requirements.txt`)

## Quick Start

### 1. Run the Demo

```bash
cd engine
python carlisle_demo.py
```

This will:
1. Fetch historical data for Storm Desmond (Dec 5-7, 2015)
2. Ingest data into Munin format
3. Run dependency graph inference
4. Trigger flood gate coordination playbook
5. Generate handshake packets with audit trail
6. Display performance metrics

### 2. Fetch Data Manually

To fetch data for a custom date range:

```python
from engine.ea_flood_client import fetch_carlisle_stations_data
from datetime import datetime
from pathlib import Path

start_date = datetime(2015, 12, 5)
end_date = datetime(2015, 12, 7, 23, 59, 59)
data_dir = Path("engine/sample_data/carlisle")
cache_dir = Path("engine/cache/ea_api")

results = fetch_carlisle_stations_data(
    start_date=start_date,
    end_date=end_date,
    output_dir=data_dir,
    cache_dir=cache_dir
)
```

## Station Configuration

### Carlisle Stations

| Station | EA ID | Node ID | Location |
|---------|-------|---------|----------|
| River Eden at Sands Centre | 762600 | `eden_sands_centre` | Sands Centre, Carlisle |
| River Petteril at Botcherby Bridge | 764070 | `petteril_botcherby` | Botcherby Bridge, Carlisle |

### Thresholds

Configured in `engine/carlisle_config.py`:

- **Eden (Sands Centre)**:
  - Flood Warning: 2.5m
  - Flood Alert: 3.0m
  - Critical: 3.5m

- **Petteril (Botcherby)**:
  - Flood Warning: 1.8m
  - Flood Alert: 2.2m
  - Critical: 2.5m

**Note**: These thresholds are examples. Adjust based on actual historical data analysis.

## Playbook: Flood Gate Coordination

The playbook (`playbooks/carlisle_flood_gate_coordination.yaml`) demonstrates:

1. **Trigger Conditions**:
   - River level exceeds flood warning threshold
   - Rainfall rate exceeds threshold (10mm/hour)

2. **Automated Actions**:
   - Assess flood severity
   - Coordinate flood gate operations
   - Notify local authorities (EA, Council, Highways, Comms)
   - Activate highways coordination
   - Continuous monitoring

3. **Approval Requirements**:
   - **EA Duty Officer**: Single tick-box approval (minimum sign-off)
   - **Council Emergency Officer**: Notification only (warning level)

4. **Metrics**:
   - **Time-to-authorize**: Target < 2 minutes (baseline: 2-6 hours)
   - **Time-to-task**: Target < 1 minute (baseline: 30-60 minutes)
   - **Coordination latency**: Target < 5 minutes (baseline: 1-3 hours)

## Data Format

### Input Format (EA API)

EA API returns readings in JSON format:
```json
{
  "items": [
    {
      "dateTime": "2015-12-06T10:15:00Z",
      "value": 2.85
    }
  ]
}
```

### Munin Format

Converted to Munin time-series format:
```csv
timestamp,node_id,value
2015-12-06T10:15:00Z,eden_sands_centre,2.85
2015-12-06T10:30:00Z,eden_sands_centre,2.92
```

## Output Files

After running the demo:

```
engine/out/carlisle_demo/
├── normalized_timeseries.csv    # Normalized time-series data
├── graph.json                    # Dependency graph
├── evidence.json                 # Evidence windows
├── incidents.json                # Simulated incidents
└── packets/                      # Handshake packets
    ├── packet_001.json
    └── ...
```

## API Endpoints

### Fetch EA Data

```bash
# Get station info
curl http://localhost:3000/api/ea-flood/fetch?stationId=762600

# Fetch data (use Python script directly)
python engine/carlisle_demo.py
```

### Ingest Sensor Data

```bash
# POST sensor readings
curl -X POST http://localhost:3000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "eden_sands_centre",
    "timestamp": "2015-12-06T10:15:00Z",
    "value": 2.85
  }'
```

## Storm Desmond Replay

The demo replays Storm Desmond (Dec 6, 2015) - a high-consequence flood event:

- **Event Date**: December 6, 2015
- **Replay Window**: Dec 5-7, 2015
- **Historical Context**: Record flood levels on River Eden system
- **Validation**: Compare Munin response time vs actual response time

## Troubleshooting

### No Data Fetched

1. **Check API connectivity**:
   ```bash
   curl https://environment.data.gov.uk/flood-monitoring/id/stations/762600.json
   ```

2. **Verify station IDs** in `engine/carlisle_config.py`

3. **Check date range** - EA API may have limited historical data

### Missing Dependencies

```bash
pip install -r engine/requirements.txt
pip install pandas requests
```

### Cache Issues

Clear cache directory:
```bash
rm -rf engine/cache/ea_api/*
```

## Next Steps

1. **Adjust Thresholds**: Analyze historical data to set accurate flood thresholds
2. **Add Rainfall Data**: Integrate EA rainfall telemetry as leading indicator
3. **Expand Stations**: Add Caldew station for full confluence coverage
4. **Real-Time Feed**: Set up periodic polling for live data
5. **Performance Analysis**: Compare Munin metrics vs baseline in detail

## References

- **EA Flood Monitoring API**: https://environment.data.gov.uk/flood-monitoring/doc/reference
- **Check for Flooding**: https://check-for-flooding.service.gov.uk/
- **Carlisle Stations**:
  - [Eden at Sands Centre](https://check-for-flooding.service.gov.uk/station/5171)
  - [Petteril at Botcherby Bridge](https://check-for-flooding.service.gov.uk/station/5214)

## Files Created

- `engine/ea_flood_client.py` - EA API client
- `engine/carlisle_config.py` - Station configuration
- `engine/carlisle_demo.py` - Demo orchestration script
- `playbooks/carlisle_flood_gate_coordination.yaml` - Flood coordination playbook
- `app/api/ea-flood/fetch/route.ts` - API route for EA data
