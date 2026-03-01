# Munin Formal Threat Model

**Document ID:** TM-001 v1.0  
**Classification:** OFFICIAL-SENSITIVE  
**Date:** 2026-03-01  
**Owner:** Security Architecture Unit, National Resilience Directorate  
**Methodology:** STRIDE + Attack-Tree decomposition

---

## 1. System Boundary

This threat model covers the Munin Sovereign Infrastructure Orchestration Platform as deployed in an air-gapped environment with a hardware data diode. The system boundary includes:

- **Ingestion perimeter:** Hardware data diode → Protocol Translation Layer → Time-series normalisation
- **Processing core:** Dependency graph inference → Sensor health → Incident simulation → Packet generation
- **Trust boundary:** TEE enclave (signing) → Merkle chain (audit) → Byzantine multi-sig (authorisation)
- **Operator interface:** Next.js frontend (UI) + API routes + CLI
- **Storage:** SQLite database (`data/munin.db`), file-system outputs (`engine/out/`)

Components outside the system boundary (but interfacing with it): SCADA historians, physical sensors, ministry air-gapped terminals, satellite verification feeds.

---

## 2. Assets

| Asset ID | Asset | Description | Confidentiality | Integrity | Availability |
|----------|-------|-------------|-----------------|-----------|--------------|
| A-001 | **Topology Graph** | Dependency graph (`engine/out/graph.json`) containing nodes, edges, shadow links, correlations, and lag values. Reveals the inferred physical coupling structure of national infrastructure. | **CRITICAL** — Reveals attack paths through infrastructure (which assets to target for maximum cascade). | **CRITICAL** — A tampered graph produces incorrect cascade predictions, leading to wrong playbook activation or missed cascades. | **HIGH** — Loss of graph degrades Munin to non-functional; manual coordination resumes. |
| A-002 | **Telemetry Time-Series** | Normalised SCADA data (`engine/out/normalized_timeseries.csv`) from all monitored sectors. | **HIGH** — Reveals operational patterns, maintenance schedules, and capacity limits. | **CRITICAL** — Manipulated telemetry produces false shadow links or masks genuine dependencies. | **HIGH** — Loss of telemetry blinds the inference engine. |
| A-003 | **Authorisation Packets** | Signed handshake packets (`engine/out/packets/*.json`) containing proposed actions, evidence, regulatory basis, multi-sig status, and Merkle receipts. | **HIGH** — Contains operational plans and approval status that could be exploited for intelligence or disruption. | **CRITICAL** — A forged packet could authorise actions that were never approved or inject false regulatory basis. | **CRITICAL** — Loss of packets means authorised actions cannot be executed or audited. |
| A-004 | **Cryptographic Keys** | PQC key pairs (`lib/pqc.ts`), TEE enclave keys (`lib/tee.ts`), Ed25519 signing keys (`lib/audit/ed25519.ts`), and biometric handshake signatures (`engine/byzantine_resilience.py`). | **CRITICAL** — Key compromise enables forgery of any signed artifact. | **CRITICAL** — Tampered keys invalidate the entire trust chain. | **HIGH** — Key loss prevents new packet signing but does not affect previously signed packets. |
| A-005 | **Audit Log** | Merkle-chained append-only log (`engine/out/audit.jsonl`, `lib/audit/auditLog.ts`). | **HIGH** — Contains complete action history and approval chain. | **CRITICAL** — Tampered audit log destroys legal defensibility and non-repudiation. | **HIGH** — Loss of audit log removes accountability guarantee. |
| A-006 | **Playbook Library** | YAML playbook definitions (`playbooks/*.yaml`) with trigger conditions, actions, and regulatory compliance references. | **MEDIUM** — Reveals response strategies. | **HIGH** — Tampered playbooks could inject incorrect actions or remove safety constraints. | **MEDIUM** — Loss of playbooks degrades packet generation to default actions. |
| A-007 | **Evidence Windows** | Statistical evidence (`engine/out/evidence.json`) with per-window correlations, quality context, and support/counterexample classifications. | **MEDIUM** — Reveals data quality and confidence levels. | **HIGH** — Tampered evidence could suppress counterexamples or inflate confidence, enabling unsafe approvals. | **MEDIUM** — Loss degrades packet confidence computation. |

---

## 3. Adversaries

### ADV-001: Foreign State Actor

| Attribute | Description |
|-----------|-------------|
| **Motivation** | Pre-positioning for infrastructure disruption during geopolitical conflict. Mapping target nation's infrastructure dependencies for future attack planning. Intelligence collection on crisis response capabilities. |
| **Capability** | Nation-state cyber capabilities (APT-level). Hardware supply-chain compromise (e.g., malicious firmware in SCADA equipment). Potential co-location with TEE hardware (for side-channel attacks on cloud deployments — mitigated by air-gapped deployment). |
| **Access** | External: no direct access due to air gap. Indirect: via supply-chain compromise of SCADA equipment, hardware data diode, or TEE hardware. Potential insider recruitment. |
| **Relevant Assets** | A-001 (topology graph for attack planning), A-002 (telemetry for operational intelligence), A-004 (keys for packet forgery). |

### ADV-002: Malicious Insider

| Attribute | Description |
|-----------|-------------|
| **Motivation** | Financial gain (selling infrastructure intelligence), ideological sabotage (eco-terrorism, political extremism), coercion by external actors, personal grievance. |
| **Capability** | Authorised system access (MO, SO, or IC role). Knowledge of system architecture and operational procedures. Ability to manipulate inputs within their authorised scope. |
| **Access** | Authenticated access to the Munin UI, CLI, and (depending on role) direct file-system access to `engine/out/` outputs. Physical access to air-gapped terminals if holding a ministry role. |
| **Relevant Assets** | All assets. The insider's access level determines which assets are reachable. |

### ADV-003: Misconfigured or Untrained Operator

| Attribute | Description |
|-----------|-------------|
| **Motivation** | None (non-adversarial). Actions are unintentional but produce adversary-like effects: incorrect approvals, missed alerts, corrupted data. |
| **Capability** | Authorised system access with limited understanding of system behaviour. Prone to errors under time pressure. |
| **Access** | Same as ADV-002 but without malicious intent. |
| **Relevant Assets** | A-003 (incorrect packet approval), A-005 (inconsistent audit entries), A-006 (playbook misconfiguration). |

---

## 4. Attack Paths

### AP-001: Authorisation Packet Forgery

| Attribute | Description |
|-----------|-------------|
| **Attack Path** | Adversary (ADV-001 or ADV-002) creates a fake authorisation packet with fabricated evidence, regulatory basis, and multi-sig approvals, injecting it into `engine/out/packets/` or via the `/api/packets` endpoint. The forged packet is then presented to operators as a legitimate Munin recommendation. |
| **Target Assets** | A-003 (packets), A-004 (keys), A-005 (audit log) |
| **Prerequisites** | File-system write access to `engine/out/packets/` (insider) OR compromise of the `/api/packets` endpoint OR compromise of signing keys. |
| **Impact** | Operators approve and potentially act on a fabricated recommendation. If the forged packet recommends dam closure during a flood, the action could trap water upstream and cause upstream flooding. |

#### Countermeasure: Merkle Chain + TEE

| Layer | Implementation | How It Blocks This Attack |
|-------|---------------|---------------------------|
| **Merkle chain verification** | `lib/merkle.ts` — `verifyMerkleChain()`, `engine/packetize.py` — `generate_merkle_receipt()` | Every packet is chained to the previous via `receiptHash = SHA-256(previousHash + ":" + packetHash)`. A forged packet that does not extend the existing chain will break chain verification. The MO runs `verifyMerkleChain()` before presenting packets to operators (per SOP-MUN-001, Step 5). |
| **TEE signature verification** | `lib/tee.ts` — `signPacketInTEE()`, `verifyTEESignature()` | Legitimate packets carry a TEE signature generated inside a hardware enclave. The signature includes the `packetHash`, `enclaveId`, `nonce`, and attestation `quote`. A forged packet cannot produce a valid TEE signature without access to the enclave's hardware-derived key. `verifyTEESignature()` checks packet hash match, attestation format, and timestamp freshness (< 60 minutes). |
| **PQC signature** | `lib/pqc.ts` | Packets carry an ML-DSA (FIPS 204) post-quantum signature. Forgery requires the private key, which is stored in the TEE enclave. |
| **Ed25519 audit log** | `lib/audit/auditLog.ts`, `lib/audit/ed25519.ts` | Packet creation events are logged with Ed25519 signatures. A forged packet that was not created through the legitimate pipeline will have no corresponding audit entry. |
| **API input validation** | `app/api/packets/route.ts`, `lib/packet/validate.ts` | The API validates packet structure against the schema. Malformed packets are rejected before reaching the UI. |

**Residual risk:** If the attacker compromises both the TEE enclave (extracting the signing key) and the Merkle chain (forking from the correct chain head), the forgery becomes undetectable. This requires hardware-level access to the TEE and file-system access to the Merkle chain — a combination mitigated by air-gapped deployment.

---

### AP-002: Audit Log Tampering

| Attribute | Description |
|-----------|-------------|
| **Attack Path** | Adversary (ADV-002) modifies existing entries in `engine/out/audit.jsonl` to conceal unauthorised actions, alter the approval timeline, or remove evidence of rejected packets. Alternatively, the adversary inserts fabricated entries to create a false record of approvals that never occurred. |
| **Target Assets** | A-005 (audit log), A-004 (keys) |
| **Prerequisites** | File-system write access to `engine/out/audit.jsonl`. For entry insertion, knowledge of the Ed25519 signing key. |
| **Impact** | Destruction of legal defensibility. Post-incident inquiry cannot determine who approved what and when. Operators lose the liability shield that Munin provides. |

#### Countermeasure: Merkle Chain + Ed25519 Signatures + Checkpoints

| Layer | Implementation | How It Blocks This Attack |
|-------|---------------|---------------------------|
| **Hash chain** | `lib/audit/auditLog.ts` — `entry_hash = SHA-256(canonical(payload) + prev_hash)` | Modifying any entry changes its hash, which breaks the chain for all subsequent entries. `verifyChainIntegrity()` detects the break. |
| **Ed25519 signatures** | `lib/audit/ed25519.ts` | Each signed entry carries an Ed25519 signature over `entry_hash:signer_id:key_id`. Fabricating an entry requires the signer's private key. `verifySignature()` validates authenticity. |
| **Key management** | `lib/audit/keyManagement.ts` | Keys have status tracking: `ACTIVE`, `REVOKED`, `ROTATED`. Compromised keys are revoked, preventing further signing. Key rotation creates a new key, invalidating the old one for future entries while preserving verification of past entries. |
| **Sequence numbers** | `lib/audit/auditLog.ts` | Each entry has a monotonically increasing sequence number. Deletion of entries creates gaps detectable by sequence verification. |
| **Checkpoints** | `lib/audit/auditLog.ts` | Periodic checkpoints capture `chain_head_hash`, `timestamp`, and `sequence_number`. Verification can start from a checkpoint, reducing the window of vulnerability. |
| **External replication** | Recommended operational procedure | Regular export of audit log checksums to an off-system record (e.g., paper printout of sovereign hash from `lib/merkle.ts` — `computeSovereignHash()`) provides a tamper-independent verification point. |

**Residual risk:** If the adversary has the Ed25519 signing key AND file-system access, they can rewrite the entire audit log from scratch with valid signatures. Mitigation: key storage in TEE enclave, key rotation on schedule, and external checkpoint replication.

---

### AP-003: Shadow-Link Poisoning

| Attribute | Description |
|-----------|-------------|
| **Attack Path** | Adversary (ADV-001) manipulates SCADA telemetry at the source (before the data diode) to inject correlated signals between nodes that are not physically dependent. This creates false shadow links in the dependency graph. The false links cause Munin to predict cascades that will not occur, leading to unnecessary protective actions (false positives) or, worse, cause Munin to recommend actions that create actual cascading failures (e.g., isolating a pump station that is actually independent). |
| **Target Assets** | A-002 (telemetry), A-001 (topology graph) |
| **Prerequisites** | Ability to manipulate SCADA sensor data at the source or in transit (before the data diode). This requires compromising SCADA equipment, historian databases, or the protocol translation layer. |
| **Impact** | False shadow links degrade Munin's graph accuracy. In the worst case, operators act on false cascade predictions and create real cascades through unnecessary protective actions. |

#### Countermeasure: Data Diode + Evidence Cross-Checks

| Layer | Implementation | How It Blocks This Attack |
|-------|---------------|---------------------------|
| **Hardware data diode** | `engine/data_diode.py` — `DataDiodeEnforcer` | The data diode ensures one-way data flow INTO Munin. An attacker cannot use Munin as a vector to manipulate SCADA systems. However, the diode does not prevent poisoned data from flowing in. |
| **Sensor health pre-filtering** | `engine/sensor_health.py` — `detect_missingness()`, `detect_stuck_at()`, `detect_drift()` | Manipulated telemetry often exhibits statistical anomalies: injected correlations may produce drift (abrupt signal changes), stuck-at patterns (artificially constant values), or unusual missingness. Sensor health checks flag these anomalies before they enter the inference engine. |
| **Stability score filtering** | `engine/infer_graph.py` — `compute_stability_score()` | Injected correlations that are not sustained across all 5 evidence windows (24-hour overlapping) produce low stability scores. Only edges with `stability >= 0.3` are included. A poisoning attack must sustain false correlations consistently across multiple days to survive this filter. |
| **Counterexample surfacing** | `engine/sensor_health.py` — `build_evidence_windows()` | Windows where the poisoned correlation does not hold are classified as `"counterexample"` and surfaced to operators. Unless the attacker can maintain perfect correlation across all time windows, counterexamples will alert operators. |
| **Physical verification** | `engine/physical_verification.py` | RF/acoustic fingerprinting cross-checks digital SCADA readings against physical emissions. A sensor reporting falsified data will show a mismatch between the digital reading and the RF/acoustic fingerprint. This is the ultimate defence against Stuxnet-style attacks. |
| **Satellite verification** | `engine/satellite_verification.py` | Space-based verification (InSAR, SAR, optical) provides an independent data channel. A sensor claiming "reservoir full" while satellite imagery shows no ground deformation exposes the lie. |
| **Provenance ledger** | `engine/provenance_ledger.py` | Every data point is hashed at source: `hash = SHA-256(sensor_id:timestamp:value)`. Merkle tree construction over all data points creates a root hash. Any alteration of historical data changes the root hash, enabling detection. |
| **N-version programming** | `engine/n_version_programming.py` | Multiple inference engine versions (correlation-based, causal, hybrid) run in parallel. Poisoned data that fools the correlation-based engine may not fool the causal or rule-based engines, triggering a consensus failure that halts the system. |
| **Evidence quality dashboard** | `engine/analysis/evidence_quality.py`, CLI: `munin evidence-quality` | The MO can review HIGH/MEDIUM/LOW confidence distribution and confounder analysis for all edges. A cluster of new HIGH-confidence shadow links appearing simultaneously would be suspicious. |

**Residual risk:** A sophisticated attacker who controls multiple sensors across sectors, sustains false correlations for weeks, and does so within the statistical profile of normal data (no drift, no stuck-at, consistent across windows) could evade all automated filters. Mitigation: human review by SSMEs who have domain knowledge of physical infrastructure, and periodic cross-reference with satellite and physical verification data.

---

### AP-004: Insider Key Compromise and Signature Replay

| Attribute | Description |
|-----------|-------------|
| **Attack Path** | A malicious insider (ADV-002) with access to Ed25519 private keys (`lib/audit/keyManagement.ts`) or PQC private keys (`lib/pqc.ts`) exfiltrates key material and uses it to forge signatures on fabricated audit log entries or authorisation packets. Alternatively, the insider replays captured TEE signatures (`lib/tee.ts` — `TEESignature`) on different packets. |
| **Target Assets** | A-004 (keys), A-003 (packets), A-005 (audit log) |
| **Prerequisites** | Access to key storage (file system, memory, or HSM). For replay: ability to capture a valid TEE signature and substitute a different packet. |
| **Impact** | Forged signatures enable creation of fake authorisation records and packets that appear legitimate. |

#### Countermeasure: TEE Key Isolation + Nonce + Key Rotation

| Layer | Implementation | How It Blocks This Attack |
|-------|---------------|---------------------------|
| **TEE key isolation** | `lib/tee.ts` — keys generated and stored inside enclave | In production deployment, signing keys are generated inside the TEE enclave and never leave it. Even root access cannot extract the key. The key exists only in hardware-protected memory. |
| **Nonce-based replay prevention** | `lib/tee.ts` — `TEESignature.nonce` | Each TEE signature includes a cryptographic nonce: `nonce = random(16 bytes)`. The signature is computed over `packetHash:enclaveId:nonce:timestamp`. Replaying a signature on a different packet fails because the `packetHash` does not match. |
| **Attestation freshness** | `lib/tee.ts` — `verifyTEESignature()` | Attestation timestamps older than 60 minutes are rejected. A replayed signature with a stale timestamp fails verification. |
| **Key rotation** | `lib/audit/keyManagement.ts` | Ed25519 keys support rotation. Compromised keys are marked `REVOKED`. Revoked keys cannot sign new entries (checked by `verifySignature()`). Key rotation creates a new key with a new `key_id`, preserving verification of historical entries signed with the old key. |
| **Biometric handshake binding** | `engine/byzantine_resilience.py` — `BiometricHandshake` | For critical signatures, the biometric handshake signature includes `SHA-256(tablet_id:serial:operator_id:timestamp)`. This binds the signing event to a specific physical terminal, operator, and moment in time. Replay requires physical access to the same terminal. |

**Residual risk:** If the TEE is operating in `SOFTWARE_FALLBACK` mode (development/demo), keys are not hardware-protected and can be extracted from memory. Mitigation: production deployments must use hardware TEE mode (`TEE_USE_REAL_HARDWARE=true`).

---

### AP-005: Denial of Service via Graph Explosion

| Attribute | Description |
|-----------|-------------|
| **Attack Path** | An adversary (ADV-001 via supply-chain, or ADV-002) injects high-frequency noise into multiple SCADA channels simultaneously, causing the inference engine (`engine/infer_graph.py`) to detect spurious correlations between all injected channels. With N injected channels, the number of candidate edges is O(N²), overwhelming the pipeline and producing an unusable graph with thousands of false edges. Incident simulation (`engine/build_incidents.py`) then produces an explosion of cascade predictions, flooding the operator with alerts and rendering Munin unusable. |
| **Target Assets** | A-001 (topology graph), A-002 (telemetry), system availability |
| **Prerequisites** | Ability to inject signals into multiple SCADA channels (supply-chain compromise or insider manipulation of sample data). |
| **Impact** | Munin becomes unusable during an actual crisis due to alert fatigue. Operators revert to manual coordination at the 2–6 hour baseline. |

#### Countermeasure: Rate Limiting + Top-K + Sensor Health

| Layer | Implementation | How It Blocks This Attack |
|-------|---------------|---------------------------|
| **Top-K edge limit** | `engine/infer_graph.py` — `max_edges_per_node = 3` | Only the top 3 edges per source node (by `|corr| * stability`) are retained. Even if all pairs produce high correlations, the graph size is bounded at `3N` edges. |
| **Correlation threshold** | `engine/infer_graph.py` — `|corr| >= 0.5`, `stability >= 0.3` | Noise-driven correlations are typically weaker than genuine physical dependencies. The confidence threshold filters most noise. |
| **Sensor health exclusion** | `engine/sensor_health.py` | Injected noise signals exhibit abnormal statistical properties (high variance, unusual frequency content). Stuck-at detection (low CV) and drift detection (mean shift) catch many injection patterns. Nodes failing health checks are excluded from inference. |
| **Anomaly detection on graph size** | Recommended operational procedure | The MO monitors the number of edges and shadow links across pipeline runs. A sudden increase (e.g., from 15 edges to 150) triggers investigation before packets are generated. |
| **Performance budgets** | `docs/PERFORMANCE_BUDGET.md` | Pipeline performance is monitored. If cascade simulation exceeds the performance budget, the system degrades gracefully rather than consuming infinite resources. |

**Residual risk:** A sophisticated injection that produces exactly 3 very-high-confidence false edges per node (just enough to fill the top-K slots) while displacing genuine edges. Mitigation: longitudinal monitoring — edges that appear suddenly and were not present in prior runs are flagged for review.

---

## 5. Trust Boundary Diagram

```
                    ┌──── UNTRUSTED ZONE ────┐
                    │                         │
                    │  SCADA Historians       │
                    │  Physical Sensors        │
                    │  External Networks       │
                    │                         │
                    └────────┬────────────────┘
                             │
                    ╔════════▼════════════════╗
                    ║  HARDWARE DATA DIODE    ║  ← One-way. Data in only.
                    ║  (engine/data_diode.py) ║    No outbound possible.
                    ╚════════╬════════════════╝
                             │
                    ┌────────▼────────────────┐
                    │  INGESTION PERIMETER     │
                    │  protocol_translator.py  │
                    │  ingest.py               │
                    │  sensor_health.py        │  ← Filters degraded data
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │  PROCESSING CORE         │
                    │  infer_graph.py          │
                    │  build_incidents.py      │
                    │  packetize.py            │
                    │  liability_shield.py     │
                    │  byzantine_resilience.py │
                    └────────┬────────────────┘
                             │
                    ╔════════▼════════════════╗
                    ║  TEE TRUST BOUNDARY     ║  ← Hardware-rooted signing
                    ║  lib/tee.ts             ║    Logic-Lock validation
                    ║  lib/pqc.ts             ║    Keys never leave enclave
                    ╚════════╬════════════════╝
                             │
                    ┌────────▼────────────────┐
                    │  AUDIT & COMPLIANCE      │
                    │  lib/merkle.ts           │  ← Tamper-evident chain
                    │  lib/audit/auditLog.ts   │  ← Ed25519 signatures
                    │  engine/out/audit.jsonl  │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │  OPERATOR INTERFACE       │
                    │  Next.js UI (port 3000)  │
                    │  CLI (engine/cli.py)     │
                    │  API routes (app/api/)   │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │  MINISTRY TERMINALS      │  ← Air-gapped, biometric
                    │  (Physical, separated)   │    Iris + Palm + Token
                    └─────────────────────────┘
```

---

## 6. STRIDE Analysis Summary

| Threat Category | Primary Attack Paths | Primary Countermeasures |
|---|---|---|
| **Spoofing** | AP-001 (packet forgery), AP-004 (key replay) | TEE signatures, PQC signatures, biometric handshakes, nonce-based replay prevention |
| **Tampering** | AP-002 (audit log tampering), AP-003 (shadow-link poisoning) | Merkle hash chain, Ed25519 signatures, sensor health filtering, physical/satellite verification, provenance ledger |
| **Repudiation** | Operator denies approving a packet | Ed25519-signed audit log with `signer_id` and `key_id`, biometric handshake attribution, named signer display |
| **Information Disclosure** | Topology graph exfiltration | Hardware data diode (no outbound), air-gapped deployment, zero external dependencies, no CDNs/telemetry |
| **Denial of Service** | AP-005 (graph explosion) | Top-K edge limits, correlation thresholds, sensor health filtering, performance budgets |
| **Elevation of Privilege** | Insider escalates from SO to IC role; operator bypasses multi-sig | RBAC enforcement (`lib/rbac.ts`, `lib/auth/rbac.ts`), Byzantine quorum (`engine/byzantine_resilience.py`), automatic severity classification |

---

## 7. Assumptions and Limitations

| ID | Assumption | Risk if Violated |
|---|---|---|
| ASM-001 | The hardware data diode is correctly installed and physically prevents outbound data flow. | If bidirectional, topology graph can be exfiltrated. |
| ASM-002 | TEE hardware (Intel SGX/ARM TrustZone) is free from side-channel vulnerabilities at the deployed microcode version. | If vulnerable, TEE signatures can be forged (see Risk T-003). |
| ASM-003 | SCADA historians are independently secured and not under attacker control. | If compromised, shadow-link poisoning (AP-003) is feasible. |
| ASM-004 | Ministry air-gapped terminals are physically secured and access-controlled. | If compromised, biometric handshakes can be performed by unauthorised individuals. |
| ASM-005 | Operators follow SOP-MUN-001 and review evidence and counterexamples before approving packets. | If not followed, all UX mitigations for automation bias are ineffective. |
| ASM-006 | Munin v1 is read-only advisory — no SCADA write commands are issued. | If write access is enabled without adequate safeguards, packet forgery becomes safety-critical. |

---

## 8. References

- `engine/data_diode.py` — Hardware data diode enforcer
- `engine/infer_graph.py` — Dependency graph inference
- `engine/sensor_health.py` — Sensor health and evidence windows
- `engine/packetize.py` — Authorisation packet generation with Merkle chaining
- `engine/byzantine_resilience.py` — Byzantine multi-sig and biometric handshakes
- `engine/liability_shield.py` — Statutory compliance
- `engine/physical_verification.py` — RF/acoustic verification
- `engine/satellite_verification.py` — Space-based verification
- `engine/provenance_ledger.py` — Data provenance hashing
- `engine/n_version_programming.py` — N-version consensus
- `engine/logic_lock.py` — Physics constraint validation
- `lib/packet/validate.ts` — Packet validation
- `lib/merkle.ts` — Merkle-proof receipt chain
- `lib/tee.ts` — Trusted Execution Environment
- `lib/pqc.ts` — Post-quantum cryptography
- `lib/audit/auditLog.ts` — Ed25519-signed audit log
- `lib/audit/keyManagement.ts` — Key rotation and status
- `lib/rbac.ts`, `lib/auth/rbac.ts` — Role-based access control
- `docs/risk_register.md` — Risk register
- `docs/threat-model-lite.md` — Simplified threat model
- `docs/safety-architecture.md` — Safety architecture overview
- `SECURITY.md` — Security policy

**END OF DOCUMENT — TM-001 v1.0**
