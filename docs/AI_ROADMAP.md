# Munin Intelligence Roadmap

Munin is designed to get smarter over time. Every incident, near-miss, and simulation feeds back into a system that progressively learns to predict infrastructure failures faster, recommend responses earlier, and compress authorization latency further. This document describes the intelligence architecture from its current statistical foundation through to fully learned, sovereign-grade decision support.

For technical implementation details, see [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md).

---

## Design Philosophy

Three principles govern Munin's approach to AI:

1. **Interpretability is non-negotiable.** Government authorization packets must include human-readable evidence chains. No black-box recommendations. Every prediction traces back to observable data through a documented reasoning path.

2. **Physics before parameters.** Infrastructure obeys physical laws — water flows downhill, power propagates at known speeds, telecom signals attenuate with distance. We encode these constraints directly into our models rather than hoping neural networks learn them from data. Physics-informed architectures outperform pure ML on infrastructure prediction tasks and require orders of magnitude less training data.

3. **Sovereign by design.** Utilities and governments will not share raw SCADA data with a third party. Munin's intelligence layer uses federated learning to train across jurisdictions without centralizing sensitive infrastructure telemetry. Models improve globally while data stays local.

---

## Layer 1: Statistical Inference (Shipped)

**What it does**: Discovers infrastructure dependencies ("Shadow Links") using temporal correlation analysis with lag detection.

**How it works**:
- Ingests time-series data from SCADA/historian systems (Modbus, DNP3, OPC UA)
- Computes pairwise correlation across all sensor pairs with configurable lag windows (±300s)
- Handles both positive and inverse correlations (e.g., flood rises → power drops)
- Filters by sensor health (missingness, stuck-at detection, drift scoring)
- Scores stability across overlapping time windows
- Generates evidence windows with support/counterexample classification

**Why this is right for v1**:
- Fully deterministic and auditable — every Shadow Link includes raw evidence
- No training data required — works on any infrastructure from day one
- Proven on real Environment Agency flood data (Eden/Petteril rivers, Carlisle catchment) with 0.971 confidence

**Limitations** (addressed in subsequent layers):
- Pairwise only — cannot discover multi-hop cascade paths
- Correlation ≠ causation — confounders can produce spurious links
- No learning — same data produces same output forever

---

## Layer 2: Physics-Informed Anomaly Detection (Implemented)

**What it does**: Detects infrastructure stress signatures before failure using learned models of normal behaviour, constrained by physical laws.

**Architecture**: LSTM-Autoencoder → Physics Loss → One-Class SVM → Confounder Filter

**Why physics-informed**:
- Pure autoencoders on SCADA data achieve ~90% detection but 15-20% FPR (unacceptable for operational alerts)
- Physics regularisation reduces FPR to <5% by preventing the model from flagging physically normal but statistically unusual states
- Reference: Improved Autoencoder approaches for ICS anomaly detection on the SWaT testbed

**Output**: Anomaly scores per sensor with explainable attribution (which features drove the anomaly, what physical constraint was violated, confidence interval)

---

## Layer 3: GNN Cascade Prediction (Implemented)

**What it does**: Predicts cascading infrastructure failures across sectors — not just which assets are connected (Layer 1), but which failures propagate, how fast, and through what path.

**Architecture**: Physics-Informed Graph Neural Jump ODE (PI-GN-JODE)

This is the core intelligence that makes Munin unlike anything in the market:

- **Edge-Conditioned GNN Encoder**: Takes the Shadow Links graph with node state vectors (sensor readings, health scores, anomaly flags from Layer 2)
- **Neural ODE for Continuous Redistribution**: Differential equations governing how stress propagates — not discrete timesteps but continuous dynamics
- **Jump Process for Discrete Failures**: Models circuit breaker trips, pump shutdowns, fibre cuts, and their immediate cascading effects

**Why this matters**:
- Multi-hop cascade detection: A→B→C→D across water→power→telecom→SCADA
- Physics-Informed GNN achieves >96% PR-AUC on single-domain cascades; Munin extends to multi-domain
- No competitor has automated cross-sector cascade prediction — this is Munin's primary technical moat

---

## Layer 4: Sovereign Digital Twin (Implemented)

**What it does**: Maintains a continuously-calibrated simulation that generates training data, validates predictions, and enables what-if analysis.

**Architecture**: Multi-physics engines (hydraulic, electrical, telecom) + Ensemble Kalman Filter data assimilation + Monte Carlo/adversarial scenario generation.

**Why this matters**:
- DARPA's CyPhER Forge program validates this approach
- Solves the cold-start problem: trains ML on synthetic cascades (real disasters are rare)
- Governments can run what-if analyses without touching live infrastructure

---

## Layer 5: RL Response Optimisation (Implemented)

**What it does**: Optimises authorization packet routing, response sequencing, and resource pre-positioning.

**Architecture**: Hierarchical RL — Strategic (PPO) → Tactical (SAC) → Resource (DDPG)

**Why hierarchical**: Mirrors how governments actually decide: strategic (cabinet) → tactical (department) → operational (field). Flat RL cannot handle the combinatorial explosion.

---

## Layer 6: Federated Sovereign Training (Implemented)

**What it does**: Enables Munin to learn across utilities and jurisdictions without any party sharing raw data.

**Why essential**: Utilities will not share SCADA data. Period. Any system requiring centralised data collection is dead on arrival for government adoption.

**Guarantees**:
- Differential privacy: ε ≤ 1.0 per round (Rényi DP accounting)
- Byzantine-robust aggregation: tolerates compromised participants
- Communication-efficient: sparse updates for air-gapped networks

---

## Layer 7: Model Governance (Implemented)

**What it does**: Closes the loop — incidents, overrides, and near-misses feed back into retraining with full audit trail.

**Components**: Model cards, drift detection (KS/PSI/KL), formal revalidation, feedback integration, SHA-256 hash-chain audit trail.

**Compliance**: DoD Directive 3000.09, NDAA 2026, EU AI Act high-risk requirements.

---

## Implementation Timeline

| Layer | Capability | Target | Status |
|-------|-----------|--------|--------|
| 1 | Statistical inference (Shadow Links) | Shipped | Production |
| 2 | Physics-informed anomaly detection | v1.5 (Q3 2026) | Code complete, needs pilot data |
| 3 | GNN cascade prediction | v2 (Q1 2027) | Code complete, training on twin data |
| 4 | Sovereign digital twin | v2 (Q4 2026) | Code complete, needs sector models |
| 5 | RL response optimisation | v2.5 (Q2 2027) | Code complete, needs environment tuning |
| 6 | Federated learning | v2+ (Q2 2027) | Code complete, needs pilot partners |
| 7 | Continuous learning loop | v3 (Q4 2027) | Code complete, needs operational deployment |

**Critical path**: Layer 4 (digital twin) unlocks everything else. Without simulation, there's no training data for ML.

**Data honesty**: Layer 1 is validated on real Environment Agency flood telemetry. Layers 2-7 are code-complete with all tests passing on synthetic/simulated data. Real-data validation requires pilot deployment — no claims of production accuracy are made for these layers yet.

---

## Competitive Position

> **Caveat**: This table reflects publicly available information as of early 2026. Incumbents have large teams, production deployments, and capabilities not visible from outside. Munin's advantage is architectural (integrated cross-sector stack), not resource-based.

| Capability | Palantir | Dragos | Everbridge | Anduril | **Munin** |
|-----------|----------|--------|------------|---------|-----------|
| Cross-sector cascade prediction | Manual ontology mapping | Single-domain (ICS) | Not a focus | Military/defence | **Automated from telemetry** |
| Physics-informed ML | Foundry supports custom models | ICS-specific signatures | Not a focus | Some simulation | **Built-in, multi-domain** |
| Federated sovereign training | Enterprise data integration | Not public | Not applicable | Not public | **Designed in from day one** |
| Human-in-the-loop authorization | Analyst-driven workflows | Analyst-driven | Alert routing | Commander-driven | **Cryptographic multi-ministry** |
| Digital twin with data assimilation | Partners/integrations | Not a focus | Not applicable | Simulation capabilities | **Multi-physics, continuously calibrated** |

**Munin's thesis**: No single platform we've found combines automated cross-sector dependency discovery + physics-informed cascade prediction + sovereign federated training + cryptographic multi-ministry authorization. Each piece exists in some form across different vendors. Munin integrates them into one stack purpose-built for civilian infrastructure. Whether that integration advantage outweighs incumbent distribution is the bet.

---

## Technical References

- GNN power failure cascade prediction: [arXiv:2404.16134](https://arxiv.org/abs/2404.16134)
- Coordinating disaster emergency response with heuristic RL: [arXiv:1811.05010](https://arxiv.org/abs/1811.05010)
- DARPA CyPhER Forge (digital twin + AI safety): darpa.mil/programs/cypher-forge
- Autoencoder anomaly detection on SWaT testbed: Taylor & Francis
- NIST federated learning privacy analysis: nist.gov/cybersecurity-insights
- Munin's PI-GN-JODE architecture draws on the above; no dedicated Munin paper published yet
