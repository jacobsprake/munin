# Disaster baselines for evidence and demo

Collected timeline and coordination-step data for disasters where **multi-agency coordination/authorisation** was the primary or major bottleneck. Used to support [EVIDENCE_COORDINATION_BOTTLENECK.md](../../../docs/EVIDENCE_COORDINATION_BOTTLENECK.md) and to extend the demo beyond the primary **Storm Desmond (Carlisle)** replay.

## Primary demo

The **live, runnable demo** for evidence is **Storm Desmond (Carlisle)**:

- Fixtures: `../carlisle_storm_desmond/` (golden outputs)
- Data: `engine/sample_data/carlisle/` (EA flood telemetry)
- Setup: [docs/CARLISLE_DEMO_SETUP.md](../../../docs/CARLISLE_DEMO_SETUP.md)
- Run: `python carlisle_demo.py` or `/carlisle-dashboard`

## Baseline files (other disasters)

| File | Event | Demo |
|------|--------|-----|
| `katrina_2005_baseline.json` | Hurricane Katrina | **Yes** — `/demos/katrina-2005`, `engine/disaster_demos.py`, `sample_data/katrina_2005/` |
| `fukushima_2011_baseline.json` | Fukushima Daiichi | **Yes** — `/demos/fukushima-2011`, `engine/disaster_demos.py`, `sample_data/fukushima_2011/` |
| `uk_floods_2007_baseline.json` | UK floods 2007 | **Yes** — `/demos/uk-2007`, `engine/disaster_demos.py`, `sample_data/uk_floods_2007/` |
| `sep11_2001_baseline.json` | 9/11 WTC response | **No** — excluded from demos by product decision; baseline kept for evidence only |

These JSON files are intended for:

- Referencing in docs and evidence
- Future demo routes or playbooks that “replay” or reference these events (e.g. timeline view, coordination-step comparison)
- Regression or scenario tests that assert behaviour against known baselines

To wire a new disaster into the demo: add a playbook (e.g. in `playbooks/`) that references the event_id, and optionally a small script that loads this JSON and drives the UI or engine.
