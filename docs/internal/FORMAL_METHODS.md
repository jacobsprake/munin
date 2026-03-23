# Formal Methods for Munin

Formal verification and property-based testing for critical Munin invariants.

## Overview

Formal methods ensure correctness of critical algorithms:

- **Graph Inference**: No self-loops, confidence bounds
- **Counterfactuals**: Monotonicity, bounds preservation
- **CMI Prioritization**: Safety and liveness properties
- **Quorum Logic**: Byzantine fault tolerance guarantees
- **Safety PLC**: Physical invariant enforcement

## Property-Based Testing

### Hypothesis Tests

All critical algorithms have property-based tests:

- `test_infer_graph_properties.py` - Graph invariants
- `test_determinism_properties.py` - Deterministic execution
- `test_counterfactual_properties.py` - Counterfactual correctness

### Key Properties

1. **No Self-Loops**: Graph never has node → node edges
2. **Confidence Bounds**: All confidence scores in [0, 1]
3. **Determinism**: Same seed → same outputs
4. **Monotonicity**: Acting earlier never makes damage worse
5. **Safety**: Quorum logic prevents unauthorized actions

## Formal Models

### TLA+ Specifications

TLA+ models for:
- Quorum logic (byzantine fault tolerance)
- Safety PLC (physical invariant enforcement)
- CMI prioritization (asset tier ordering)

### Alloy Models

Alloy models for:
- Graph structure invariants
- Packet generation constraints
- Audit log integrity

## Verification

### Model Checking

Use TLA+ TLC model checker to verify:
- Safety properties (no bad states reachable)
- Liveness properties (eventually reach good states)
- Invariants (always maintain properties)

### Property Tests

Run property-based tests in CI:
```bash
pytest engine/tests/test_*_properties.py -v
```

## Key Invariants

### Graph Inference

- No self-loops
- Confidence scores in [0, 1]
- Lag bounds within max_lag_seconds
- Stability scores in [0, 1]

### Counterfactuals

- Monotonicity: earlier action → better outcome (under assumptions)
- Bounds: damage prevented ≥ 0
- Consistency: same inputs → same outputs

### CMI Prioritization

- Tier 1 assets always preserved
- Tier ordering maintained
- Emergency levels affect prioritization correctly

### Quorum Logic

- Safety: M-of-N signatures required
- Liveness: Eventually authorize with correct signatures
- No unauthorized actions possible

## Future Work

- Complete TLA+ models for all critical algorithms
- Automated invariant checking in CI
- Formal proofs of key properties
- Integration with runtime verification
