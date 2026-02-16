# Engine Pipeline Reproducibility Guide

## Overview

The Munin engine pipeline is designed to be **fully deterministic** and **reproducible**. Given the same inputs and configuration, the pipeline will produce identical outputs across runs.

## Deterministic Guarantees

### Random Number Generation

All randomness in the engine is controlled via explicit RNG streams with documented seed derivation:

- **Base Seed**: Configurable via `--seed` CLI argument (default: 42)
- **Ingest Stage**: `base_seed + ingest_seed_offset` (default: base_seed + 0)
- **Graph Inference**: `base_seed + graph_seed_offset` (default: base_seed + 1000)
- **Incident Simulation**: `base_seed + incidents_seed_offset` (default: base_seed + 2000)
- **Synthetic Data**: `base_seed + synthetic_seed_offset` (default: base_seed + 3000)

### Seed Derivation

Each stage uses its own RNG stream to ensure:
1. **Isolation**: Changes to one stage don't affect others
2. **Reproducibility**: Same base seed → same outputs
3. **Traceability**: Seed derivation is documented and logged

### Sources of Randomness

The following operations use deterministic RNG:

1. **Graph Inference** (`infer_graph.py`):
   - Health score generation (seeded by node_id hash)
   - Edge selection when multiple candidates exist

2. **Synthetic Scenarios** (`synthetic_scenarios.py`):
   - Random failure selection
   - Cascade path selection
   - All uses `synthetic_seed_offset`

3. **Degradation Injection** (`degradation_injector.py`):
   - Missing value injection (seeded by node_id)
   - Uses `synthetic_seed_offset`

4. **Digital Twin** (`sovereign_digital_twin.py`):
   - Failure simulation (seeded by edge + scenario)
   - Uses deterministic RNG

5. **Physics Ingest** (`physics_ingest.py`):
   - Baseline spectrum generation (fixed seed for demos)

## Reproducing a Run

### Method 1: Using Same Seed

```bash
python -m engine.run --seed 42 --data-dir engine/sample_data/carlisle
```

Running with the same seed and same input data will produce identical outputs.

### Method 2: Replay Mode

```bash
python -m engine.run --replay-run engine/out/run_20260115_120000/engine_log.jsonl
```

Replay mode reads the log from a previous run and reproduces it exactly.

### Method 3: Using Config File

```bash
python -m engine.run --config engine/configs/deterministic_config.json
```

The config file includes the seed and all parameters, ensuring reproducibility.

## Configuration Versioning

Each run snapshots its configuration:

- **Config Version**: `ENGINE_CONFIG_VERSION` (currently "1.0.0")
- **Config Snapshot**: Saved to `out/run_<id>/config_version.json`
- **Config Metadata**: Includes seed, timestamps, and full config dict

## Verifying Reproducibility

### Bit-for-Bit Comparison

Use `verify_run_reproducibility.py`:

```bash
python engine/tools/verify_run_reproducibility.py \
  --run1 engine/out/run_20260115_120000 \
  --run2 engine/out/run_20260115_120001
```

This tool compares:
- `graph.json` (node/edge counts, IDs, confidence scores)
- `evidence.json` (window counts, correlations)
- `incidents.json` (incident IDs, timelines)
- `packets/` (packet IDs, signatures)

### Floating-Point Tolerance

Small floating-point differences (< 1e-10) are expected due to:
- Different hardware (CPU instruction ordering)
- Different Python versions
- Different NumPy versions

The verification tool uses configurable tolerances for floating-point comparisons.

## Deterministic Constraints

### What IS Deterministic

- Node and edge IDs
- Correlation scores (within floating-point precision)
- Incident ordering
- Packet generation
- Timeline structure

### What MAY Vary (Acceptable)

- Floating-point precision (last few decimal places)
- File write timestamps
- Log entry timestamps (if not using fixed time)

### What MUST NOT Vary

- Number of nodes/edges
- Incident IDs
- Packet IDs
- Correlation signs and magnitudes (within tolerance)
- Cascade timelines (node ordering)

## Troubleshooting Non-Reproducibility

If runs with the same seed produce different outputs:

1. **Check Config Version**: Ensure `ENGINE_CONFIG_VERSION` matches
2. **Check Input Data**: Verify input CSVs are identical
3. **Check Python/NumPy Versions**: Different versions may produce different results
4. **Check Random Calls**: Ensure all randomness uses `config.rng` streams
5. **Check File System**: Ensure no race conditions in file writes

## Best Practices

1. **Always specify seeds**: Use `--seed` explicitly in production
2. **Snapshot configs**: Save config files with each run
3. **Version control**: Track `ENGINE_CONFIG_VERSION` changes
4. **Test reproducibility**: Run verification tool in CI
5. **Document changes**: Update this doc when adding new randomness sources

## Example: Reproducing Storm Desmond Analysis

```bash
# Original run
python -m engine.run \
  --seed 42 \
  --data-dir engine/sample_data/carlisle \
  --out-dir engine/out/storm_desmond_original

# Reproduce exactly
python -m engine.run \
  --seed 42 \
  --data-dir engine/sample_data/carlisle \
  --out-dir engine/out/storm_desmond_reproduced

# Verify
python engine/tools/verify_run_reproducibility.py \
  --run1 engine/out/storm_desmond_original \
  --run2 engine/out/storm_desmond_reproduced
```

Expected result: All outputs match (within floating-point tolerance).
