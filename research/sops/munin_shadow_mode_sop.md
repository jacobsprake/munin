# SOP-MUN-002: Shadow-Mode Periodic Exercises on Historical Incidents

**Document ID:** SOP-MUN-002 v1.0  
**Classification:** OFFICIAL-SENSITIVE  
**Effective Date:** 2026-03-01  
**Review Date:** 2026-09-01  
**Owner:** National Resilience Directorate, Assurance and Validation Unit  
**Applies To:** All Munin deployments during the shadow-mode pilot phase and for ongoing regression exercises after transition to active mode

---

## 1. Purpose

This Standard Operating Procedure defines the process for running periodic shadow-mode exercises against historical incidents. Shadow mode is Munin's zero-risk pilot mechanism: the platform observes real or replayed incident data, generates recommendations and authorisation packets in parallel, but issues no commands. The exercise produces an after-action report comparing Munin's predicted response against the actual human response, yielding quantified evidence of response-time improvement, damage prevented, and correlation accuracy.

Shadow-mode exercises serve three objectives:

1. **Validation:** Prove that Munin would have improved response time and reduced damage for known incidents before the platform is trusted with live advisory recommendations.
2. **Regression testing:** After Munin transitions to active mode, periodic replay of historical incidents confirms that algorithm updates, new data, or configuration changes have not degraded performance.
3. **Soak testing:** Track correlation between Munin predictions and safe historical outcomes over a sustained period. The platform requires `≥ 99.999%` correlation and zero near-miss hallucinations before authorising handshake for production use (`engine/shadow_simulation.py` — `correlation_threshold = 0.99999`).

---

## 2. Scope

- **Incident types covered:** Flood, drought, power instability, multi-fault chaos, and correlated (shadow-link) chaos scenarios.
- **Data sources:** Historical incident records stored in `engine/out/incidents.json`, normalised time-series in `engine/out/normalized_timeseries.csv`, and human-action logs (JSONL format consumed by `engine/shadow_replay.py` — `load_human_actions()`).
- **Frequency:** Monthly during the shadow-mode pilot (first 6–12 months). Quarterly after transition to active mode for regression purposes.
- **Duration per exercise:** Typically 1–4 hours depending on number of incidents replayed.

---

## 3. Roles

| Role | Responsibility |
|------|----------------|
| Shadow Exercise Lead (SEL) | Plans the exercise, selects historical incidents, prepares human-action logs, runs the replay, and authors the after-action report. |
| Munin Operator (MO) | Ensures the engine pipeline is operational, monitors system health during replay, and resolves any data or configuration issues. |
| Sector Subject-Matter Expert (SSME) | Reviews Munin's predicted actions against domain knowledge; flags any recommendations that would have been operationally infeasible. |
| Assurance Officer (AO) | Reviews the after-action report, confirms soak-test correlation statistics, and signs off on readiness-to-transition recommendations. |

---

## 4. Prerequisites

Before starting a shadow-mode exercise, the SEL must confirm:

1. **Pipeline outputs are current.** Run `engine/run.py` (or `npm run engine`) to generate fresh graph, evidence, incidents, and packets from the latest sample data. Verify with `munin evidence-quality`.
2. **Historical incident data is available.** The incidents file (`engine/out/incidents.json`) contains the scenarios to replay. For exercises against real past events, incident data must be loaded from the relevant fixture (e.g., `engine/fixtures/disaster_baselines/`).
3. **Human-action logs are prepared.** For each historical incident, a JSONL file documenting actual human actions must be assembled. Each line follows the schema consumed by `engine/shadow_replay.py` — `load_human_actions()`:
   ```json
   {
     "timestamp": "2015-12-06T08:30:00",
     "action_type": "coordination",
     "description": "Coordinated pump isolation across 3 agencies",
     "target_nodes": ["pump_01", "pump_02", "pump_03"],
     "duration_seconds": 14400,
     "outcome": "success",
     "operator_id": "operator_001",
     "coordination_parties": ["Water Authority", "Emergency Services", "Regulatory"]
   }
   ```
4. **System health verified.** MO confirms `/api/health/readiness` returns `200 OK` and the dependency graph has been generated.

---

## 5. Procedure

### Phase 1: Exercise Setup

**Actor:** SEL, MO

1. **Select incidents.** SEL selects 3–10 historical incidents from `engine/out/incidents.json` or from disaster-baseline fixtures. Selection should include:
   - At least one single-sector flood event.
   - At least one cross-sector cascade (shadow-link scenario).
   - At least one multi-fault chaos scenario.
   - Preferably one known real-world event (e.g., Storm Desmond, Carlisle 2015) if fixture data is available.

2. **Prepare the replay harness.** MO initialises the shadow replay:
   ```python
   from engine.shadow_replay import ShadowReplayHarness
   from engine.shadow_simulation import ShadowModeEngine

   shadow_engine = ShadowModeEngine(shadow_mode_duration_days=365)
   harness = ShadowReplayHarness(shadow_engine)
   ```

3. **Load data.**
   ```python
   import json
   from pathlib import Path

   incidents = harness.load_historical_incidents(Path("engine/out/incidents.json"))
   with open("engine/out/graph.json") as f:
       graph = json.load(f)
   with open("engine/out/evidence.json") as f:
       evidence = json.load(f)
   ```

4. **Load human-action logs.** SEL provides a mapping of `incident_id → human_action_data`:
   ```python
   human_actions_map = {
       "incident_flood_00000": {
           "timestamp": "2015-12-06T08:30:00",
           "action_type": "coordination",
           "description": "Coordinated pump isolation across 3 agencies",
           "target_nodes": ["pump_01", "pump_02"],
           "duration_seconds": 14400,
           "outcome": "success"
       },
       # ... additional incidents
   }
   ```

### Phase 2: Replay Execution

**Actor:** MO

1. **Run batch replay.** Execute the replay across all selected incidents:
   ```python
   results = harness.batch_replay(
       incidents=incidents[:10],  # selected subset
       human_actions_map=human_actions_map,
       graph=graph,
       evidence=evidence
   )
   ```
   For each incident, the harness:
   - Records the human action via `shadow_engine.record_human_action()`.
   - Generates Munin's prediction via `shadow_engine.generate_munin_prediction()`, which calls `_infer_optimal_action()`, `_estimate_response_time()`, `_compute_confidence()`, `_generate_counterfactual_proof()`, and `_estimate_damage_prevented()`.
   - Compares human vs. Munin via `shadow_engine.compare_human_vs_munin()`, which computes `time_saved_seconds`, `damage_prevented_estimate`, `improvement_ratio`, and action correlation.

2. **Alternative: CLI-driven replay.** For a quick Carlisle-style demo:
   ```bash
   source venv/bin/activate
   PYTHONPATH=. python3 engine/shadow_replay.py
   ```
   This replays the first 5 incidents with mock 4-hour human response times and saves results to `engine/out/shadow_replay_results.json`.

3. **Monitor correlation tracking.** During replay, the `ShadowModeEngine` tracks:
   - Per-incident correlation in `correlation_history[]`.
   - Near-miss hallucination count (correlation < 0.7 triggers `near_miss_count` increment).
   - Running statistics accessible via `shadow_engine.get_correlation_statistics()`.

### Phase 3: After-Action Packet Review

**Actor:** SEL, SSME

1. **Generate the shadow-mode report.**
   ```python
   report = shadow_engine.generate_shadow_mode_report()
   shadow_engine.export_shadow_report(Path("engine/out/shadow_report.json"))
   ```

2. **Review report sections.** The report (`generate_shadow_mode_report()`) contains:

   | Section | Key Fields | What to Check |
   |---------|-----------|---------------|
   | `summary` | `total_incidents_observed`, `total_time_saved_hours`, `average_improvement_ratio` | Is the improvement ratio > 1.0 for all incidents? |
   | `key_findings` | Human-readable bullet points | Are the time-saved and damage-prevented claims plausible? |
   | `cost_savings_report` | `line_by_line_proof[]` with per-incident `savings_usd` and `savings_percentage` | Are cost estimates consistent with domain models (`_get_default_cost_models()`)? |
   | `top_improvements` | Sorted by `improvement_ratio` | Do top improvements correspond to cross-sector incidents (where Munin's graph-awareness provides the most value)? |
   | `soak_testing` | `correlation_statistics`, `ready_for_production` | Is `average_correlation >= 0.99999`? Is `near_miss_count == 0`? |
   | `conclusion` | Narrative summary | Does the narrative accurately reflect the data? |
   | `recommendation` | Transition recommendation | Is the recommendation warranted by the evidence? |

3. **SSME review.** For each replayed incident, the SSME evaluates:
   - Was Munin's predicted action (`_infer_optimal_action()`) operationally feasible?
   - Were the `target_nodes` in Munin's prediction relevant to the actual incident?
   - Would the predicted response time (`_estimate_response_time()`) be achievable given real-world constraints (communication latency, physical access)?
   - Were any domain-specific cost models (`engine/shadow_simulation.py` — `_get_default_cost_models()`) unrealistic for the incident type?

4. **Flag disagreements.** SSME records disagreements in the exercise log:
   - Incidents where Munin's recommendation was incorrect or infeasible.
   - Incidents where human response was faster (rare, but important to document).
   - Incidents where cost estimates were outside plausible ranges.

### Phase 4: Evaluation and Reporting

**Actor:** SEL, AO

1. **Save replay results.**
   ```python
   harness.save_replay_results(Path("engine/out/shadow_replay_results.json"))
   ```

2. **Compile the after-action report.** SEL produces a report containing:
   - Exercise metadata (date, incidents selected, participants).
   - Summary statistics from `shadow_engine.generate_shadow_mode_report()`.
   - SSME review findings and disagreements.
   - Soak-test correlation status.
   - Recommendation: continue shadow mode, extend pilot, or recommend transition to active advisory mode.

3. **Assess transition readiness.** AO reviews the report against the following criteria:

   | Criterion | Threshold | Source |
   |-----------|-----------|--------|
   | Average correlation | `>= 0.99999` | `correlation_statistics.average_correlation` |
   | Near-miss hallucinations | `== 0` | `correlation_statistics.near_miss_count` |
   | Improvement ratio (median) | `>= 2.0x` | `summary.average_improvement_ratio` |
   | SSME disagreement rate | `< 10%` of incidents | SSME review log |
   | Minimum exercise count | `>= 6 monthly exercises` | Exercise archive |
   | Minimum incident count | `>= 30 total incidents replayed` | `summary.total_incidents_observed` |

4. **AO sign-off.** If all criteria are met, AO signs the transition recommendation. If any criterion fails, shadow mode continues with remediation actions documented.

---

## 6. Regression Exercise Schedule (Post-Transition)

After Munin transitions to active advisory mode, quarterly regression exercises confirm ongoing accuracy:

| Quarter | Exercise Focus | Data Source |
|---------|---------------|-------------|
| Q1 | Full replay of original pilot incidents | Original shadow-mode data |
| Q2 | Replay of any real incidents observed during Q1 active operation | Live incident data + human-action logs |
| Q3 | Stress test with synthetic chaos scenarios | `engine/chaos_simulator.py`, `engine/synthetic_scenarios.py` |
| Q4 | Year-end comprehensive: all incident types, updated graph | Full dataset |

---

## 7. Counterfactual Proof Generation

The counterfactual proof is the core output of shadow mode. For each incident, it answers: *"If Munin had been active, how much faster would the response have been, and how much damage would have been prevented?"*

The proof is generated by `engine/shadow_simulation.py` — `_generate_counterfactual_proof()` and contains:

| Field | Description |
|-------|-------------|
| `predicted_action` | The action Munin would have recommended |
| `simulated_outcome` | Expected outcome (success / partial / failure) |
| `cascade_prevented` | Whether the cascade would have been contained |
| `nodes_protected` | Number of nodes that would have been shielded from cascade |
| `evidence_quality` | Quality of the evidence supporting the prediction |
| `simulation_confidence` | Confidence in the counterfactual prediction |

For advanced counterfactual analysis, the `engine/counterfactual.py` — `CounterfactualEngine` can run millions of "what-if" scenarios using the causal model built from evidence windows, providing a deeper analysis of alternative intervention timelines.

---

## 8. Records Retention

| Record | Location | Retention |
|--------|----------|-----------|
| Shadow replay results | `engine/out/shadow_replay_results.json` | 7 years |
| Shadow-mode report | `engine/out/shadow_report.json` | 7 years |
| Exercise human-action logs | SEL-maintained archive (JSONL) | 7 years |
| After-action reports | Assurance Unit document repository | 7 years |
| Soak-test correlation data | `shadow_engine.correlation_history` (export to JSON) | Duration of deployment |

---

## 9. References

- `engine/shadow_simulation.py` — `ShadowModeEngine` class: core shadow-mode logic
- `engine/shadow_replay.py` — `ShadowReplayHarness` class: batch replay harness
- `engine/counterfactual.py` — `CounterfactualEngine` class: causal "what-if" simulations
- `engine/run.py` — Pipeline runner (generates data for replay)
- `engine/cli.py` — CLI commands (`munin demo carlisle`, `munin evidence-quality`, `munin applicability`)
- `engine/chaos_simulator.py` — Synthetic chaos scenario generation
- `docs/SHADOW_MODE_PILOT_PLAYBOOK.md` — Pilot deployment playbook
- `docs/SHADOW_MODE_DOMAINS.md` — Domain-specific shadow-mode configuration

---

## 10. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-01 | Assurance and Validation Unit | Initial release |

**END OF DOCUMENT — SOP-MUN-002 v1.0**
