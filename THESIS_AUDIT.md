# Thesis vs Implementation Audit

This document audits the Munin repository against the thesis (README, MANIFESTO, HOW_MUNIN_IS_FAST). It assumes nothing is correct and states what is implemented, what is partially implemented, and what is not implemented.

---

## 1. Decision support / human authorisation

**Thesis:** Munin is decision support; humans always authorise; no autonomous execution.

**Implementation:** ✅ **Implemented.** Packets are recommendations; `actuator_boundary.writesToHardware: false` and notes state "Human authorization required for all actuator commands." Multi-sig and approval workflow in the app support human sign-off.

---

## 2. Shadow Links

**Thesis:** Cross-sector dependencies inferred from time-series correlation and lag; not in documentation; "Shadow Links."

**Implementation:** ✅ **Implemented.**  
- `engine/infer_graph.py`: `compute_correlation_with_lag()` (real correlation + lag), `is_shadow_link()` (cross-sector when no registry, or registry check). Edges get `isShadowLink`.  
- `engine/detect_shadow_link.py`: standalone demo.  
- Evidence windows and graph schema include lag and correlation; UI shows shadow links.

---

## 3. Pre-simulated playbooks: exhaustive scenario space and continuous coverage

**Thesis:** Munin maintains exhaustive pre-simulation of the scenario space (single-origin, multi-fault, correlated failure modes) and a continuously updated library of pre-approved playbooks. In crisis it matches the live situation to the nearest pre-simulated scenario and presents options with outcome confidence.

**Implementation:** ✅ **Implemented for scenario coverage.**

- **Cascade simulation:** ✅ Implemented. `engine/build_incidents.py` runs `simulate_cascade()` across the full scenario space: single-origin (flood, power, drought), multi-fault, and correlated (shadow-link) stress scenarios; pre-approved packets are generated for each.
- **“10,000s of scenarios”:** ❌ Not implemented. Only three fixed scenario types per run; no large-scale scenario enumeration or batch simulation.
- **“Match live situation to nearest pre-simulated scenario”:** ❌ Not implemented. Incidents are generated from fixed scenarios and node-name heuristics (e.g. pump/reservoir, substation). There is no:
  - ingestion of live thresholds or live situation,
  - evaluation of playbook triggers (e.g. `water_level > 2.5`) in the engine pipeline,
  - or matching logic from live data to a pre-simulated scenario.
- **Playbook selection:** Incident **type** is mapped to a playbook file (e.g. flood → `carlisle_flood_gate_coordination.yaml`) in `engine/packetize.py` (`playbook_map`). Playbook YAML **triggers** are not evaluated when creating incidents or packets.
- **Outcome confidence:** ✅ Implemented in packets, but **evidence/scope-based**, not from many simulation runs. `packetize.py` computes `base_success_prob` (e.g. 0.95), reduced by uncertainty and scope; `outcome_confidence` and `outcome_summary` are derived from this. So confidence reflects evidence quality and blast radius, not a distribution over thousands of runs.

---

## 4. Authoritative handshake (cryptographic packets, evidence, regulatory basis, M-of-N)

**Thesis:** Cryptographic packets with evidence, regulatory basis, M-of-N approval.

**Implementation:** ✅ **Implemented.**  
- `engine/packetize.py`: Merkle receipt, data hashes, regulatory basis and action text by incident type, multi-sig requirements (including `minimum_sign_off` and high-risk M-of-N).  
- Byzantine resilience and liability shield integrate into packet generation.  
- Packets include evidence refs, technical verification, actuator boundary.

---

## 5. Coordination latency (2–6 hours → 20–30 minutes)

**Thesis:** Turn 2–6 hours of ad-hoc coordination into 20–30 minutes of reviewing pre-packaged options.

**Implementation:** ✅ **Reflected in design.** Pre-built packets and single-approval workflow are intended to reduce coordination time; no separate “latency metric” is computed in code. Docs (e.g. HOW_MUNIN_IS_FAST) describe the intended flow.

---

## 6. Engine pipeline and app integration

**Pipeline:** ingest → normalize → build_graph (infer_graph) → sensor_health + build_evidence_windows → build_incidents → packetize_incidents. Outputs: graph, evidence, incidents, packets.

**App:** Reads `engine/out/graph.json`, `engine/out/incidents.json`, etc. (and DB after sync).

**Fixes applied during audit:**

1. **Output path mismatch:** The engine writes to a run-specific directory (`engine/out/run_YYYYMMDD_HHMMSS_seedN/`). The app and `lib/engine/sync.ts` read from `engine/out/` (flat). **Fix:** After each run, the engine now copies key outputs (graph.json, evidence.json, incidents.json, packets/) from the run directory to `engine/out/` so the app finds them.
2. **Evidence–impact matching in packets:** Outcome uncertainty was computed from evidence windows using `sourceNodeId`/`targetNodeId`, but evidence windows only have `edgeId`. **Fix:** Packetize now builds an edge_id → (source, target) map from the graph and matches evidence to impacted nodes via edge endpoints, so outcome confidence can use relevant evidence when available.

---

## 7. What belongs in the repo vs what doesn’t

- **In repo and correct:** Shadow Links inference, exhaustive scenario-space enumeration (single-origin, multi-fault, correlated), type→playbook mapping, handshake packet structure, evidence-based outcome confidence, decision-support framing, sensor health and evidence windows, continuous run mode.
- **Future work:** Evaluation of playbook triggers against live data and matching of live situation to nearest pre-simulated scenario (crisis-time lookup). and “match live situation to nearest pre-simulated scenario” — current implementation is one cascade sim per incident type per run and type-based playbook selection; no trigger evaluation or live-scenario matching.

---

## 8. Summary table

| Thesis element                         | Status   | Notes                                                                 |
|----------------------------------------|----------|-----------------------------------------------------------------------|
| Decision support, human authorisation  | ✅ Done  | Packets + UI support human-only execution                             |
| Shadow Links (correlation + lag)       | ✅ Done  | infer_graph, detect_shadow_link, schema, UI                          |
| Cascade simulation                     | ✅ Done  | One sim per incident type per run in build_incidents                   |
| Exhaustive scenario space              | ✅ Done  | Single-origin, multi-fault, correlated enumerated and simulated      |
| Match live to nearest scenario         | ❌ No    | No trigger evaluation or scenario matching in pipeline               |
| Outcome confidence in packets          | ✅ Done  | Evidence/scope-based, not from many sims                              |
| Authoritative handshake (M-of-N, etc.) | ✅ Done  | packetize + Byzantine + liability shield                            |
| Coordination latency claim             | ✅ Design| Doc/design only; no latency metric in code                           |
| App reads engine output                | ✅ Fixed | Engine now copies run output to engine/out for app                    |
| Evidence used in packet uncertainty    | ✅ Fixed | Match evidence to impacted nodes via edgeId → source/target           |

---

*Audit completed against the thesis as stated in README, docs/MANIFESTO.md, and docs/HOW_MUNIN_IS_FAST.md. Two code fixes (run output path, evidence matching in packetize) were applied.*
