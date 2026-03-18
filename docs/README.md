# Munin Documentation

For the main README and quick start, see the [repository root](../README.md).

---

## Start here (10 minutes)

| Document | What it tells you |
|----------|-------------------|
| [MUNIN_DOCTRINE.md](MUNIN_DOCTRINE.md) | **The thesis, the vision, the contrarian bet.** Why authorization latency is the real bottleneck and what Munin does about it. |
| [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md) | **Hands-on.** One-command demo, step-by-step CLI walkthrough, expected output. |
| [FOUNDER_NOTES.md](FOUNDER_NOTES.md) | How I got here, what I built, what I learned, what's next. |
| [LIMITATIONS.md](LIMITATIONS.md) | What Munin can't do yet. Honest assessment of gaps and how I plan to close them. |
| [WHATS_NEXT.md](WHATS_NEXT.md) | 3-6 month plan: what's happening regardless, what would accelerate with resources. |
| [OUTREACH_AND_PARTNERSHIPS.md](OUTREACH_AND_PARTNERSHIPS.md) | Who I'm talking to, what's realistic, what's not. |
| [PROGRESS_LOG.md](PROGRESS_LOG.md) | What was built and when. Chronological development velocity. |

## Safety and "do no harm" (15 minutes)

| Document | What it tells you |
|----------|-------------------|
| [SAFETY_CASE.md](SAFETY_CASE.md) | GSN-style safety case: claims linked to test evidence. Why v1 can't hurt anyone. |
| [threat_model.md](threat_model.md) | NIST 800-82-aligned threat model: attacker profiles, attack trees, countermeasures. |
| [SAFETY_ANALYSIS_STPA.md](SAFETY_ANALYSIS_STPA.md) | Hazard analysis: 17 unsafe control actions, 16 causal scenarios, safety constraints. |
| [GOVERNANCE.md](GOVERNANCE.md) | M-of-N multi-ministry signing, quorum policies, escalation rules. |
| [MISUSE_AND_ABUSE.md](MISUSE_AND_ABUSE.md) | How an authoritarian regime could abuse Munin — and what prevents it. |

## Architecture and evaluation (30 minutes)

| Document | What it tells you |
|----------|-------------------|
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Full technical architecture. |
| [DIGITAL_TWIN.md](DIGITAL_TWIN.md) | Physics-based simulation: power, water, telecom subsystems. |
| [TEE_DESIGN.md](TEE_DESIGN.md) | Multi-vendor TEE attestation architecture. |
| [HUMAN_FACTORS.md](HUMAN_FACTORS.md) | Operator personas, cognitive load, automation bias. |
| [UX_FOR_OPERATORS.md](UX_FOR_OPERATORS.md) | War room workflows, information hierarchy. |

## Standards and compliance (deep dive)

| Document | What it tells you |
|----------|-------------------|
| [IEC62443_MAPPING.md](IEC62443_MAPPING.md) | Zones/conduits, foundational requirements mapped to code. |
| [HAZARD_LOG.md](HAZARD_LOG.md) | 12 ALARP-rated hazards with mitigations. |
| [TRAINING_MODE.md](TRAINING_MODE.md) | Flight simulator concept for operator training. |
| [SOVEREIGN_HARDWARE.md](SOVEREIGN_HARDWARE.md) | Multi-TEE quorum design. |
| [RFP_PACK/](RFP_PACK/) | Procurement-ready documents for institutional buyers. |

## Legacy docs (still valid)

| Document | Description |
|----------|-------------|
| [FOR_REVIEWERS.md](FOR_REVIEWERS.md) | Original reviewer guide. |
| [MANIFESTO.md](MANIFESTO.md) | Original thesis whitepaper. |
| [HOW_MUNIN_IS_FAST.md](HOW_MUNIN_IS_FAST.md) | Speed analysis: traditional vs Munin. |

---

## Thesis and evidence

| Document | Description |
|----------|-------------|
| [EVIDENCE_COORDINATION_BOTTLENECK.md](EVIDENCE_COORDINATION_BOTTLENECK.md) | Real-world disasters where coordination/authorisation was the bottleneck. |
| [SCENARIOS_EVIDENCE_LIST.md](SCENARIOS_EVIDENCE_LIST.md) | Scenarios where Munin’s thesis applies; when it does and doesn’t. |
| [STORM_DESMOND_BASELINE.md](STORM_DESMOND_BASELINE.md) | Baseline: 2–6 hour traditional authorisation; primary demo is Storm Desmond (Carlisle). |

---

## Architecture and technical

| Document | Description |
|----------|-------------|
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Core technical design: protocol translation, dependency inference, data pipeline. |
| [ENGINE_PIPELINE_DEEP_DIVE.md](ENGINE_PIPELINE_DEEP_DIVE.md) | Engine pipeline deep dive. |
| [ENGINE_FAILURE_MODES.md](ENGINE_FAILURE_MODES.md) | Engine failure modes. |
| [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md), [PERFORMANCE_SIZING.md](PERFORMANCE_SIZING.md) | Performance budget and sizing. |
| [safety-architecture.md](safety-architecture.md) | Safety and security architecture. |
| [plug-and-play-architecture.md](plug-and-play-architecture.md) | Plug-and-play integration. |
| [AUDIT_LOG_SYSTEM.md](AUDIT_LOG_SYSTEM.md), [AUDIT_LOG_INTEGRITY.md](AUDIT_LOG_INTEGRITY.md) | Audit log design and integrity. |
| [OBSERVABILITY.md](OBSERVABILITY.md), [DATA_SOURCE.md](DATA_SOURCE.md) | Observability and data sources. |
| [foundational-survival-layer.md](foundational-survival-layer.md), [threat-model-lite.md](threat-model-lite.md) | Foundational layer and threat model. |

---

## Demos

| Document | Description |
|----------|-------------|
| [CARLISLE_QUICK_START.md](CARLISLE_QUICK_START.md) | Quick start for Carlisle / Storm Desmond demo. |
| [CARLISLE_DEMO_SETUP.md](CARLISLE_DEMO_SETUP.md) | Setup: EA flood data, replay. |
| [PERFECT_DEMO_GUIDE.md](PERFECT_DEMO_GUIDE.md) | Step-by-step demo scripts and talking points. |
| [MUNIN_DEMO_RESULTS.md](MUNIN_DEMO_RESULTS.md) | Demo results: EA telemetry, evidence, playbook, handshake. |
| [demo-sequence.md](demo-sequence.md), [demo-script.md](demo-script.md) | Demo sequence and script. |

**In-app:** `/demos` (Katrina, Fukushima, UK 2007), `/carlisle-dashboard` (Storm Desmond). See [../README.md](../README.md) for run instructions.

---

## Pilots and deployment

| Document | Description |
|----------|-------------|
| [FLOOD_WATER_WEDGE_IMPLEMENTATION_GUIDE.md](FLOOD_WATER_WEDGE_IMPLEMENTATION_GUIDE.md) | **Flood/water wedge:** Hardware, SCADA, EA API, data diode, step-by-step implementation. |
| [WEDGE_SETUP_TOMORROW.md](WEDGE_SETUP_TOMORROW.md) | **Ready for setup:** What's built, quick start, connectors, incident check, diode watcher. |
| [AIR_GAP_DEPLOYMENT_GUIDE.md](AIR_GAP_DEPLOYMENT_GUIDE.md) | Air-gapped deployment, ministry onboarding. |
| [PLUG_AND_PLAY_DEPLOYMENT_GUIDE.md](PLUG_AND_PLAY_DEPLOYMENT_GUIDE.md) | Deployment: demo, pilot, production. |
| [pilot-archetypes.md](pilot-archetypes.md), [pilot-in-a-box.md](pilot-in-a-box.md) | Pilot archetypes and pilot-in-a-box. |
| [SHADOW_MODE_DOMAINS.md](SHADOW_MODE_DOMAINS.md), [SHADOW_MODE_PILOT_PLAYBOOK.md](SHADOW_MODE_PILOT_PLAYBOOK.md) | Shadow mode and pilot playbook. |

---

## Roadmaps and production

| Document | Description |
|----------|-------------|
| [MUNIN_ROADMAP.md](MUNIN_ROADMAP.md), [R_AND_D_ROADMAP.md](R_AND_D_ROADMAP.md) | Product and R&D roadmaps. |
| [PRODUCTION_READINESS_ROADMAP.md](PRODUCTION_READINESS_ROADMAP.md) | Production readiness. |
| [NEXT_100_ROADMAP.md](NEXT_100_ROADMAP.md) | Next 100 prioritised tasks. |

---

## Operations and security

| Document | Description |
|----------|-------------|
| [OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md) | Operations runbook. |
| [SECURITY_PRACTICES.md](SECURITY_PRACTICES.md) | Security practices. |
| [FEATURE_SECURITY_COMPLIANCE.md](FEATURE_SECURITY_COMPLIANCE.md) | Feature security and compliance. |
| [ACCESSIBILITY_STANDARDS.md](ACCESSIBILITY_STANDARDS.md) | Accessibility standards. |

---

## Internal and archived

| Document | Description |
|----------|-------------|
| [internal/README.md](internal/README.md) | Internal and archived docs (implementation progress, audits, backend notes). |

---

For the main repo README and quick links, see [../README.md](../README.md).
