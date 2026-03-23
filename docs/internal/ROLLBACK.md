# Rollback procedure (roadmap item 38)

## Application rollback

1. **Revert deployment**
   - If using Docker: `docker compose down` then deploy previous image tag.
   - If using Node: stop process, restore previous build (e.g. from CI artifact), run `npm run start`.

2. **Database**
   - Migrations are forward-only; avoid running down-migrations in production unless prepared.
   - To rollback data: restore from last known-good backup before re-deploying old app version.

3. **Configuration**
   - Restore previous `.env` or config from backup if changed.

## Engine / data rollback

- Engine output is written to `ENGINE_OUT_DIR` (default `engine/out`). To rollback a run, replace `engine/out` with a backup copy or re-run engine from earlier data.

## Checklist

- [ ] Identify last known-good release (tag or commit).
- [ ] Notify operators if downtime is required.
- [ ] Restore app and/or data per above.
- [ ] Run health checks: `GET /api/health`, `GET /api/health/ready`.
- [ ] Document incident and trigger post-mortem if needed.
