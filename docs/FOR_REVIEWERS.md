# Munin — 10-Minute Reviewer Tour

> See the entire system in action: from raw SCADA telemetry to signed authorisation packet.

---

## 00:00–02:00 — Run the Demo

```bash
# One command: run the full Carlisle flood scenario
./demo.sh

# Expected output:
# ✓ Loading Carlisle flood data...
# ✓ Detecting Shadow Links...
#   (Found 5 cross-sector dependencies, 7 edges total)
# ✓ Simulating cascade...
#   (Testing 38 scenarios)
# ✓ Generating playbooks...
#   (38 packets, 4 response options)
#
# Traditional response: 2–6 hours
# Munin response: 1.5 seconds
```

Then open the platform:

```bash
npm run dev
# Open http://localhost:3000
```

You'll see the government-grade login screen with classification banners.
Click **"ENTER AS OBSERVER"** to access the command interface.

---

## 02:00–05:00 — Explore the Authorisation Packet Lifecycle

### In the UI

Navigate to **Handshakes** in the left sidebar:
- See 29+ handshake packets, each with status (READY), region, and timestamp
- Click any packet to see the **Packet Preview** panel:
  - **Situation Summary**: What happened and why
  - **Proposed Action**: What Munin recommends
  - **Audit Integrity**: VERIFIED (Merkle chain)

### Sample packet lifecycle (in the repo)

Open `samples/packets/flood_city_x/`:

| File | Status | What it shows |
|------|--------|---------------|
| `01_detection.json` | draft | Initial detection, uncertainty 62%, 3 evidence refs |
| `02_recommend_preemptive_gate_open.json` | ready | Scope expanded to 5 nodes, confidence 82%, action plan |
| `03_ministry_sign_off.json` | authorized | 2-of-3 ministry signatures, PQC signed |
| `04_executed.json` | executed | TEE attestation, Merkle chain linked, 12 min total |

Each packet has every field from the spec: `scope`, `regulatoryBasis`, `uncertainty`, `technicalVerification`, `multiSig`, `pqc`, `tee`, `merkle`.

---

## 05:00–07:00 — Inspect Shadow Links and Evidence Quality

```bash
# Run evidence quality dashboard
./scripts/munin evidence-quality

# Run shadow link detection standalone
python3 engine/detect_shadow_link.py
# Output:
# [MATCH] 88.1% Temporal Correlation found.
# [WARNING] Physical Shadow Link detected. Cross-sector vulnerability confirmed.
```

### What makes shadow links trustworthy

The system doesn't just find correlations — it checks:
- **Stability**: Does the correlation hold across multiple time windows?
- **Confounders**: Is weather/load shedding causing a spurious link?
- **Counterexamples**: Are there windows where the correlation breaks?
- **Sensor health**: Is the source data degraded (missing, stuck, drifting)?

See `engine/infer_graph.py` for the algorithm and `engine/sensor_health.py` for quality checks.

---

## 07:00–10:00 — Review the Security and Institutional Depth

### Security Architecture
- **`SECURITY.md`** — Authentication (Argon2id), session management (HMAC), air-gap enforcement (CSP), cryptographic status table
- **`docs/PRODUCTION_SECURITY_ROADMAP.md`** — 5-phase roadmap from prototype to government certification, with budgets and timelines
- **`docs/threat_model.md`** — STRIDE threat model: assets, adversaries, attack paths, countermeasures

### Institutional Integration
- **`research/sops/munin_integration_sop_v1.md`** — Standard Operating Procedure for multi-agency flood response using Munin
- **`research/reg_mapping.md`** — Regulatory mapping: every packet field mapped to CCA 2004, NIS2, NERC CIP
- **`docs/risk_register.md`** — 10 risks (technical + sociopolitical) with likelihood, impact, and product-level mitigations

### UX Rationale
- **`docs/ux/authorisation_console.md`** — Why each UI element exists: failure modes addressed, design decisions
- **`docs/ux/failure_modes.md`** — 6 adversarial operator scenarios and how the system mitigates them

### SCADA Integration
- **`docs/SCADA_INGESTION_GUIDE.md`** — How Munin inhales data from Modbus, DNP3, OPC UA, PI Historian, etc.
- **`config/connectors.example.yaml`** — Template for connecting to real SCADA systems

---

## Key Files at a Glance

| What | Where |
|------|-------|
| End-to-end demo | `./demo.sh` |
| Engine pipeline | `engine/run.py` |
| Shadow link detection | `engine/detect_shadow_link.py` |
| Graph inference | `engine/infer_graph.py` |
| Packet types | `lib/packet/types.ts` |
| Packet validation | `lib/packet/validate.ts` |
| Packet diff engine | `lib/packet/diff.ts` |
| Handshake state machine | `lib/packet/handshake_state_machine.ts` |
| Sample packet lifecycle | `samples/packets/flood_city_x/` |
| City topology | `data/topology/city-x.json` |
| Byzantine multi-sig | `engine/byzantine_resilience.py` |
| Sovereign handshake | `engine/sovereign_handshake.py` |
| All 8 playbooks | `playbooks/*.yaml` |
| Merkle chain | `lib/merkle.ts` |
| PQC (Dilithium-3) | `lib/pqc.ts` |
| TEE (SGX) | `lib/tee.ts` |
| Zero-trust | `lib/zeroTrust.ts` |
| Ministry API | `app/api/ministries/route.ts` |
| Session auth | `lib/auth/sessions.ts` |
| 44 test suites (216 tests) | `npm test` |
| 59 Python tests | `PYTHONPATH=engine pytest engine/tests/` |

---

## What's Real vs Roadmap

| Feature | Status | Notes |
|---------|--------|-------|
| Shadow link detection | ✅ Real | Finds cross-sector dependencies from telemetry |
| Cascade simulation | ✅ Real | 29+ scenarios with timeline prediction |
| Byzantine M-of-N multi-sig | ✅ Real | Biometric handshake + quorum verification |
| Merkle-chained audit log | ✅ Real | Tamper-evident, hash-chained, verifiable |
| Ed25519 signatures | ✅ Real | @noble/ed25519 v3 |
| Argon2id password hashing | ✅ Real | OWASP recommended |
| Air-gap CSP enforcement | ✅ Real | Zero external network requests |
| Session management | ✅ Real | HMAC-SHA256 tokens, no cloud JWT |
| PQC (Dilithium-3) | ⚠️ Demo | Architecture ready; needs liboqs bindings |
| TEE (Intel SGX) | ⚠️ Demo | Architecture ready; needs SGX hardware |
| ZKP proofs | ⚠️ Demo | Architecture ready; needs circom/snarkjs |
| HSM key storage | 🗺️ Roadmap | Requires FIPS 140-3 HSM procurement |
| Hardware data diode | 🗺️ Roadmap | Requires Owl/Waterfall hardware |
