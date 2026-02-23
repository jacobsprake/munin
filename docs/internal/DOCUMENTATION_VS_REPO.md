# Documentation vs repo checklist

This note records what is documented in Munin docs (README, ARCHITECTURE, FOR_REVIEWERS, docs index, etc.) and whether the corresponding artifact exists in the repo. Use it to avoid doc/repo drift.

---

## Resolved (was missing, now added)

| Documented | Location in repo | Status |
|------------|------------------|--------|
| Fallback playbook when incident type has no mapping | `engine/packetize.py` references `default.yaml` | **Added** `playbooks/default.yaml` – minimal fallback so unmapped incident types get a defined playbook instead of empty `{}`. |

---

## Verified present (documentation matches repo)

- **Scripts:** `demo.sh`, `./scripts/munin`, `scripts/setup_demo.sh`, `scripts/verify_demo.sh`, `scripts/run_engine.sh`, `scripts/deploy.sh`
- **CLI subcommands:** `munin evidence-quality`, `munin regulatory [UK|US|EU]`, `munin demo carlisle`, `munin scenarios analyze`, `munin viz cascade` – implemented in `engine/cli.py`
- **Engine modules** referenced in README/ARCHITECTURE: `ingest.py`, `infer_graph.py`, `sensor_health.py`, `build_incidents.py`, `packetize.py`, `byzantine_resilience.py`, `sovereign_handshake.py`, `agentic_reasoning.py`, `logic_lock.py`, `cmi_prioritization.py`, `physical_verification.py`, `provenance_ledger.py`, `shadow_simulation.py`, `liability_shield.py`, `data_diode.py`, `protocol_translator.py`, `wide_bandgap_edge.py`, `sovereign_mesh.py`, `digital_asset_vault.py`, `biometric_key.py`, `satellite_verification.py`, `n_version_programming.py`, `safety_plc.py`, `sovereign_digital_twin.py`
- **Lib/components:** `lib/zeroTrust.ts`, `lib/tee.ts`, `lib/merkle.ts`; `components/ZeroTrustIndicator.tsx`, `GraphCanvas.tsx`, `EvidencePanel.tsx`, `SimulationScrubber.tsx`, `AgenticReasoningPanel.tsx`, `DigitalTwinShadow.tsx`, `HandshakePanel.tsx`, `PacketTable.tsx`, `SovereignMeshPanel.tsx`, `DigitalAssetVaultPanel.tsx`, `BiometricTabletPanel.tsx`
- **API routes:** `app/api/decisions/create/route.ts`, `app/api/decisions/sign/route.ts`, and other documented routes
- **Research/docs:** `research/pqc-whitepaper.md`, `research/statutory-mapping.md`; `docs/plug-and-play-architecture.md`, `docs/safety-architecture.md`, `docs/2026-reality-features.md`; `docs/README.md` (index) and linked docs
- **Disaster baselines:** `engine/fixtures/disaster_baselines/` with Katrina, Fukushima, UK 2007, 9/11 baseline JSONs; `README_DEMO.md` at repo root

---

## Intentional doc vs code differences

- **Extended capabilities / future roadmap:** README and ARCHITECTURE describe sovereign mesh, satellite verification, digital vault, safety PLCs, n-version, wide-bandgap edge, etc. Many of these have **stub or demo implementations** (files exist, may not be fully production-hardened). Docs now state that the main v1 story is wedge + trust and that the full stack is “extended capabilities and future roadmap.”
- **ML-DSA (FIPS 204):** Documented as the chosen algorithm; implementation status is “algorithm selected, not yet implemented” in CONTRIBUTING/ARCHITECTURE. PQC whitepaper and docs describe the standard; code still uses Ed25519 until PQC is implemented.
- **Playbook designer:** Documented as generating playbooks from law codes; implemented in `engine/playbook_design.py` and `engine/compliance/regulatory_corpus.py`. Output is draft YAML in `playbooks/generated/` for human review.

---

## How to keep this in sync

- When adding a **new documented feature**, add the corresponding file or stub and note it here if it’s a key user-facing item.
- When **removing or renaming** a file that docs reference, update the doc and this checklist.
- After major doc updates, re-run a quick scan: grep for `engine/`, `app/`, `components/`, `scripts/`, `playbooks/`, `research/`, `docs/` in README and ARCHITECTURE and confirm paths exist.
