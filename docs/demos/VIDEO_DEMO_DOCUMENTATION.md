# Munin Video Demo Documentation

**Date:** 2026-03-15  
**Purpose:** Documentation for screen-recorded demos, identified bugs, and fixes.

---

## Recorded Videos

| Video | Path | Duration | Description |
|-------|------|----------|-------------|
| Full Feature Test | `docs/demos/munin-full-feature-test-demo.mp4` | ~5 min | Systematic test of all 22 screens: login, dashboard, handshakes, simulation, ministries, audit, etc. |

**Note:** Demo videos (`.mp4`) are not committed to the repo. After recording, copy to `docs/demos/` from the recording output (e.g. `/opt/cursor/artifacts/`).

---

## Test Results Summary

### Screens Tested (22 total)

**Working (18):** Dashboard, Disaster demos, Carlisle flood demo, Simulation, Handshakes list, Ministries, Decisions, Playbooks, Resources, Shadow Report, Audit Log, Configuration, Tenants, API Docs, Users, Protocol Deep-Dive, Sovereign Runtime, Demo path

**Initially Failed (4):** Readiness Index, Historical Replay, Metrics, Packet detail (rate limit 429)

### Authentication

- **Login:** flood_officer_01 / demo
- **Logout:** Working
- **Auth guard:** Unauthenticated access to /graph redirects to login

---

## Bugs Identified and Fixes

### 1. Rate Limit Too Low for Rapid Testing

**Bug:** 60 requests/minute caused 429 errors when testing many screens quickly.

**Fix:** Increased to 300 requests/minute in development (`middleware.ts`).

```ts
const RATE_LIMIT_MAX_REQUESTS = process.env.NODE_ENV === 'development' ? 300 : 60;
```

### 2. Metrics Page JavaScript Error on Partial/Error Response

**Bug:** Metrics page crashed when API returned 429 or malformed data (accessing undefined properties).

**Fix:** Added optional chaining and null coalescing throughout `app/metrics/page.tsx`:
- `metrics.system_health?.nodes ?? 0`
- `metrics.engine_performance?.average_job_duration_ms ?? 0`
- `metrics.api_performance?.endpoints ?? {}`
- Handle 429 explicitly (retry on next interval)

### 3. Readiness / Replay Rate Limit

**Bug:** Same as #1 — rate limit hit during rapid navigation.

**Fix:** Same as #1 — higher dev limit resolves.

### 4. Packet Detail Diff Comparison

**Bug:** Could not test packet diff when rate limited.

**Fix:** Same as #1 — with higher limit, packet detail and "Compare with another packet" work.

---

## How to Run the Demo

```bash
# 1. Generate data
npm run engine

# 2. Start server
npm run dev

# 3. Seed demo user (in another terminal, with server running)
npm run seed:demo

# 4. Open http://localhost:3000
# 5. Login: flood_officer_01 / demo
# 6. Navigate through screens via left sidebar
```

---

## Notes for Future Recordings

- Run demos sequentially to avoid rate limits (or use dev mode with 300/min limit)
- Packet diff: Handshakes → click packet → "Compare with another packet" dropdown
- Evidence: Graph page → select node/edge → Context panel shows evidence
