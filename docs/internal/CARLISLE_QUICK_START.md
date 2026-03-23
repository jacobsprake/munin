# Carlisle Demo - Quick Start

## Run the Demo (3 Steps)

### 1. Install Dependencies
```bash
pip install -r engine/requirements.txt
```

### 2. Run Demo Script
```bash
cd engine
python carlisle_demo.py
```

### 3. Review Output
Check `engine/out/carlisle_demo/` for:
- `graph.json` - Dependency graph
- `packets/` - Handshake packets with audit trail
- Performance metrics in console output

## What It Does

1. **Fetches** historical EA flood data for Storm Desmond (Dec 5-7, 2015)
2. **Ingests** data into Munin format
3. **Infers** dependency graph between Eden and Petteril stations
4. **Triggers** flood gate coordination playbook when thresholds exceeded
5. **Generates** handshake packets with:
   - Automated task assignments
   - Single tick-box approval (EA Duty Officer)
   - Audit trail
   - Performance metrics (time-to-authorize, time-to-task)

## Key Metrics

- **Time-to-authorize**: < 2 minutes (vs 2-6 hours baseline)
- **Time-to-task**: < 1 minute (vs 30-60 minutes baseline)
- **Coordination latency**: < 5 minutes (vs 1-3 hours baseline)

## Files

- **Config**: `engine/carlisle_config.py`
- **Playbook**: `playbooks/carlisle_flood_gate_coordination.yaml`
- **Client**: `engine/ea_flood_client.py`
- **Demo**: `engine/carlisle_demo.py`

## Stations

- **Eden at Sands Centre** (762600) - Main river
- **Petteril at Botcherby Bridge** (764070) - Urban tributary

## Troubleshooting

**No data fetched?**
- Check internet connection
- Verify EA API is accessible: `curl https://environment.data.gov.uk/flood-monitoring/id/stations/762600.json`

**Missing dependencies?**
- `pip install pandas requests pyyaml numpy`

**Cache issues?**
- Delete `engine/cache/ea_api/` and re-run

For detailed setup, see [CARLISLE_DEMO_SETUP.md](./CARLISLE_DEMO_SETUP.md).
