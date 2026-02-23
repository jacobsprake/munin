# Next 100 Roadmap – Munin Backlog

**Purpose:** Single prioritized checklist of 100 next steps. Pick by tier (Critical → Nice-to-have) or by theme. See also: [MUNIN_ROADMAP.md](MUNIN_ROADMAP.md), [PRODUCTION_READINESS_ROADMAP.md](PRODUCTION_READINESS_ROADMAP.md), [THESIS_AUDIT.md](../THESIS_AUDIT.md).

---

## Tier 1: Critical (1–25)

### Thesis / core gaps
- [x] **1. Playbook trigger evaluation** – Evaluate playbook YAML triggers against normalized/live time-series in the engine pipeline; [engine/live_match.py](../engine/live_match.py), run.py.
- [x] **2. Match live to scenario** – Implement crisis-time lookup: match current situation to nearest pre-simulated scenario and surface playbooks; [engine/live_match.py](../engine/live_match.py) `match_live_to_scenario`.
- [x] **3. Coordination latency metric** – Compute and expose time-to-authorize (e.g. in packets or demo output); packetize: `timeToAuthorizeSeconds` in packet.

### Testing
- [x] **4. Jest config for Next/API** – Ensure Jest runs API routes and app code; [jest.config.js](../jest.config.js).
- [x] **5. API test: decisions create** – Test POST /api/decisions/create workflow; app/api/decisions/create/__tests__/route.test.ts.
- [x] **6. API test: decisions sign** – Test signing and verification; app/api/decisions/sign/__tests__/route.test.ts.
- [x] **7. API test: playbooks** – Test playbook CRUD or load; app/api/playbooks/__tests__/route.test.ts.
- [x] **8. API test: resources** – Test resource locking; app/api/resources/__tests__/route.test.ts.
- [x] **9. Lib test: audit/decisions** – Unit test decision workflow; lib/audit/__tests__/decisions.test.ts.
- [x] **10. Lib test: auth/RBAC** – Unit test permission checks; lib/auth/__tests__/rbac.test.ts.
- [x] **11. Lib test: resourceLocking** – Unit test conflict resolution; lib/__tests__/resourceLocking.test.ts.
- [x] **12. Engine integration test** – Test graph → incidents → packets pipeline; [engine/tests/test_engine_integration.py](../engine/tests/test_engine_integration.py).

### Demo & reviewer experience
- [x] **13. Storm Desmond historical replay** – Run demo with 2015 data and document time savings; [scripts/storm_desmond_replay.sh](../scripts/storm_desmond_replay.sh), engine/carlisle_demo.
- [x] **14. Single sign-off workflow** – Verify minimum_sign_off in packetize and &lt;2 min authorization path; [engine/tests/test_packetize_minimum_sign_off.py](../engine/tests/test_packetize_minimum_sign_off.py).
- [x] **15. Carlisle dashboard metrics** – Add time-to-authorize and Munin vs traditional comparison to Carlisle dashboard; app/carlisle-dashboard.
- [x] **16. Demo comparison viz** – Before/after or side-by-side visualization for demo; app/demos/page.tsx.

### Production & ops
- [x] **17. GitHub Actions: test** – Workflow runs tests on PR; [.github/workflows/test.yml](../.github/workflows/test.yml).
- [x] **18. GitHub Actions: build** – Build verification; [.github/workflows/build.yml](../.github/workflows/build.yml).
- [x] **19. Dockerfile** – Production container for app + engine; [Dockerfile](../Dockerfile).
- [x] **20. docker-compose** – Local dev stack; [docker-compose.yml](../docker-compose.yml).
- [x] **21. Env var audit** – Replace hardcoded secrets with env vars; [docs/ENV_AUDIT.md](ENV_AUDIT.md).
- [x] **22. .env.example** – Document required env vars; [.env.example](../.env.example).
- [x] **23. Deploy script** – Script for deploy (migrate + start); [scripts/deploy.sh](../scripts/deploy.sh).
- [x] **24. Health check endpoint** – /api/health or similar for readiness; app/api/health (exists).
- [x] **25. DB migrations in CI** – Run migrations in pipeline where applicable; [scripts/migrate.sh](../scripts/migrate.sh), workflows.

*See also: [PRODUCTION_READINESS_ROADMAP.md](PRODUCTION_READINESS_ROADMAP.md) Critical.*

---

## Tier 2: High (26–55)

### Testing (continued)
- [x] **26. API test: incidents** – Test incidents route; app/api/incidents/__tests__/route.test.ts.
- [x] **27. API test: graph** – Test graph route; app/api/graph/__tests__/route.test.ts.
- [x] **28. API test: engine/run** – Test engine run API; app/api/engine/run/__tests__/route.test.ts.
- [x] **29. API test: search** – Test search endpoint; app/api/search/__tests__/route.test.ts.
- [ ] **30. Component test: GlobalSearch** – React component test; components.
- [ ] **31. Integration: E2E decision flow** – Incident → packet → decision → sign → authorize; tests.
- [ ] **32. Integration: DB** – Migrations and integrity; tests.
- [x] **33. Security test: RBAC** – Unauthorized access attempts; app/api/__tests__/security/rbac.test.ts.
- [x] **34. Security test: input validation** – Malformed JSON/YAML, path traversal; app/api/__tests__/security/inputValidation.test.ts.
- [x] **35. Security test: crypto** – Signature and audit log integrity; app/api/__tests__/security/crypto.test.ts.

### CI/CD & deployment
- [x] **36. Deploy workflow** – Staging/deploy job; [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).
- [x] **37. Migrate script** – scripts/migrate.sh for DB; scripts (exists).
- [x] **38. Rollback procedure** – Document or script rollback; [docs/ROLLBACK.md](ROLLBACK.md).

### Security & crypto
- [ ] **39. PQC (ML-DSA, FIPS 204)** – Replace Ed25519 for handshake signatures; lib/audit, research.
- [ ] **40. Key management for PQC** – Key generation and storage; lib.
- [ ] **41. TEE integration plan** – Document or stub TEE for signing; docs or lib/tee.
- [ ] **42. No hardcoded secrets** – Audit and remove; codebase.

### Evidence & quality
- [ ] **43. Evidence dashboard in app** – Link or embed evidence quality from CLI in UI; app.
- [ ] **44. Confounder tests on historical data** – Run confounder checks on saved runs; engine/analysis.
- [ ] **45. LOW confidence review workflow** – Document or implement human review for LOW links; docs or app.
- [ ] **46. False positive rate metric** – Track FP rate on historical data; engine/analysis.

### Real-time & data
- [x] **47. EA API poll script** – Periodic poll (e.g. every 15 min); [engine/poll_ea_api.py](../engine/poll_ea_api.py) (verified).
- [ ] **48. Threshold monitor** – Check thresholds and fire alerts; engine/threshold_monitor or poll.
- [ ] **49. Auto-trigger playbook on breach** – When threshold exceeded, trigger playbook; engine.
- [ ] **50. Alert system** – Email/SMS/webhook for operators; app/api/alerts.
- [ ] **51. Scheduler for poll** – Cron or systemd timer for poll_ea_api; docs/scripts.

### Demo & docs
- [x] **52. Document single sign-off** – In demo or HOW_MUNIN_IS_FAST; [docs/HOW_MUNIN_IS_FAST.md](HOW_MUNIN_IS_FAST.md).
- [x] **53. Time-to-authorize in packet** – Store and display in UI; packet schema (timeToAuthorizeSeconds), app/carlisle-dashboard.
- [x] **54. Runbook for operators** – Update OPERATIONS_RUNBOOK with latest flows; [docs/OPERATIONS_RUNBOOK.md](OPERATIONS_RUNBOOK.md).
- [x] **55. Error handling in API** – No stack traces in prod, sanitized messages; [lib/apiError.ts](../lib/apiError.ts).

*See also: [MUNIN_ROADMAP.md](MUNIN_ROADMAP.md) Production Readiness.*

---

## Tier 3: Medium (56–80)

### Sovereign features
- [ ] **56. Chaos scenario library extension** – Cyber, multi-sector scenarios in library; engine/scenarios or chaos_simulator.
- [ ] **57. Impact metrics: lives at risk** – Per scenario; engine.
- [ ] **58. Impact metrics: GDP at risk** – Per scenario; engine.
- [ ] **59. Readiness reports** – Generate from scenario results; engine or app.
- [ ] **60. GET /api/readiness/benchmark** – Aggregate metrics endpoint; app/api.
- [ ] **61. Readiness score formula** – Single defensible number; lib or app.
- [ ] **62. /readiness dashboard** – Page with score and trends; app/readiness.
- [ ] **63. Sector breakdown** – Readiness by sector; app or API.

### Real-time & SCADA
- [ ] **64. Protocol translator: Modbus** – Ingest Modbus; engine/scada_ingest.
- [ ] **65. Protocol translator: DNP3 or OPC UA** – At least one more; engine.
- [ ] **66. Real-time pipeline** – engine/realtime_pipeline.py or equivalent.
- [ ] **67. Real-time graph updates** – Update dependency graph from stream; engine.

### Physical verification
- [ ] **68. RF/acoustic integration** – Wire existing components; engine/physics_ingest, components.
- [ ] **69. Digital vs physical verification pipeline** – Engine comparison of SCADA vs RF/acoustic.
- [ ] **70. Document verification flow** – In docs; docs.

### Integrations
- [ ] **71. Multi-step planning + Carlisle** – Integrate agentic_reasoning (suggestions only) with flood playbook; engine.
- [ ] **72. Byzantine 2-of-3 workflow** – Test and document; engine, app.
- [ ] **73. Multi-river Caldew** – Add Caldew station, update playbook; engine/carlisle_config.
- [ ] **74. Rainfall telemetry** – EA rainfall data, playbook triggers; ea_flood_client, carlisle_config.

### Production hardening
- [ ] **75. Rate limiting** – API rate limits; app.
- [ ] **76. CORS and security headers** – CSP, HSTS; app.
- [ ] **77. DB connection TLS** – If applicable; config.
- [ ] **78. Logging and alerts** – Structured logs, alert on critical errors; app, docs.
- [ ] **79. Performance: cascade sim** – Benchmark and document; engine, munin perf.
- [ ] **80. Performance: shadow link detection** – Benchmark; engine.

*See also: [ESSENTIAL_SOVEREIGN_FEATURES.md](ESSENTIAL_SOVEREIGN_FEATURES.md).*

---

## Tier 4: Nice-to-have (81–100)

### Byzantine & demo
- [ ] **81. Biometric tablet integration** – Wire BiometricTabletPanel; components, app.
- [ ] **82. Air-gapped terminal doc** – Document workflow; docs.
- [ ] **83. Treason-proofing demo** – Full M-of-N demo; docs/demo.

### Performance & benchmarks
- [ ] **84. Benchmark suite** – Cascade, shadow link, playbook gen; engine or scripts.
- [ ] **85. Optimization targets** – Document targets; docs.
- [ ] **86. Load test API** – Basic load test; tests or scripts.

### Documentation
- [ ] **87. Operator training outline** – What operators need to know; docs.
- [ ] **88. Regulatory mapper expansion** – More jurisdictions; engine/compliance/regulatory_mapper.
- [ ] **89. Statutory mapping update** – research/statutory-mapping; research.
- [ ] **90. API reference** – OpenAPI or generated docs; app or docs.

### R&D and formal methods
- [ ] **91. Formal methods: spec** – High-level spec for critical path; docs/FORMAL_METHODS.
- [ ] **92. R&D: new modules** – Per R_AND_D_ROADMAP; engine, research.
- [ ] **93. Shadow mode E2E** – Full shadow run and comparison; tests/docs.
- [ ] **94. Counterfactual analysis** – Integrate counterfactual in reports; engine.

### Polish
- [ ] **95. Accessibility (a11y)** – Basic a11y for key pages; app.
- [ ] **96. i18n placeholder** – If multi-jurisdiction; app.
- [ ] **97. Mobile-responsive dashboard** – Carlisle/readiness; app.
- [ ] **98. Export readiness report** – PDF or CSV; app.
- [ ] **99. Audit log export** – Scheduled or on-demand; app, scripts.
- [x] **100. Changelog and release notes** – Keep CHANGELOG or release docs; [CHANGELOG.md](../CHANGELOG.md).

*See also: [R_AND_D_ROADMAP.md](R_AND_D_ROADMAP.md), [docs/FORMAL_METHODS.md](FORMAL_METHODS.md).*

---

## Progress

- **Completed:** Check off items above by changing `- [ ]` to `- [x]`.
- **Last updated:** Second batch: 6–11 (API tests decisions/sign, playbooks, resources; lib tests audit/decisions, auth/rbac, resourceLocking). 13–16 (Storm Desmond replay script, single sign-off test, Carlisle metrics label, demo comparison viz). 21 (env audit doc). 26–29 (API tests incidents, graph, engine/run, search). 33–35 (security tests RBAC, input validation, crypto). 36–38 (deploy workflow, migrate, rollback). 47 (EA poll verified). 52–55 (HOW_MUNIN_IS_FAST, time-to-authorize in UI, runbook update, apiError). CHANGELOG (100): add CHANGELOG.md placeholder.
