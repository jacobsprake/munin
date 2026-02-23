# Testing

## TypeScript / Jest

- **Run tests:** `npm test` or `npm run test:ci` (CI mode with coverage).
- **Setup:** Jest uses `jest.setup.js` for polyfills (TextEncoder, ReadableStream, Request/Response via undici).

### better-sqlite3

Tests that use the audit DB or decisions (e.g. `lib/audit/__tests__/auditLog.test.ts` threshold/key/checkpoint tests) require the **better-sqlite3** native module. If you see:

```text
NODE_MODULE_VERSION 115 ... This version of Node.js requires NODE_MODULE_VERSION 141
```

the native addon was built for a different Node version. Rebuild for your current Node:

```bash
npm rebuild better-sqlite3
```

Or reinstall dependencies:

```bash
rm -rf node_modules && npm install
```

### Audit Ed25519 placeholder

When **@noble/ed25519** is not installed, the audit layer uses a **placeholder** implementation: it still signs/verifies but does not cryptographically reject invalid or wrong-message signatures. In that case:

- **Install real crypto (recommended):** `npm install @noble/ed25519`
- **Tests:** The two tests that assert “reject invalid signature” and “reject signature with wrong message” are skipped when the placeholder is active (`hasRealEd25519 === false`), so the suite can pass without the dependency.

## Python / Engine

See the main [Development Guide](../README.md#development-guide): run Python tests with `PYTHONPATH=. python -m pytest engine/tests/ -v` from the repo root (with a venv and `pip install -r engine/requirements.txt`).
