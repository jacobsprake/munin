# For reviewers: Munin in 5 minutes

This guide is for evaluators (e.g. investment or grant reviewers) who want to see the system and thesis quickly.

---

## What Munin is

**Munin is decision support for infrastructure operators.** It does not execute actions autonomously. Operators review pre-simulated playbooks and authorise via Byzantine multi-signature; we turn **2–6 hours** of ad-hoc coordination into **20–30 minutes** of reviewing pre-packaged options. *Humans still decide.*

- **Thesis:** The state’s bottleneck in crisis response is not data—it’s **authority**. Munin bridges SCADA (atoms) and legal authority (law) by pre-validating playbooks and generating cryptographic execution packets that carry legal authority.
- **The “Secret”:** **Shadow Links**—cross-sector dependencies inferred from time-series correlation that traditional monitoring cannot see. Munin discovers them and uses them for cascade prediction.
- **Evidence:** Real disasters where coordination/authorisation was the primary failure: Hurricane Katrina, Fukushima, UK floods. See [EVIDENCE_COORDINATION_BOTTLENECK.md](EVIDENCE_COORDINATION_BOTTLENECK.md).

---

## 5-minute path (in the app)

1. **Landing** (`/`) — Read the one-screen thesis and “Traditional vs Munin” comparison.
2. **5-min demo path** (`/demo-path`) — Scroll through: thesis → problem (2–6 h) → solution (20–30 min) → Shadow Links → evidence. Then use the buttons to open Graph, Demos, Carlisle, Simulation.
3. **Dependency graph** (`/graph`) — Shows inferred dependencies (and Shadow Links). Click edges for confidence and lag.
4. **Disaster demos** (`/demos`) — Index of Katrina, Fukushima, UK 2007. Click an event for timeline + Munin counterfactual.
5. **Carlisle dashboard** (`/carlisle-dashboard`) — Live-style flood demo with Storm Desmond context; metrics (time-to-authorise, coordination latency).
6. **Handshakes** (`/handshakes`) — Open a packet; see **outcome confidence** (e.g. “85% confidence cascade contained to Zone 3”) and proposed action. This is the pre-validated playbook output that operators review and authorise.

---

## 5-minute path (command line)

```bash
# 1. Shadow Link detection (the "Secret")
cd engine && python3 detect_shadow_link.py
# (Requires normalized data: run `npm run engine` or `python3 carlisle_demo.py` first if needed.)

# 2. Run Carlisle flood demo (real EA data story)
python3 carlisle_demo.py

# 3. Run disaster demos (Katrina, Fukushima, UK 2007)
python3 disaster_demos.py
```

Then start the app (`npm run dev`) and open `/`, `/demo-path`, `/demos`, `/carlisle-dashboard`, `/handshakes`.

---

## Key documents

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Repo entry: thesis, Shadow Links, tech stack, handshake flow |
| [MANIFESTO.md](MANIFESTO.md) | Thesis whitepaper: exhaustive scenario space, sovereignty paradox |
| [EVIDENCE_COORDINATION_BOTTLENECK.md](EVIDENCE_COORDINATION_BOTTLENECK.md) | Real disasters (Katrina, Fukushima, 9/11, UK) and Munin counterfactuals |
| [SCENARIOS_EVIDENCE_LIST.md](SCENARIOS_EVIDENCE_LIST.md) | When Munin applies (and when it doesn’t) |
| [README_DEMO.md](../README_DEMO.md) | How to run demos and verification |

---

## One-sentence pitch

Munin is decision support for infrastructure: pre-simulated playbooks and multi-ministry authorisation in minutes instead of hours, so operators can act at the speed of the cascade instead of the speed of the bureaucracy.
