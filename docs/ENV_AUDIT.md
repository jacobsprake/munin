# Environment variable audit (roadmap item 21)

All configuration that could contain secrets or environment-specific values should use environment variables. This document lists required and optional env vars and where they are used.

## Required (production)

| Variable | Used in | Purpose |
|----------|---------|---------|
| `NODE_ENV` | Next.js | `development` / `production` |
| `PORT` | Next.js | Server port (default 3000) |
| `NEXTAUTH_SECRET` | NextAuth (if used) | Session signing |
| `ED25519_PRIVATE_KEY` | lib/audit, signing | Decision/signature keys (base64) |

## Optional

| Variable | Used in | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | lib/db | Postgres connection; if unset, SQLite in project |
| `ENGINE_OUT_DIR` | app/engine, scripts | Engine output path (default `engine/out`) |
| `EA_API_KEY` | engine/ea_flood_client | EA Flood Monitoring API (if required by API) |
| `EA_API_BASE` | engine/ea_flood_client | EA API base URL |

## Not hardcoded

- No API keys or secrets in source; use `.env` (gitignored) and `.env.example` as template.
- Webhook `secret` is per-subscription and stored in DB, not env (user-provided).

## Checklist

- [x] `.env.example` documents all above
- [ ] Replace any remaining hardcoded URLs/keys in app and engine with env reads
- [ ] CI: do not log or expose env values
