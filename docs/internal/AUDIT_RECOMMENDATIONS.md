# Munin Audit Recommendations

**Date:** 2026-03-19  
**Branch:** cursor/moonin-audit-recommendations-fef1  
**Purpose:** Actionable plan to improve the demo, repo, and all features

---

## Executive Summary

This audit synthesizes findings from THESIS_AUDIT.md, REVIEW_REPORT.md, IMMEDIATE_NEXT_STEPS.md, DOCUMENTATION_VS_REPO.md, and codebase exploration. Items are grouped by **Demo**, **Repo**, and **Features**, with priority and effort indicators.

---

## 1. Demo Improvements

### 1.1 One-command web demo (HIGH)

**Problem:** `demo.sh` runs the engine only; reviewers must separately run `npm run dev` and `npm run seed:demo`. FOR_REVIEWERS says "Create an operator via POST /api/auth/users" — friction for first-time reviewers.

**Action:**
- Extend `demo.sh` or add `./demo.sh --full` to optionally start the dev server and seed demo operator
- Or: add `npm run demo:full` that runs engine → dev server → seed in sequence (with clear instructions)

**Effort:** Low (script changes)

---

### 1.2 Demo path alignment (MEDIUM)

**Problem:** PERFECT_DEMO_GUIDE references `/demo-path` for thesis flow; FOR_REVIEWERS emphasizes Handshakes. The "5-minute demo" path could be clearer.

**Action:**
- Add a single "Demo Mode" landing page or `/demo-path` that auto-advances through: Graph → Simulation → Handshake generation → Packet review
- Or: document one canonical path (e.g. Graph → Simulation → Handshakes) and ensure demo data is pre-seeded

**Effort:** Medium (UI + docs)

---

### 1.3 Engine output path consistency (RESOLVED)

**Status:** THESIS_AUDIT notes engine copies run output to `engine/out/` for app. Verify `lib/engine/sync.ts` and app API routes consistently read from `engine/out/`.

**Action:** Quick verification; fix any drift.

**Effort:** Low

---

### 1.4 Demo operator credentials (HIGH)

**Problem:** Reviewers need to create an operator or know credentials. `npm run seed:demo` exists but requires server to be up.

**Action:**
- Document default demo credentials in FOR_REVIEWERS and README (e.g. `flood_officer_01` / `demo`)
- Ensure `npm run seed:demo` runs idempotently and creates a known operator
- Add a "Quick login" button on landing for demo mode (optional, UX)

**Effort:** Low

---

## 2. Repo Improvements

### 2.1 Testing coverage (CRITICAL)

**Problem:** IMMEDIATE_NEXT_STEPS (older) said "Only 1 test file" — AGENTS.md now says 18/18 suites, 76/76 tests. Verify coverage of critical paths.

**Action:**
- Run `npm test` and `pytest engine/tests/` — confirm all pass
- Add tests for: `/api/decisions/create`, `/api/decisions/sign`, `/api/engine/run`, `/api/engine/sync`
- Target: 70%+ coverage on `lib/` and `app/api/`

**Effort:** Medium–High

---

### 2.2 CI/CD and build (HIGH)

**Status:** README badges show build.yml, test.yml, CodeQL. Verify workflows run on PR and main.

**Action:**
- Confirm GitHub Actions pass on current branch
- Add branch protection requiring passing tests
- Consider: `npm run engine` in CI to validate Python pipeline

**Effort:** Low–Medium

---

### 2.3 Documentation drift (MEDIUM)

**Problem:** DOCUMENTATION_VS_REPO tracks doc vs code; FOR_REVIEWERS says "44 test suites (216 tests)" — may be stale.

**Action:**
- Audit FOR_REVIEWERS, README, PERFECT_DEMO_GUIDE against current repo state
- Update DOCUMENTATION_VS_REPO after any doc changes
- Add a `scripts/check_docs.sh` that greps for paths and validates they exist

**Effort:** Low

---

### 2.4 Dependencies and security (HIGH)

**Problem:** REVIEW_REPORT noted `better-sqlite3` missing from package.json — may be resolved. AGENTS.md mentions `typescript.ignoreBuildErrors: true` for lucide-react.

**Action:**
- Run `npm audit` and fix vulnerabilities
- Add `better-sqlite3` to package.json if still required
- Consider resolving lucide-react type issues to remove ignoreBuildErrors

**Effort:** Low–Medium

---

### 2.5 Environment and secrets (MEDIUM)

**Problem:** IMMEDIATE_NEXT_STEPS called for `.env.example` and externalized secrets.

**Action:**
- Verify `.env.example` exists and documents all required vars
- Ensure no secrets in repo; use env vars for DB path, keys, etc.

**Effort:** Low

---

## 3. Feature Improvements

### 3.1 Outcome confidence source (MEDIUM)

**Problem:** THESIS_AUDIT: "Outcome confidence reflects evidence quality and blast radius, not a distribution over thousands of runs." Thesis implies many simulation runs.

**Action:**
- Document this design choice in LIMITATIONS or MANIFESTO
- Consider: optional multi-run confidence (e.g. run N cascades, aggregate) for future enhancement

**Effort:** Low (docs) or High (implementation)

---

### 3.2 Coordination latency metric (LOW)

**Problem:** THESIS_AUDIT: "Coordination latency claim — Design only; no latency metric in code."

**Action:**
- Add a simple metric: time from packet generation to last signature (or to "executed")
- Surface in Handshakes UI or metrics dashboard

**Effort:** Medium

---

### 3.3 PQC / TEE / ZKP status (LOW)

**Problem:** FOR_REVIEWERS lists PQC, TEE, ZKP as "Demo" or "Architecture ready" — needs liboqs, SGX, circom.

**Action:**
- Keep status table updated in FOR_REVIEWERS
- Add CONTRIBUTING section: "How to enable PQC/TEE" for contributors with hardware

**Effort:** Low

---

### 3.4 Playbook trigger evaluation (MEDIUM)

**Problem:** THESIS_AUDIT: "Match live situation to nearest scenario" — live_match.py exists; trigger evaluation may be partial.

**Action:**
- Verify `evaluate_playbook_triggers` and `match_live_to_scenario` are wired end-to-end
- Document in THESIS_AUDIT or FEATURE_COMPLETION_SUMMARY what is fully implemented vs stubbed

**Effort:** Low (verification) or Medium (implementation)

---

### 3.5 Health checks (HIGH)

**Status:** AGENTS.md doesn't mention health endpoints. IMMEDIATE_NEXT_STEPS called for `/api/health`, `/api/health/ready`, `/api/health/live`.

**Action:**
- Add health routes if missing; ensure readiness checks DB and engine output availability
- Use in Docker/K8s probes

**Effort:** Low

---

### 3.6 Mobile/responsive (LOW)

**Status:** FEATURE_COMPLETION_SUMMARY lists "Mobile/responsive improvements" as done.

**Action:**
- Spot-check key pages (Graph, Handshakes, Simulation) on mobile viewport
- Fix any layout breaks

**Effort:** Low

---

## 4. Prioritized Execution Plan

| Priority | Item | Area | Effort |
|----------|------|------|--------|
| P0 | Demo operator credentials + one-command path | Demo | Low |
| P0 | Verify tests pass, add critical API tests | Repo | Medium |
| P1 | Health check endpoints | Features | Low |
| P1 | Documentation drift audit | Repo | Low |
| P1 | Dependencies/security audit | Repo | Low |
| P2 | Demo path alignment / Demo Mode page | Demo | Medium |
| P2 | Coordination latency metric | Features | Medium |
| P2 | Playbook trigger verification | Features | Low |
| P3 | Outcome confidence documentation | Features | Low |
| P3 | PQC/TEE/ZKP contributor guide | Features | Low |
| P3 | Mobile responsive spot-check | Features | Low |

---

## 5. Quick Wins (Do First)

1. **Document demo credentials** in FOR_REVIEWERS and README
2. **Run full test suite** — fix any failures
3. **Add `/api/health`** if missing
4. **Run `npm audit`** — fix high/critical
5. **Update FOR_REVIEWERS** test count if stale

---

## 6. References

- `docs/internal/THESIS_AUDIT.md` — Thesis vs implementation
- `docs/internal/REVIEW_REPORT.md` — Repo structure review
- `docs/internal/IMMEDIATE_NEXT_STEPS.md` — Production readiness
- `docs/internal/DOCUMENTATION_VS_REPO.md` — Doc/code sync
- `docs/PERFECT_DEMO_GUIDE.md` — Demo scripts
- `docs/FOR_REVIEWERS.md` — Reviewer tour
- `AGENTS.md` — Agent instructions

---

*Audit completed. Linear issues created for key actionable items.*
