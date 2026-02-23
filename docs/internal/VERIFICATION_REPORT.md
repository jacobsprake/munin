# Munin production-grade verification report

**Date:** 2026-02-22  
**Scope:** Fresh-clone reviewer workflow, tests, demos, README accuracy, critical paths.

---

## ✅ VERIFICATION COMPLETE

### CRITICAL ISSUES FOUND: 4 (all fixed)

| # | Severity | Issue | Fix |
|---|----------|--------|-----|
| 1 | **CRITICAL** | **pytest fails when run as README says** (`cd engine && pytest`). Engine code uses `from engine.xxx` imports; running from `engine/` causes `ModuleNotFoundError: No module named 'engine'`. | **README updated:** Run from repo root with `PYTHONPATH=. python -m pytest engine/tests/ -v`. Venv + `pip install -r engine/requirements.txt` documented in same section. |
| 2 | **CRITICAL** | **One test failure:** `test_missing_required_fields` expected `KeyError` when packet has no `multiSig`; `approve_packet()` tolerated missing `multiSig`. | **Validation added** in `engine/test_approval_workflow.py`: `approve_packet()` now raises `KeyError("Packet missing required field 'multiSig'")` when `multiSig` is missing. |
| 3 | **CRITICAL** | **demo.sh and scripts/munin not executable** in git (mode 100644). Fresh clone required `chmod +x` before `./demo.sh`. | **Executable bit set** with `git update-index --chmod=+x demo.sh scripts/munin`. |
| 4 | **CRITICAL** | **detect_shadow_link.py could not find data after run.** `run.py` copied only `graph.json`, `evidence.json`, `incidents.json` to `engine/out/`; `normalized_timeseries.csv` stayed in run-specific dir, so “Try it yourself” `python3 engine/detect_shadow_link.py` (and its auto-invoked pipeline) left `engine/out/normalized_timeseries.csv` missing. | **run.py copy list updated** to include `normalized_timeseries.csv` so `engine/out/normalized_timeseries.csv` exists for `detect_shadow_link`. |

---

### HIGH PRIORITY ISSUES: 1 (documented, non-blocking)

| # | Issue | Mitigation |
|---|--------|------------|
| 1 | **Demo prints warning when Next.js not running:** `Error calling decision API: ... Connection refused (localhost:3000)`. Demo still completes and prints full output. | Expected when app is not started. README already states optional `npm run dev`; FOR_REVIEWERS says “Then start the app”. No code change; reviewers can ignore or start app for full flow. |

---

### MEDIUM PRIORITY: 0

None.

---

### WHAT WAS VERIFIED

- **Fresh clone:** `git clone https://github.com/jacobsprake/munin` (simulated in `/tmp/munin-review-test`).
- **Dependencies:** `python3 -m venv venv && source venv/bin/activate && pip install -r engine/requirements.txt` succeeds. (System Python on many hosts is externally managed; README correctly mandates venv.)
- **One-command demo:** `./demo.sh` runs to completion (~13s), prints Shadow Links step, cascade, Traditional vs Munin, authorization flow, and “DEMO COMPLETE”. Optional decision API warning when Next.js is not running.
- **README “Try it yourself”:** `python3 engine/detect_shadow_link.py` runs (with pipeline creating data when missing); after fix, `engine/out/normalized_timeseries.csv` is present for subsequent runs.
- **Python tests:** With `PYTHONPATH=. python -m pytest engine/tests/` from repo root: **58 passed, 5 skipped, 1 failed** → after fix: **59 passed, 5 skipped** (test_missing_required_fields now passes).
- **Script permissions:** `demo.sh` and `scripts/munin` are now tracked as executable (100755).
- **Paths:** Sample data under `engine/sample_data/` (and subdirs) exists; demo uses `engine/out/demo_carlisle/`; README and FOR_REVIEWERS paths are consistent.

---

### SUCCESS CRITERIA (post-fix)

- [x] Fresh clone works when following README (venv, engine/requirements.txt, PYTHONPATH for pytest).
- [x] All tests pass (with corrected test command and approval validation fix).
- [x] Demo runs without errors (optional API warning is documented).
- [x] README commands accurate (tests and venv steps updated).
- [x] Executable scripts so `./demo.sh` works out of the box.
- [x] detect_shadow_link and pipeline output layout aligned (normalized_timeseries.csv in engine/out).

---

### OVERALL STATUS: **PASS**

Recommendation: **Commit the fixes and push.** Reviewers following README and FOR_REVIEWERS will get a working clone, passing tests, and a one-command demo. Ensure the repo is pushed so `git clone https://github.com/jacobsprake/munin` receives these changes.

---

### FILES CHANGED (for commit)

- `README.md` – Running Tests section: use venv, `PYTHONPATH=. python -m pytest engine/tests/`, `npm test`.
- `engine/test_approval_workflow.py` – Reject packets missing `multiSig` (raise `KeyError`).
- `engine/run.py` – Copy `normalized_timeseries.csv` to `engine/out/` for detect_shadow_link.
- `demo.sh`, `scripts/munin` – Made executable in git (`git update-index --chmod=+x`).
- `VERIFICATION_REPORT.md` – This report.
