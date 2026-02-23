# Where agentic AI fits in Munin

**Boundary:** Agentic AI is used for **design-time and suggestion-generation** (playbook design, scenario exploration, explaining evidence). At **runtime**, outputs are always **suggestions only**; operators approve each step and Munin never executes.

---

## Current implementation

| Location | Purpose | Boundary |
|----------|---------|----------|
| `engine/agentic_reasoning.py` | Situation assessment, cross-reference, cascade analysis, **multi-step recovery plan generation**, multi-agency coordination draft | ✅ Suggestions only; used by `/api/agentic/reason` to produce a recovery plan for operator review |
| `engine/agentic_reasoning.py` | `detect_agentic_threat` + autonomous countermeasures (quarantine, reroute, etc.) | ⚠️ **Contradicts “no autonomous execution”** — should be reframed as **alerts + suggested countermeasures** for human approval, not auto-deploy |
| `app/api/agentic/countermeasures/route.ts` | POST to “deploy” countermeasures | ⚠️ Same: should recommend, not deploy |
| Pipeline `engine/run.py` | Ingest → infer → health → incidents → packetize | Agentic reasoning **not** in main pipeline; only invoked on demand via API |

---

## Where agentic AI should be added (design-time / prep)

### 1. **Playbook design and authoring** (high value) — **implemented**

- **Today:** Playbooks are designed from **law codes** via `engine/compliance/regulatory_corpus.py` and `engine/playbook_design.py`. The designer generates playbooks for every scenario and jurisdiction from the regulatory corpus; humans review and approve before use. Run: `PYTHONPATH=engine python -m playbook_design --jurisdiction UK` or `--all`; output goes to `playbooks/generated/`. Hand-authored YAML in `playbooks/*.yaml` remains supported (triggers, actions, regulatory_compliance, approval_required).
- **Agentic addition:** A **playbook-design assistant** that:
  - Proposes **candidate playbooks** from incident types + dependency graph (e.g. “given flood + these pump nodes, suggest trigger conditions and a 3–5 step action sequence”).
  - Suggests **regulatory_compliance** entries by calling `engine/compliance/regulatory_mapper.py` and drafting clause text for human review.
  - Proposes **variants** from simulation outcomes (e.g. “simulation showed step 2 often fails when X; suggest an alternative branch”).
- **Integration:** New module (e.g. `engine/playbook_design.py` or `engine/agentic_playbook.py`) + optional API (e.g. `POST /api/playbooks/suggest`) used by operators when authoring or updating playbooks. Output is always **draft YAML or diff** for human edit and approval.
- **Not in critical path:** Design happens offline; no impact on runtime packet generation.

### 2. **Scenario and incident authoring** (medium value)

- **Today:** `engine/build_incidents.py` builds incidents from graph; `engine/scenarios/library.py` is static; `engine/synthetic_scenarios.py` exists for synthetic scenario generation.
- **Agentic addition:** An **scenario/incident assistant** that:
  - Proposes **new incident types** or **initial failure nodes** from risk analysis or historical analogues.
  - Suggests **parameter ranges** or **what-if variants** (e.g. “add concurrent power failure to flood scenario”) for stress-testing the playbook library.
- **Integration:** Optional step before or alongside `build_incidents` / scenario library updates; output is **candidate incident definitions or scenario config** for human review.
- **Not in critical path:** Scenario authoring is prep work.

### 3. **Evidence quality: explanatory summaries** (medium value)

- **Today:** `engine/analysis/evidence_quality.py` computes confidence (HIGH/MEDIUM/LOW), confounder tests, false_positive_risk. No natural-language explanation.
- **Agentic addition:** **Explain why** a link is LOW/MEDIUM (e.g. “Correlation may be driven by shared load-shedding schedule”; “Only 2 evidence windows; lag inconsistent”). Surfaces in UI/dashboard so operators see both the score and a short rationale.
- **Integration:** Optional post-pass over evidence-quality results (e.g. in `evidence_quality.py` or a small `engine/evidence_explainer.py`) that adds a `explanation` or `rationale` field. No change to approval logic—purely informational.
- **Not in critical path:** Explanation can be async or on-demand.

### 4. **Graph / dependency discovery assistance** (lower priority)

- **Today:** `engine/infer_graph.py` does correlation + lag; graph is deterministic from data.
- **Agentic addition:** Optional **interpretation layer**: e.g. “This cluster of nodes often moves together; consider labelling as zone X” or “Link A–B has medium confidence; main confounder may be weather.” Useful for operators exploring the graph, not for changing the graph itself.
- **Integration:** Optional API or CLI that takes graph + evidence and returns **suggested labels or confounder summaries** for human review. Infer pipeline stays unchanged.

### 5. **Regulatory and compliance drafting** (medium value)

- **Today:** `engine/compliance/regulatory_mapper.py` maps jurisdiction to statutes; playbooks contain hand-written `regulatory_compliance` blocks.
- **Agentic addition:** Given **action + jurisdiction**, suggest **regulatory_basis** text (act, section, requirement) using mapper + LLM, with human review. Helps keep playbooks aligned with regulations as they change.
- **Integration:** Could live inside a playbook-design assistant or as a small `engine/compliance/draft_basis.py` used when editing playbooks.

---

## Where agentic AI should **not** take over

| Area | Reason |
|------|--------|
| **Packet generation** (`packetize.py`) | Deterministic, auditable assembly from playbook + graph + evidence. No autonomous decisions. |
| **Graph inference** (`infer_graph.py`) | Correlation/lag must be reproducible and explainable; rule-based. AI can *explain* results, not replace the algorithm. |
| **Byzantine / multi-sig** | Human signers only; no AI in the authorization path. |
| **Execution of actions** | Never. Agentic output is always “suggest” / “draft”; humans approve and (outside Munin) execute. |

---

## Recommended order of implementation

1. **Clarify or reframe existing “agentic countermeasures”** so they are **suggested countermeasures + alerts**, not autonomous deploy. Keep agentic reasoning for **recovery-plan suggestions** as-is.
2. **Playbook design from law codes** — implemented: `engine/playbook_design.py` + `engine/compliance/regulatory_corpus.py` generate playbooks for every scenario and jurisdiction; humans review before use.
3. **Evidence-quality explanations** — high trust impact, relatively small surface (one extra field per link).
4. **Scenario/incident authoring** and **regulatory drafting** — as capacity allows; both are design-time only.

---

## Summary

- **Runtime:** Agentic AI only produces **suggestions** (recovery plans, countermeasure recommendations). Operators approve; Munin never executes.
- **Design-time:** Agentic AI should be **implemented** for playbook design, scenario/incident authoring, evidence explanation, and (optionally) regulatory drafting. All outputs are drafts or suggestions for human review.
- **Not agentic:** Packet assembly, graph inference, multi-sig, and any execution path remain deterministic and human-authorised.
