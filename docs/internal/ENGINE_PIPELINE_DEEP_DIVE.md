# Engine Pipeline Deep Dive

Complete technical documentation of the Munin engine pipeline with concrete examples tied to the Carlisle demo.

## Overview

The Munin engine processes infrastructure telemetry through a 5-stage pipeline:

1. **Data Ingestion** - Load and normalize CSV files from SCADA historians
2. **Graph Inference** - Discover dependency relationships via temporal correlation
3. **Sensor Health & Evidence** - Assess sensor quality and build evidence windows
4. **Incident Simulation** - Predict cascading failures with timelines
5. **Handshake Generation** - Create authorized execution packets

## Stage 1: Data Ingestion

### Input Format

CSV files in `engine/sample_data/` with format:
```csv
timestamp,node_id,value
2015-12-05 00:00:00,eden_sands_centre,0.49838292725078887
2015-12-05 00:15:00,eden_sands_centre,0.5575114090748939
```

### Carlisle Example

**Input Files:**
- `engine/sample_data/carlisle/eden_sands_centre.csv` - Eden River water level (288 readings)
- `engine/sample_data/carlisle/petteril_botcherby.csv` - Petteril River water level (288 readings)

**Processing:**
```python
from ingest import ingest_historian_data, normalize_timeseries

df = ingest_historian_data(Path("engine/sample_data/carlisle"))
normalize_timeseries(df, Path("engine/out/normalized_timeseries.csv"))
```

**Output:**
- `engine/out/normalized_timeseries.csv` - Wide-format DataFrame with timestamps as index, node_ids as columns
- Missing values forward-filled then backward-filled
- Timestamps aligned to common index

## Stage 2: Graph Inference

### Algorithm

1. **Correlation Computation**: For each node pair (A, B):
   - Test lag values: `lag ∈ [-300s, +300s]`
   - Compute correlation: `corr(A(t), B(t + lag))`
   - Select lag that maximizes `|correlation|`

2. **Stability Score**: Split time-series into 5 overlapping 24-hour windows:
   - Compute correlation within each window
   - Calculate: `stability = 1 - std(correlations) / mean(|correlations|)`

3. **Edge Creation**: Filter by:
   - `|correlation| >= 0.5` (configurable via `config.min_correlation`)
   - `stability >= 0.3` (configurable via `config.min_stability`)
   - Select top 3 edges per source node (configurable via `config.top_k_edges_per_node`)

### Carlisle Example

**Input:** `engine/out/normalized_timeseries.csv`

**Processing:**
```python
from infer_graph import build_graph
from config import get_config

config = get_config()
build_graph(
    Path("engine/out/normalized_timeseries.csv"),
    Path("engine/out/graph.json"),
    config=config.graph
)
```

**Output:** `engine/out/graph.json`
```json
{
  "nodes": [
    {
      "id": "eden_sands_centre",
      "sector": "water",
      "label": "Eden Sands Centre",
      "kind": "reservoir",
      "region": "north"
    }
  ],
  "edges": [
    {
      "id": "edge_0000",
      "source": "eden_sands_centre",
      "target": "petteril_botcherby",
      "confidenceScore": 0.87,
      "inferredLagSeconds": 45,
      "isShadowLink": true,
      "stabilityScore": 0.72
    }
  ]
}
```

**Shadow Links Detected:** Cross-sector dependencies (e.g., power → water) that exist in physics but aren't documented.

## Stage 3: Sensor Health & Evidence

### Sensor Health Detection

1. **Missingness**: `missing_ratio > 0.1` (10% threshold)
2. **Stuck-At**: Coefficient of variation `CV < 0.01`
3. **Drift**: Mean shift `> 2 * pooled_std` between first and second halves

### Evidence Windows

24-hour windows with:
- Correlation computed per window
- Quality context (missingness, noise, drift)
- Support type (support/counterexample)

### Carlisle Example

**Input:** Normalized time-series + graph edges

**Processing:**
```python
from sensor_health import assess_sensor_health, build_evidence_windows

health = assess_sensor_health(df_normalized)
evidence_windows = build_evidence_windows(df_normalized, graph['edges'])
```

**Output:** `engine/out/evidence.json`
```json
{
  "windows": [
    {
      "id": "ev_0001",
      "sourceNodeId": "eden_sands_centre",
      "targetNodeId": "petteril_botcherby",
      "correlation": 0.87,
      "lagSeconds": 45,
      "robustness": 0.72,
      "supportType": "support"
    }
  ]
}
```

## Stage 4: Incident Simulation

### Cascade Algorithm

```
cascade_timeline = []
impacted_nodes = {initial_failure}

For each time step t:
  For each node in impacted_nodes:
    For each outgoing edge:
      target = edge.target
      lag = edge.lagSeconds
      if t >= lag and target not in impacted_nodes:
        Add target to impacted_nodes
        cascade_timeline.append({
          node: target,
          time: t,
          lag: lag,
          confidence: edge.confidenceScore
        })
```

### Carlisle Example

**Input:** Dependency graph

**Processing:**
```python
from build_incidents import build_incidents

build_incidents(
    Path("engine/out/graph.json"),
    Path("engine/out/incidents.json")
)
```

**Output:** `engine/out/incidents.json`
```json
{
  "incidents": [
    {
      "id": "incident_flood_001",
      "type": "flood",
      "initialFailure": "eden_sands_centre",
      "timeline": [
        {
          "timeSeconds": 0,
          "impactedNodeIds": ["eden_sands_centre"]
        },
        {
          "timeSeconds": 45,
          "impactedNodeIds": ["petteril_botcherby"]
        }
      ]
    }
  ]
}
```

## Stage 5: Handshake Generation

### Packet Structure

```json
{
  "id": "packet_incident_flood_001_20260115120000",
  "version": 1,
  "createdTs": "2026-01-15T12:00:00Z",
  "status": "ready",
  "scope": {
    "regions": ["north"],
    "nodeIds": ["eden_sands_centre", "petteril_botcherby"]
  },
  "situationSummary": "Flood event detected affecting 2 nodes...",
  "proposedAction": "Isolate affected pump stations...",
  "regulatoryBasis": "Complies with 2026 Flood Resilience Act, Section 4.2",
  "playbookId": "flood_event_pump_isolation",
  "evidenceRefs": ["ev_0001"],
  "uncertainty": {
    "overall": 0.13,
    "notes": []
  },
  "approvals": [
    {"role": "EA Duty Officer"}
  ],
  "multiSig": {
    "required": 1,
    "threshold": 1,
    "currentSignatures": 0
  },
  "provenance": {
    "modelVersion": "prototype_v1",
    "configHash": "...",
    "dataHash": "..."
  }
}
```

### Carlisle Example

**Input:** Incidents + graph + evidence + playbooks

**Processing:**
```python
from packetize import packetize_incidents

packetize_incidents(
    Path("engine/out/incidents.json"),
    Path("engine/out/graph.json"),
    Path("engine/out/evidence.json"),
    Path("playbooks"),
    Path("engine/out/packets")
)
```

**Output:** `engine/out/packets/packet_*.json` (one per incident)

## Running the Complete Pipeline

### Command Line

```bash
# Using CLI wrapper
python -m engine.run --data-dir engine/sample_data/carlisle --seed 42

# Or directly
python engine/run.py --data-dir engine/sample_data/carlisle --seed 42
```

### Programmatic

```python
from engine.run import main

main(
    data_dir=Path("engine/sample_data/carlisle"),
    out_dir=Path("engine/out"),
    playbooks_dir=Path("playbooks"),
    seed=42
)
```

## Deterministic Guarantees

The engine pipeline is **fully deterministic** and **reproducible**. Given the same inputs and configuration, it will produce identical outputs across runs.

### Random Number Generation

All randomness is controlled via explicit RNG streams with documented seed derivation:

- **Base Seed**: Configurable via `--seed` CLI argument (default: 42)
- **Ingest Stage**: `base_seed + ingest_seed_offset` (default: base_seed + 0)
- **Graph Inference**: `base_seed + graph_seed_offset` (default: base_seed + 1000)
- **Incident Simulation**: `base_seed + incidents_seed_offset` (default: base_seed + 2000)
- **Synthetic Data**: `base_seed + synthetic_seed_offset` (default: base_seed + 3000)

### Reproducibility

Each run creates a timestamped output directory (`out/run_<timestamp>_seed<seed>/`) containing:
- `config_version.json` - Complete configuration snapshot including seed
- `graph.json`, `evidence.json`, `incidents.json` - Deterministic outputs
- `packets/` - Generated handshake packets

To reproduce a run:
```bash
python -m engine.run --seed 42 --data-dir engine/sample_data/carlisle
```

Use `engine/tools/verify_run_reproducibility.py` to compare two runs bit-for-bit.

See `engine/docs/reproducibility.md` for detailed reproducibility documentation.

## Configuration

All tunable parameters are centralized in `engine/config.py`:

```python
from config import get_config

config = get_config()
print(config.graph.min_correlation)  # 0.5
print(config.graph.max_lag_seconds)  # 300
print(config.sensor_health.max_missing_ratio)  # 0.1
```

## Deterministic Execution

The pipeline is deterministic when run with the same seed:

```bash
python -m engine.run --seed 42  # Same inputs → same outputs
python -m engine.run --seed 42  # Identical results
```

## Logging

Structured JSON logs are written to `engine/out/engine_log.jsonl`:

```json
{"timestamp": "2026-01-15T12:00:00Z", "run_id": "...", "level": "INFO", "phase": "ingest", "message": "Phase started: ingest", "data": {...}}
{"timestamp": "2026-01-15T12:00:05Z", "run_id": "...", "level": "INFO", "phase": "ingest", "message": "Phase completed: ingest", "data": {"duration_seconds": 5.2, "rows": 576}}
```

## Performance

Benchmark results are saved to `engine/out/perf_profile.json`:

```bash
python engine/benchmark_performance.py
```

Typical performance:
- 100 nodes, 1000 samples: < 1 second
- 1000 nodes, 10000 samples: ~10 seconds
- 10000 nodes, 100000 samples: ~5 minutes

## Testing

Run tests:
```bash
# Unit tests
pytest engine/tests/test_ingest.py -v

# Property-based tests
pytest engine/tests/test_infer_graph_properties.py -v

# Golden fixture regression tests
pytest engine/tests/test_golden_fixtures.py -v
```

## Next Steps

See the [100-Step Roadmap](../.cursor/plans/munin-100-step-roadmap_d9062531.plan.md) for production hardening, shadow mode, sovereign features, and pilot readiness.
