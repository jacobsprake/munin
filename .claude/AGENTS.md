# Munin - Agent Instructions

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Next.js frontend + API | `npm run dev` | 3000 | Serves UI and ~50 API routes |
| Python engine pipeline | `npm run engine` | N/A | Generates graph, incidents, packets into `engine/out/` |
| SQLite DB | auto-created | N/A | `data/munin.db`, created on first API access |

### Running the project

- See `README.md` "Installation & Setup" section for full setup commands.
- Use Node 20 (`nvm use 20`).
- Python venv at `venv/` with deps from `engine/requirements.txt`.
- Run `npm run engine` (or `./demo.sh`) **before** starting the dev server to populate `engine/out/` with graph/incident data.
- If the DB gets corrupted or schema changes, delete `data/munin.db*` and restart the dev server.

### Non-obvious caveats

- **`lib/utils.ts` is client-safe only** — it exports `cn()` for Tailwind class merging. Server-only functions (e.g., `getPythonPath`) live in `lib/serverUtils.ts`. Never import `fs`/`path` in `lib/utils.ts`.
- **SQLite schema uses separate `CREATE INDEX` statements** — inline `INDEX` inside `CREATE TABLE` is MySQL syntax that SQLite rejects. See `lib/db/index.ts`.
- **`tests/e2e/` contains Playwright tests** — excluded from Jest via `jest.config.js`. They are not runnable with `npm test`.
- **`@noble/ed25519` is optional** — crypto tests use placeholder mode. The `crypto.test.ts` file has 2 tests that fail without it (expected).
- **`npm run build` has `typescript.ignoreBuildErrors: true`** — some lucide-react icons have type declaration mismatches in v0.575.0 even though the runtime icons exist.

### Testing commands

- JS tests: `npm test` (Jest, 18/18 suites, 76/76 tests)
- Python tests: `source venv/bin/activate && PYTHONPATH=engine python -m pytest engine/tests/ -v` (59 pass, 5 skipped)
- Lint: `npm run lint`
- Build: `npm run build`
- Demo: `./demo.sh`

### Standalone engine modules (all 13 work)

All require `source venv/bin/activate`. Some need `PYTHONPATH=engine` or `PYTHONPATH=.`:
- `python3 engine/detect_shadow_link.py` — shadow link detection
- `python3 engine/byzantine_resilience.py` — M-of-N quorum demo
- `python3 engine/sovereign_handshake.py` — biometric handshake demo
- `python3 engine/logic_lock.py` — physics constraint validation
- `python3 engine/cmi_prioritization.py` — civilian-military asset prioritization
- `python3 engine/physical_verification.py` — RF/acoustic verification
- `PYTHONPATH=engine python3 engine/safety_plc.py` — hardware safety PLC
- `PYTHONPATH=engine python3 engine/n_version_programming.py` — N-version diversity
- `PYTHONPATH=engine python3 engine/digital_asset_vault.py` — EMP-shielded vault
- `PYTHONPATH=engine python3 engine/sovereign_mesh.py` — sovereign mesh network
- `PYTHONPATH=engine python3 engine/satellite_verification.py` — satellite truth
- `PYTHONPATH=. python3 engine/shadow_simulation.py` — shadow mode simulation
- `PYTHONPATH=engine python3 engine/agentic_reasoning.py` — multi-step recovery plans
