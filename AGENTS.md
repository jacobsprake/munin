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

- JS tests: `npm test` (Jest, 17/18 suites pass)
- Python tests: `source venv/bin/activate && PYTHONPATH=. python -m pytest engine/tests/ -v --ignore=engine/tests/test_brownfield_integration.py --ignore=engine/tests/test_shadow_mode_regression.py`
- Lint: `npm run lint`
- Demo: `./demo.sh`
