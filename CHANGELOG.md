# Changelog (roadmap item 100)

All notable changes to the Munin project are documented here.

## [Unreleased]

### Added
- Next 100 Roadmap backlog (docs/NEXT_100_ROADMAP.md) with 100 prioritized items.
- API tests: decisions/sign, playbooks, resources, graph, engine/run, search, incidents.
- Lib tests: audit/decisions, auth/rbac, resourceLocking.
- Security tests: RBAC, input validation, crypto (signature integrity).
- Storm Desmond replay script (scripts/storm_desmond_replay.sh).
- Single sign-off verification test (engine/tests/test_packetize_minimum_sign_off.py).
- Env audit doc (docs/ENV_AUDIT.md), rollback procedure (docs/ROLLBACK.md).
- Deploy workflow (.github/workflows/deploy.yml).
- HOW_MUNIN_IS_FAST (docs/HOW_MUNIN_IS_FAST.md), apiError sanitization (lib/apiError.ts).
- Demo comparison viz on demos page; Carlisle dashboard “Munin vs traditional” metrics label.
- OPERATIONS_RUNBOOK updated with deploy and health section.

### Fixed
- Duplicate variable in lib/audit/decisions.ts (userRow for key status and public key).

---

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
