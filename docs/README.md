# Munin documentation index

This index groups all project documentation for quick reference. For the main project README and quick start, see the [repository root](../README.md).

---

## Thesis and evidence

| Document | Description |
|----------|-------------|
| [FOR_REVIEWERS.md](FOR_REVIEWERS.md) | **For evaluators:** 5-minute path (app + CLI), one-sentence pitch, key docs. |
| [MANIFESTO.md](MANIFESTO.md) | Thesis whitepaper: Shadow Links, scenario space, tech stack. |
| [EVIDENCE_COORDINATION_BOTTLENECK.md](EVIDENCE_COORDINATION_BOTTLENECK.md) | Real-world disasters where coordination/authorisation was the bottleneck (Katrina, Fukushima, 9/11, UK floods). |
| [SCENARIOS_EVIDENCE_LIST.md](SCENARIOS_EVIDENCE_LIST.md) | Tier 1/2/3 list of scenarios where Munin’s thesis applies; criteria for when it does and doesn’t. |
| [STORM_DESMOND_BASELINE.md](STORM_DESMOND_BASELINE.md) | Baseline analysis for 2–6 hour traditional authorisation; primary demo is Storm Desmond (Carlisle). |

---

## Architecture and technical

| Document | Description |
|----------|-------------|
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Core technical design: protocol translation, dependency inference, Byzantine fault tolerance, data pipeline. |
| [HOW_MUNIN_IS_FAST.md](HOW_MUNIN_IS_FAST.md) | How Munin achieves speed: traditional vs Munin flow, playbook retrieval, handshake, evidence. |
| [ENGINE_PIPELINE_DEEP_DIVE.md](ENGINE_PIPELINE_DEEP_DIVE.md) | Engine pipeline deep dive. |
| [ENGINE_FAILURE_MODES.md](ENGINE_FAILURE_MODES.md) | Engine failure modes. |
| [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md), [PERFORMANCE_SIZING.md](PERFORMANCE_SIZING.md) | Performance budget and sizing. |
| [safety-architecture.md](safety-architecture.md) | Safety and security architecture. |
| [foundational-survival-layer.md](foundational-survival-layer.md) | Foundational survival layer and threat scenarios. |
| [threat-model-lite.md](threat-model-lite.md) | Lightweight threat model. |
| [plug-and-play-architecture.md](plug-and-play-architecture.md) | Plug-and-play integration and Universal Translator. |
| [full-stack-sovereign-ecosystem.md](full-stack-sovereign-ecosystem.md) | Sovereign federation and multi-site architecture. |
| [FORMAL_METHODS.md](FORMAL_METHODS.md) | Formal methods and hypothesis tests. |
| [AUDIT_LOG_SYSTEM.md](AUDIT_LOG_SYSTEM.md), [AUDIT_LOG_INTEGRITY.md](AUDIT_LOG_INTEGRITY.md) | Audit log design and integrity. |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Observability. |
| [DATA_SOURCE.md](DATA_SOURCE.md) | Data source: engine output vs database. |

---

## Demos and case studies

| Document | Description |
|----------|-------------|
| [CARLISLE_DEMO_SETUP.md](CARLISLE_DEMO_SETUP.md) | Setup for Carlisle / Storm Desmond demo (EA flood data, replay). |
| [CARLISLE_QUICK_START.md](CARLISLE_QUICK_START.md) | Quick start for Carlisle demo. |
| [CARLISLE_DEMO_REVIEW.md](CARLISLE_DEMO_REVIEW.md) | Demo review: coordination latency reduction with EA data. |
| [MUNIN_DEMO_RESULTS.md](MUNIN_DEMO_RESULTS.md) | Demo results: EA telemetry, evidence windows, playbook, handshake, legal basis. |
| [PERFECT_DEMO_GUIDE.md](PERFECT_DEMO_GUIDE.md) | Step-by-step demo scripts and talking points. |
| [demo-sequence.md](demo-sequence.md), [demo-script.md](demo-script.md) | Demo sequence and script. |
| **Disaster demos** | **App `/demos`**: Katrina 2005, Fukushima 2011, UK 2007 (excl. 9/11). Baseline data in `engine/fixtures/disaster_baselines/`; run `engine/disaster_demos.py`. See [README_DEMO.md](../README_DEMO.md). |

---

## Pilots and deployment

| Document | Description |
|----------|-------------|
| [pilot-archetypes.md](pilot-archetypes.md) | Pilot deployment archetypes (water, grid, smart city); future use cases (Mars, charter cities). |
| [pilot-in-a-box.md](pilot-in-a-box.md) | Pilot-in-a-box deployment package. |
| [PLUG_AND_PLAY_DEPLOYMENT_GUIDE.md](PLUG_AND_PLAY_DEPLOYMENT_GUIDE.md) | Deployment by mode: demo, pilot, production, war-emergency. |
| [SHADOW_MODE_DOMAINS.md](SHADOW_MODE_DOMAINS.md), [SHADOW_MODE_PILOT_PLAYBOOK.md](SHADOW_MODE_PILOT_PLAYBOOK.md) | Shadow mode and pilot playbook. |

---

## Features and roadmaps

| Document | Description |
|----------|-------------|
| [monopoly-features.md](monopoly-features.md) | Strategic and monopoly features. |
| [sovereign-monopoly-features-2026.md](sovereign-monopoly-features-2026.md) | Sovereign monopoly features 2026. |
| [2026-reality-features.md](2026-reality-features.md) | 2026 reality features. |
| [MUNIN_ROADMAP.md](MUNIN_ROADMAP.md), [R_AND_D_ROADMAP.md](R_AND_D_ROADMAP.md) | Roadmaps. |
| [NEXT_100_ROADMAP.md](NEXT_100_ROADMAP.md) | Next 100 prioritized tasks (single checklist). |
| [end-state-pillars.md](end-state-pillars.md) | End-state pillars. |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md), [IMPLEMENTATION_EVALUATION.md](IMPLEMENTATION_EVALUATION.md) | Implementation summary and evaluation. |
| [PRODUCTION_READINESS_ROADMAP.md](PRODUCTION_READINESS_ROADMAP.md) | Production readiness. |

---

## Operations and security

| Document | Description |
|----------|-------------|
| [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) | Operations runbook. |
| [SECURITY_PRACTICES.md](SECURITY_PRACTICES.md) | Security practices. |
| [FEATURE_SECURITY_COMPLIANCE.md](FEATURE_SECURITY_COMPLIANCE.md) | Feature security and compliance. |
| [ACCESSIBILITY_STANDARDS.md](ACCESSIBILITY_STANDARDS.md) | Accessibility standards. |

---

For the main repo README and quick links, see [../README.md](../README.md). For demo run instructions, see [../README_DEMO.md](../README_DEMO.md).
