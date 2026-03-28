# Munin Intelligence Architecture — Technical Specification

> This document describes the technical architecture of Munin's intelligence system.
> Every layer described here has working code, tests, and pipeline integration in `engine/intelligence/`.
> For the strategic roadmap and implementation timeline, see [AI_ROADMAP.md](AI_ROADMAP.md).

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MUNIN INTELLIGENCE STACK                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 7: Model Governance & Continuous Learning          │  │
│  │  Drift detection · Revalidation · Audit trail · Feedback  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 6: Federated Sovereign Training                    │  │
│  │  Secure aggregation · Differential privacy · Byzantine    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 5: RL Response Optimisation                        │  │
│  │  Strategic agent · Tactical agent · Resource agent        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 4: Sovereign Digital Twin                          │  │
│  │  Multi-physics sim · Data assimilation · Scenario gen     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 3: GNN Cascade Prediction                          │  │
│  │  PI-GN-JODE · Multi-hop · Cross-sector · Transfer        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 2: Physics-Informed Anomaly Detection              │  │
│  │  LSTM-Autoencoder · Physics loss · Confounder-aware       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Layer 1: Statistical Inference (SHIPPED)                 │  │
│  │  Correlation · Lag detection · Evidence windows           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Foundation: Protocol Translation & Ingestion             │  │
│  │  Modbus · DNP3 · OPC UA · CSV historian · Streaming      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

Each layer builds on the ones below. Layer 1 feeds Layer 2, which feeds Layer 3, and so on. The digital twin (Layer 4) sits alongside Layers 2-3, providing training data and simulation environments. Layers 6 and 7 wrap around the entire stack to handle distributed training and operational governance.

---

## Data Flow

```
SCADA Sensors ──► Protocol Translation ──► Normalised Time-Series
                                                    │
                              ┌──────────────────────┤
                              ▼                      ▼
                     Layer 1: Correlation    Layer 2: Anomaly Detection
                     (Shadow Links graph)    (Stress signatures)
                              │                      │
                              └──────┬───────────────┘
                                     ▼
                            Layer 3: GNN Cascade Prediction
                            (Multi-hop failure propagation)
                                     │
                       ┌─────────────┼─────────────┐
                       ▼             ▼             ▼
              Layer 5: RL      Layer 4: Twin    Authorization
              (Response opt)   (Validation)     Packet Generation
                       │             │             │
                       └─────────────┼─────────────┘
                                     ▼
                         Byzantine Multi-Ministry Approval
                         (M-of-N cryptographic signatures)
                                     │
                                     ▼
                              Human Decision
                         (Approve / Modify / Reject)
```

---

## Layer 1: Statistical Inference Engine

**Status**: Production — shipped in v1

Discovers cross-sector dependencies from time-series correlation with lag detection. Handles both positive correlations (co-movement) and inverse correlations (e.g., flood level rises → power drops). Outputs a dependency graph with confidence scores, stability metrics, and evidence windows.

**Key files**: `engine/infer_graph.py`, `engine/sensor_health.py`

### Output Schema

```json
{
  "shadow_link": {
    "source": "reservoir_eden_level",
    "target": "substation_carlisle_load",
    "correlation": 0.87,
    "lag_seconds": 1200,
    "stability": 0.93,
    "confidence": 0.81,
    "physical_type": "hydraulic_to_electrical",
    "correlationSign": "inverse",
    "evidence_window": {
      "start": "2026-01-15T08:00:00Z",
      "end": "2026-01-15T20:00:00Z",
      "support_events": 12,
      "counter_events": 2,
      "confounders": ["shared_rainfall_driver"]
    }
  }
}
```

---

## Layer 2: Physics-Informed Anomaly Detection

**Architecture**: Bidirectional LSTM-Autoencoder → latent space → One-Class SVM

```
Sensor Time-Series (t-W to t)
         │
         ▼
┌─────────────────────┐
│   LSTM Encoder       │  Learns temporal patterns in normal operation
│   (bidirectional)    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Latent Space z     │  Compressed representation of infrastructure state
│   (dim: 32-64)       │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   LSTM Decoder       │  Reconstructs expected sensor readings
│   + Physics Loss     │
└────────┬────────────┘
         │
    ┌────┴────┐
    ▼         ▼
Reconstruction   Physics
Error            Violation
    │              │
    └──────┬───────┘
           ▼
┌─────────────────────┐
│   One-Class SVM      │  Decision boundary for anomaly classification
│   on (error, violation)
└────────┬────────────┘
         │
         ▼
Anomaly Score + Attribution
```

### Physics Loss Functions

| Domain | Physical Law | Loss Term |
|--------|-------------|-----------|
| Hydraulic | Conservation of mass | `ΔQ_in - ΔQ_out - ΔS/Δt ≈ 0` |
| Electrical | Kirchhoff's Current Law | `ΣI_node ≈ 0` |
| Electrical | Power balance | `P_gen ≈ P_load + P_loss` |
| Telecom | Signal attenuation | `P_rx ≤ P_tx - α·d` |
| Telecom | Bandwidth capacity | `allocated ≤ capacity` |

**Key files**: `anomaly/lstm_autoencoder.py`, `anomaly/physics_loss.py`, `anomaly/detector.py`, `anomaly/trainer.py`

**Config**: `AnomalyConfig` — hidden_dim=128, latent_dim=32, window_size=60, physics_lambda=0.1, svm_nu=0.05

---

## Layer 3: GNN Cascade Prediction (PI-GN-JODE)

**Architecture**: Physics-Informed Graph Neural Jump ODE — the core moat.

Given an infrastructure dependency graph and a set of initial failures, it predicts which nodes fail next, how fast, and through what path.

```
Shadow Links Graph (from Layer 1)
+ Node States (from Layer 2 anomaly scores)
                │
                ▼
┌───────────────────────────────┐
│  Edge-Conditioned GNN Encoder  │
│  Message passing with edge-    │
│  conditioned weights. Each     │
│  edge type (hydraulic,         │
│  electrical, telecom) has      │
│  different learned dynamics.   │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│  Neural ODE (continuous)       │
│  dh/dt = f_θ(h, t)            │
│  Continuous stress propagation │
│  with RK4/Euler integration.   │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│  Jump Process (discrete)       │
│  When predicted load > capacity│
│  → trigger protection logic    │
│  → redistribute load           │
│  → re-encode graph state       │
│  → continue ODE                │
└──────────────┬────────────────┘
               │
               ▼
  CascadePrediction:
    - affected_nodes: {node_id: failure_probability}
    - time_to_impact: {node_id: estimated_seconds}
    - cascade_paths: [[node_a, node_b, node_c], ...]
    - uncertainty: MC dropout confidence intervals
```

### Multi-Domain Graph Construction

```
Power Grid          Water Network         Telecom Network
    ●─●─●              ●─●─●                ●─●─●
    │ │ │              │ │ │                │ │ │
    ●─●─●              ●─●─●                ●─●─●

              ▼ Cross-sector edges ▼

                Unified Multi-Domain Graph
                    ●═●─●═●─●
                    ║ │ │ ║ │
                    ●─●═●─●═●

    ═ = Cross-sector dependency (Shadow Link)
    ─ = Intra-sector connection
```

### Uncertainty Quantification

Every cascade prediction includes uncertainty via MC dropout (configurable samples, default 10). Returns mean predictions + standard deviation for each node's failure probability.

**Key files**: `cascade/gnn_encoder.py`, `cascade/neural_ode.py`, `cascade/jump_process.py`, `cascade/predictor.py`

---

## Layer 4: Digital Twin

**Architecture**: Multi-physics simulation with Ensemble Kalman Filter data assimilation

### Physics Engines

| Engine | Equations | Key Variables |
|--------|-----------|---------------|
| Hydraulic | Saint-Venant (simplified) | Flow rate, pressure, reservoir level |
| Electrical | Newton-Raphson power flow | Voltage magnitude, power balance |
| Telecom | Signal attenuation model | Signal strength, bandwidth utilisation |

### Data Assimilation

```
Live SCADA Data ──────────────┐
                              │
Digital Twin State ──────┐    │
                         ▼    ▼
              ┌─────────────────────┐
              │  Ensemble Kalman     │
              │  Filter              │
              │  x_a = x_f + K(y-Hx)│
              │  K = PH^T(HPH^T+R)⁻¹│
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     Updated Twin State     Uncertainty Estimate
     (calibrated to reality) (what we don't know)
```

### Scenario Generation

Monte Carlo + adversarial scenarios. Generates thousands of synthetic multi-sector failure scenarios per hour for ML training. Solves the cold-start problem — you can't train cascade prediction on real disasters (they're rare and catastrophic), but you can train on physically-grounded simulations.

**Key files**: `twin/physics/hydraulic.py`, `twin/physics/electrical.py`, `twin/physics/telecom.py`, `twin/physics/coupling.py`, `twin/kalman_filter.py`, `twin/scenario_generator.py`, `twin/twin_manager.py`

---

## Layer 5: RL Response Optimisation

**Architecture**: Hierarchical RL with three agent levels

```
┌─────────────────────────────────────────┐
│  STRATEGIC AGENT (PPO)                   │
│  Input: Cascade prediction, severity     │
│  Output: Playbook selection, ministry    │
│          routing strategy                │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
┌──────────────────┐  ┌──────────────────┐
│  TACTICAL (SAC)   │  │  RESOURCE (DDPG)  │
│  Auth packet      │  │  Pre-positions    │
│  routing and      │  │  crews, equipment │
│  sequencing       │  │  and barriers     │
└──────────────────┘  └──────────────────┘
```

### Reward Function

Multi-objective balancing response speed, cascade containment, legal compliance, and audit completeness:

```
R = w₁·speed + w₂·containment + w₃·compliance + w₄·audit
```

Where speed penalises authorization latency, containment rewards fewer affected nodes, compliance requires all signatures obtained, and audit rewards complete trails.

**Key files**: `rl/environment.py`, `rl/agents.py`, `rl/reward.py`, `rl/trainer.py`

---

## Layer 6: Federated Sovereign Training

**Why**: Utilities will never share raw SCADA data. Any system requiring centralised data collection is dead on arrival for government adoption.

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│Utility A │  │Utility B │  │Utility C │
│(UK Water)│  │(EU Power)│  │(SG Tele) │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │
     ▼              ▼              ▼
  Local           Local          Local
  Training        Training       Training
     │              │              │
     ▼              ▼              ▼
  + Noise         + Noise        + Noise
  (ε ≤ 1.0)      (ε ≤ 1.0)     (ε ≤ 1.0)
     │              │              │
     └──────────────┼──────────────┘
                    ▼
          ┌─────────────────┐
          │ Secure Aggregator│
          │ + Byzantine      │
          │   filtering      │
          └────────┬────────┘
                   ▼
          Global Model Update
```

### Privacy Guarantees

- ε ≤ 1.0 per round (strong privacy)
- δ ≤ 1/n² where n = training examples
- Rényi Differential Privacy accounting for cumulative budget
- Coordinate-wise median filtering for Byzantine tolerance

**Key files**: `federated/privacy.py`, `federated/participant.py`, `federated/aggregator.py`, `federated/config.py`

---

## Layer 7: Model Governance

| Component | Purpose | Key Metric |
|-----------|---------|------------|
| Model Cards | Standardised documentation per model | Auto-generated from training history |
| Drift Detection | KS test, PSI, KL divergence | Triggers revalidation when drift detected |
| Revalidation | Formal re-testing against thresholds | Precision, recall, FPR gates |
| Feedback Loop | Incidents, operator overrides, near-misses | Feeds back into training signal |
| Audit Trail | SHA-256 hash-chain of all decisions | Tamper-evident, legally defensible |

**Key files**: `governance/model_card.py`, `governance/drift_detector.py`, `governance/revalidation.py`, `governance/feedback.py`, `governance/audit_trail.py`

---

## Pipeline Integration

The demo pipeline (`./demo.sh`) exercises Layers 1-3 + 7:

```
[1] Ingest historian data (CSV → DataFrame)
[2] Shadow Link discovery (Layer 1: correlation + lag)
[3] Evidence window construction
[4] Cascade simulation (exhaustive scenario enumeration)
[5] Authorization packet generation (Merkle-chained, M-of-N)
[6] Anomaly detection (Layer 2: LSTM-AE + physics loss)
[7] GNN cascade prediction (Layer 3: PI-GN-JODE)
[8] Governance audit trail (Layer 7: hash-chain)
```

---

## Test Coverage

33 dedicated ML tests covering all layers. 382 total tests (129 Python + 253 JS).

---

## Compliance Mapping

| Requirement | Source | Munin's Approach |
|-------------|--------|-----------------|
| Rigorous V&V for autonomous systems | DoD Directive 3000.09 | Model cards, adversarial testing, formal revalidation |
| Standardised AI assessment framework | NDAA 2026 | Layer 7 governance, published model cards |
| High-risk AI documentation | EU AI Act | Training data provenance, drift monitoring, audit trail |
| Cross-sector risk assessment | EU CER Directive 2022/2557 | Layers 1-3: automated dependency discovery and cascade prediction |
| Critical infrastructure resilience | US NSM-22 | End-to-end detection to authorized response |
| Privacy-preserving data handling | GDPR | Layer 6: federated learning with differential privacy |

---

## Hardware Requirements

| Context | Spec | Purpose |
|---------|------|---------|
| Demo/Development | 8GB RAM, 4-core CPU | Runs full pipeline on synthetic data |
| Edge Deployment | NVIDIA Jetson AGX Orin, 32GB RAM | Inference for Layers 2-3 per site |
| Central Training | 4x A100 80GB, 512GB RAM | Federated aggregation, scenario generation |

All inference runs locally. No cloud dependency. Air-gap compatible.
