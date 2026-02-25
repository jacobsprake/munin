# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Munin is a dual-language project: a **Next.js 14 web app** (TypeScript) and a **Python inference engine** (`engine/`). The web app serves the dashboard UI and API routes; the engine performs data ingestion, graph inference, sensor health assessment, incident simulation, and handshake packet generation.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Next.js dev server | `npm run dev` | 3000 | Main application |
| Python engine pipeline | `source venv/bin/activate && cd engine && python run.py` | N/A | Generates JSON outputs in `engine/out/` |

### Running the app

1. Use Node.js 20 (`nvm use 20` or `nvm use`).
2. `npm run dev` starts the Next.js dev server on port 3000.
3. The engine pipeline (`engine/run.py`) should be run with the venv active. It generates data files in `engine/out/` that the API reads.

### Lint / Test / Build commands

See `package.json` scripts. Key commands:
- **Lint**: `npx next lint`
- **JS tests**: `npm test` (Jest)
- **Python tests**: `source venv/bin/activate && PYTHONPATH=. python -m pytest engine/tests/ -v`
- **Build**: `npm run build`

### Known pre-existing issues (do not attempt to fix)

- **SQLite schema bug**: `lib/db/index.ts` uses inline `INDEX` syntax inside `CREATE TABLE` statements, which is valid MySQL but not SQLite. This causes the DB to fail to initialize, making API endpoints that query the DB return empty/500. The file-based fallback paths in some API routes still work.
- **Python `domain_registry.py`**: Missing `from typing import List` import causes `NameError` in 2 test files (`test_brownfield_integration.py`, `test_shadow_mode_regression.py`).
- **Crypto test failures**: Without `@noble/ed25519` installed, the placeholder Ed25519 implementation does not properly reject invalid signatures, causing `crypto.test.ts` to fail (2 tests). Install `npm install @noble/ed25519` if real crypto tests are needed.
- **E2E tests**: `tests/e2e/critical-flows.spec.ts` requires `@playwright/test` which is not in `package.json` dependencies.

### Dependency gotchas

- `undici@5` is required (not latest) for the Jest test setup's `Request`/`Response` polyfill to work with Node 20's jsdom environment.
- `lucide-react` must be a version that includes the `Handshake` icon (>= 0.300). The `package.json` pin at `^0.294.0` is too old; run `npm install lucide-react@latest` if you see "Element type is invalid" errors in the LeftRail component.
- After switching Node versions, run `npm rebuild better-sqlite3` if you see `NODE_MODULE_VERSION` mismatch errors.
- The `.eslintrc.json` file (extending `next/core-web-vitals`) must exist for `npx next lint` to run non-interactively.

### Engine pipeline

The engine writes output to a timestamped subdirectory (`engine/out/run_YYYYMMDD_HHMMSS_seed42/`) and also copies/symlinks top-level files (`engine/out/graph.json`, etc.). The API routes read from `engine/out/graph.json` (top-level). Run the engine before starting the dev server to ensure data is available.
