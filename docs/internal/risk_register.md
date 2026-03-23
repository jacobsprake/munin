# Munin Risk Register

**Document ID:** RISK-REG-001 v1.0  
**Classification:** OFFICIAL-SENSITIVE  
**Date:** 2026-03-01  
**Owner:** Risk and Assurance Unit, National Resilience Directorate  
**Review Cycle:** Quarterly

---

## 1. Risk Scoring Methodology

Each risk is scored on two axes:

- **Likelihood** (1–5): 1 = Rare, 2 = Unlikely, 3 = Possible, 4 = Likely, 5 = Almost Certain
- **Impact** (1–5): 1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Catastrophic

**Risk Rating = Likelihood × Impact.** Scores ≥ 15 require immediate mitigation. Scores 9–14 require active management. Scores ≤ 8 require monitoring.

---

## 2. Technical Risks

### T-001: False Shadow Links (Spurious Cross-Sector Dependencies)

| Attribute | Value |
|-----------|-------|
| **ID** | T-001 |
| **Description** | The correlation-based inference engine (`engine/infer_graph.py` — `compute_correlation_with_lag()`) may detect spurious dependencies between nodes that are correlated due to confounders (weather, shared controllers, load shedding, maintenance windows) rather than genuine physical coupling. A false shadow link, if included in a packet, could cause operators to isolate infrastructure that is not actually dependent, wasting resources or creating new cascades. |
| **Likelihood** | 4 — Likely. Correlation ≠ causation is a fundamental statistical problem. With thousands of node pairs, false positives are expected at scale. |
| **Impact** | 3 — Moderate. A false shadow link may delay response or misallocate resources, but does not directly cause physical harm because Munin v1 is read-only advisory (`actuatorBoundary.writesToHardware: false`). Impact escalates to 4 (Major) if Munin transitions to active mode without adequate mitigation. |
| **Risk Rating** | **12** (Active management required) |
| **Mitigation (Product Design)** | 1. **Stability score filtering** (`engine/infer_graph.py` — `compute_stability_score()`): Edges must show consistent correlation across 5 overlapping 24-hour windows (`stability >= 0.3`). Single-spike correlations are rejected. 2. **Sensor health pre-filtering** (`engine/sensor_health.py`): Nodes with missingness > 10%, stuck-at, or drift are excluded from inference before correlation is computed. 3. **Counterexample surfacing** (`engine/sensor_health.py` — `build_evidence_windows()`): Negative-correlation windows are classified as `"counterexample"` and surfaced to operators alongside supporting windows. The `uncertainty.counterexampleCount` field in `lib/packet/types.ts` quantifies disconfirming evidence. 4. **Top-K edge limit**: Only top 3 edges per source node (by `|corr| * stability`) are retained, preventing graph explosion. 5. **Confidence threshold**: `|corr| >= 0.5` required — well above noise floor. 6. **Human review gate**: Every shadow link is visible in the Evidence Panel (`components/EvidencePanel.tsx`) and subject to SO review before packet approval. |

---

### T-002: Time-Synchronisation Failures Across Sectors

| Attribute | Value |
|-----------|-------|
| **ID** | T-002 |
| **Description** | Munin's lag-detection algorithm (`engine/infer_graph.py` — `compute_correlation_with_lag()`, testing lags in `[-300s, +300s]`) assumes timestamps from different SCADA historians are synchronised to a common reference. If sector A's historian clock drifts by > 30 seconds relative to sector B's, lag estimates will be incorrect: genuine 45-second lag dependencies will be computed as 15-second or 75-second, producing either false edges or missed edges. Clock drift is common in legacy OT environments that lack NTP/PTP synchronisation. |
| **Likelihood** | 3 — Possible. Modern SCADA systems typically use NTP, but legacy systems (Modbus RTU, older DNP3) may have significant clock drift. Occurs more frequently in multi-sector deployments where historians are managed by different organisations. |
| **Impact** | 3 — Moderate. Incorrect lag values distort cascade timeline predictions in `engine/build_incidents.py` — `simulate_cascade()`. Operators relying on time-to-impact estimates may prepare too early or too late. |
| **Risk Rating** | **9** (Active management required) |
| **Mitigation (Product Design)** | 1. **Timestamp skew detection** in observability score (`engine/sensor_health.py`): The skew component (`skew * 0.1` weight) degrades the observability score for nodes with irregular timestamp intervals, flagging them for investigation. 2. **Protocol translation normalisation** (`engine/protocol_translator.py`): All protocols are translated to a common `timestamp, node_id, value` format with timestamp alignment during ingestion. 3. **Evidence window quality context**: Each evidence window includes `qualityContext` with missingness, noise, and drift metrics that capture symptoms of clock drift. 4. **Recommended operational procedure**: Sector Operators should verify NTP synchronisation status for all historians feeding Munin. The MO should run `munin evidence-quality` and flag nodes with observability < 0.5 for timestamp investigation. |

---

### T-003: TEE Enclave Vulnerabilities and Side-Channel Attacks

| Attribute | Value |
|-----------|-------|
| **ID** | T-003 |
| **Description** | The Trusted Execution Environment (`lib/tee.ts`) relies on hardware enclaves (Intel SGX, ARM TrustZone, AMD SEV) for tamper-proof packet signing and Logic-Lock validation. Known side-channel attacks against SGX (e.g., Foreshadow/L1TF, Plundervolt, SGAxe) can extract secrets from enclaves via speculative execution, voltage glitching, or cache-timing analysis. A compromised enclave would allow an attacker to forge TEE signatures, bypassing the hardware-rooted trust guarantee. |
| **Likelihood** | 2 — Unlikely. Side-channel attacks require physical or co-tenant access to the machine, significant expertise, and specific vulnerable microcode versions. Air-gapped deployment reduces the attack surface. |
| **Impact** | 5 — Catastrophic. If TEE signatures can be forged, the entire trust model collapses. Forged packets could authorise actions that violate physics constraints (Logic-Lock bypass). |
| **Risk Rating** | **10** (Active management required) |
| **Mitigation (Product Design)** | 1. **Software fallback mode** (`lib/tee.ts` — `TEEConfig.simulationMode`): When hardware TEE is unavailable or distrusted, the system falls back to software-only signing with explicit degradation notice (`TEESecurityStatus.level = 'SOFTWARE_ONLY'`). This is less secure but prevents total loss of signing capability. 2. **Logic-Lock duplication**: Physics constraint validation (`engine/logic_lock.py` — `LogicLockEngine`) runs both inside the TEE and as an independent software check. Disagreement triggers alert. 3. **N-version programming** (`engine/n_version_programming.py`): Multiple inference engine versions run in parallel. Consensus (2-of-3) is required — a compromised TEE producing divergent results would be outvoted. 4. **Physical verification** (`engine/physical_verification.py`): RF/acoustic fingerprinting cross-checks digital readings against physical reality, providing a TEE-independent validation channel. 5. **Attestation freshness** (`lib/tee.ts` — `verifyTEESignature()`): Attestation quotes older than 60 minutes are rejected. Cache window is configurable (`TEE_ATTESTATION_CACHE_WINDOW_MS`). 6. **Microcode patching**: Operational procedure requires prompt application of CPU microcode updates addressing SGX vulnerabilities. |

---

### T-004: Merkle Chain Fork or Corruption

| Attribute | Value |
|-----------|-------|
| **ID** | T-004 |
| **Description** | The Merkle receipt chain (`lib/merkle.ts`, `engine/packetize.py` — `generate_merkle_receipt()`) provides tamper evidence by chaining each packet to the previous via `receiptHash = SHA-256(previousHash + ":" + packetHash)`. If two packets are generated concurrently with the same `previousHash` (e.g., due to a race condition in parallel packet generation), the chain forks. A forked chain cannot be verified by `verifyMerkleChain()` and destroys the integrity guarantee for all subsequent packets. |
| **Likelihood** | 2 — Unlikely. Packet generation is currently sequential within `engine/packetize.py` — `packetize_incidents()`. Risk increases if future versions parallelise packet generation or if multiple engine instances run concurrently. |
| **Impact** | 4 — Major. A forked or corrupted chain invalidates the audit trail. Ministry Legal Counsel cannot rely on the chain for court-admissible evidence. All packets after the fork point become legally indefensible. |
| **Risk Rating** | **8** (Monitoring required) |
| **Mitigation (Product Design)** | 1. **Sequential generation**: `engine/packetize.py` processes incidents in a for-loop, ensuring sequential chain extension. 2. **Chain verification after generation**: `packetize_incidents()` runs `audit_log.verify_chain()` after all packets are generated and reports results. 3. **Client-side chain verification** (`lib/merkle.ts` — `verifyMerkleChain()`): Checks both receipt hash computation and chain continuity (`previousHash` must match prior receipt's `receiptHash`). 4. **Sovereign hash checkpoint** (`lib/merkle.ts` — `computeSovereignHash()`): Periodic checkpoint of the entire chain state into a single root hash enables efficient verification without recomputing the full chain. |

---

### T-005: Engine Pipeline Non-Determinism

| Attribute | Value |
|-----------|-------|
| **ID** | T-005 |
| **Description** | The engine pipeline (`engine/run.py`) must produce deterministic outputs from identical inputs for reproducibility and audit compliance. Non-determinism can arise from: floating-point ordering in NumPy operations, Python dict ordering in older versions, timestamp-dependent packet IDs, or hash computation on unsorted data. If two runs of the same data produce different graphs or packets, audit reproducibility is compromised. |
| **Likelihood** | 3 — Possible. NumPy operations on large arrays can produce subtly different floating-point results depending on thread scheduling. |
| **Impact** | 2 — Minor. Non-determinism affects audit reproducibility but does not directly impact operational safety. |
| **Risk Rating** | **6** (Monitoring required) |
| **Mitigation (Product Design)** | 1. **Determinism test suite** (`engine/tests/test_determinism_properties.py`): Property-based tests verify that identical inputs produce identical outputs. 2. **Reproducibility tools** (`engine/tools/verify_run_reproducibility.py`, `engine/tools/replay_run.py`): Allow re-running and comparing pipeline outputs. 3. **Sorted data in hashing** (`engine/packetize.py`): `json.dumps(data, sort_keys=True)` ensures deterministic serialisation before hashing. 4. **Fixed provenance hashes**: Each packet includes `provenance.configHash` and `provenance.dataHash` to fingerprint the exact inputs. |

---

## 3. Sociopolitical Risks

### S-001: Politicisation of Sign-Off (Multi-Sig Weaponisation)

| Attribute | Value |
|-----------|-------|
| **ID** | S-001 |
| **Description** | The Byzantine multi-sig system (`engine/byzantine_resilience.py`) requires M-of-N ministry signatures for critical actions. A ministry with political motivations could weaponise its veto power by withholding its signature to block actions it opposes for political rather than technical reasons. During a crisis, this deadlock could be catastrophic: the cascade progresses while ministries negotiate. The multi-sig system designed to prevent sabotage becomes a tool for obstruction. |
| **Likelihood** | 3 — Possible. Inter-ministry political friction is well-documented in crisis literature. UK government coordination failures during major incidents (e.g., 2007 floods, 2017 Grenfell) involved inter-agency disagreements. |
| **Impact** | 5 — Catastrophic. Blocked authorisation during an active cascade directly translates to extended damage. If a dam-opening action is blocked for 2 hours during a flood, downstream communities bear the consequences. |
| **Risk Rating** | **15** (Immediate mitigation required) |
| **Mitigation (Product Design)** | 1. **Quorum design, not unanimity**: `engine/byzantine_resilience.py` — `ByzantineMultiSig.is_authorized()` requires `threshold` signatures, not all `required` signatures (for standard actions). A 2-of-3 quorum means one ministry cannot unilaterally block. 2. **Minimum sign-off mode**: Playbooks like `carlisle_flood_gate_coordination.yaml` support `minimum_sign_off: true` for lower-consequence actions, allowing a single EA Duty Officer approval. 3. **Audit trail accountability**: Every signature (and refusal) is logged to the Merkle-chained audit log (`engine/out/audit.jsonl`). A ministry that withholds its signature during a crisis will have its inaction recorded immutably. Post-incident inquiries will have access to this record. 4. **Escalation via CMI**: `engine/cmi_prioritization.py` provides a Civilian-Military Integration pathway where, during declared emergencies, asset prioritisation can bypass standard quorum via elevated emergency powers. 5. **Shadow-mode evidence**: Shadow-mode reports (`engine/shadow_simulation.py`) document the cost of delayed action, providing political cover for ministries that sign quickly and political liability for those that delay. |

---

### S-002: Blame-Shifting to Munin ("The Algorithm Made Me Do It")

| Attribute | Value |
|-----------|-------|
| **ID** | S-002 |
| **Description** | Operators may use Munin's recommendations to deflect personal responsibility for crisis decisions. If Munin recommends an action that leads to adverse outcomes, operators may claim they "followed the system" rather than exercising professional judgement. Conversely, if an operator overrides Munin and the outcome is bad, they may be penalised for ignoring "the algorithm." Both scenarios undermine the human-in-the-loop design principle and create perverse incentives. |
| **Likelihood** | 4 — Likely. Automation blame-shifting is extensively documented in aviation (autopilot incidents), healthcare (clinical decision support), and autonomous vehicle contexts. |
| **Impact** | 4 — Major. If operators stop exercising independent judgement, Munin becomes a de facto autonomous system without having been validated for autonomous operation. This violates the core design principle: "Humans still decide. Munin does not execute actions autonomously." Additionally, public trust in the system collapses if blame is perceived as shifting between human and machine. |
| **Risk Rating** | **16** (Immediate mitigation required) |
| **Mitigation (Product Design)** | 1. **Explicit non-execution boundary**: Every packet includes `actuatorBoundary.writesToHardware: false` and a human-readable note: `"No direct OT writes. Human authorization required for all actuator commands."` 2. **Uncertainty display design**: The Authorisation Console displays uncertainty as ordinal labels (HIGH/MEDIUM/LOW) alongside raw probabilities, forcing operators to acknowledge confidence levels rather than treating recommendations as instructions. Counterexample windows are displayed alongside supporting windows to prevent uncritical acceptance. 3. **Approval role attribution**: Each approval in the packet `approvals[]` array records the role and will record the signer identity upon sign-off. The audit log (`lib/audit/auditLog.ts`) uses Ed25519 signatures to cryptographically attribute each decision to a specific individual. 4. **Diff panel for revisions** (`lib/packet/diff.ts` — `diffPackets()`): When an operator modifies a recommendation, the diff is recorded — documenting their professional judgement and the reasons for deviation. 5. **Liability Shield framing**: `engine/liability_shield.py` generates compliance certificates that frame actions as "performed in accordance with" statutory authority — not "recommended by Munin." The legal certificate statement references the Act and Section, not the software. |

---

### S-003: Over-Centralisation of Crisis Decision-Making

| Attribute | Value |
|-----------|-------|
| **ID** | S-003 |
| **Description** | Munin consolidates cross-sector dependency data, cascade predictions, and authorisation workflows into a single platform. This centralisation creates a single point of failure for crisis decision-making. If Munin becomes unavailable during an incident (hardware failure, power loss, data diode disruption), operators who have become dependent on the platform may lack the institutional knowledge and manual procedures to coordinate effectively without it. Additionally, centralisation concentrates power — the entity controlling the Munin deployment has asymmetric visibility and influence over multi-agency coordination. |
| **Likelihood** | 3 — Possible. Institutional dependency on decision-support systems is well-documented. The UK's reliance on the Airwave communications system for emergency services coordination illustrates this risk. |
| **Impact** | 4 — Major. Loss of Munin during a crisis reverts coordination latency to the 2–6 hour baseline. Operators who have not maintained manual procedures will be slower than pre-Munin baselines due to atrophied skills. |
| **Risk Rating** | **12** (Active management required) |
| **Mitigation (Product Design)** | 1. **Graceful degradation architecture**: The system is designed with health endpoints (`/api/health/readiness`, `/api/health/liveness`, `/api/health/ready`, `/api/health/live`) that detect partial failures. The front-end degrades gracefully when backend services are unavailable. 2. **Digital Asset Vault** (`engine/digital_asset_vault.py`): An EMP-shielded offline "Black Box" stores system snapshots (graph, logic, configuration) for disaster recovery. Even total server loss can be recovered from the vault. 3. **Manual playbook fallback**: All playbooks in `playbooks/*.yaml` are human-readable YAML documents that can be printed and followed manually without the software platform. 4. **Multi-tenancy** (`app/api/tenants/`): Each LRF or agency can operate an independent Munin instance, preventing single-point centralisation. 5. **Sovereign Mesh Network** (`engine/sovereign_mesh.py`): A private LoRa/satellite mesh provides telemetry routing independent of internet infrastructure, reducing dependency on any single communications backbone. 6. **Mandatory manual exercises**: SOP-MUN-002 (shadow-mode exercises) includes regression scenarios that test operator capability without Munin as a control condition. |

---

### S-004: Erosion of Operator Expertise Through Automation Dependency

| Attribute | Value |
|-----------|-------|
| **ID** | S-004 |
| **Description** | As operators rely on Munin's pre-validated playbooks and automated evidence assembly, their ability to perform manual dependency analysis, evidence gathering, and cross-agency coordination atrophies. Over a 5–10 year deployment, the organisation may lose the institutional knowledge needed to respond effectively without Munin. This creates an irreversible vendor lock-in at the operational capability level. |
| **Likelihood** | 4 — Likely. Skill atrophy in automated environments is extensively documented in aviation (automation-induced complacency), nuclear power (simulator-dependent operators), and financial trading (algorithmic trading dependency). |
| **Impact** | 3 — Moderate. Gradual, not sudden. Impact is moderate in the short term because Munin is available, but escalates to Major (4) over time if unaddressed. |
| **Risk Rating** | **12** (Active management required) |
| **Mitigation (Product Design)** | 1. **Evidence-first UX**: The Authorisation Console does not present recommendations as conclusions. It presents evidence (windows, correlations, counterexamples) and requires operators to review them before approving. This maintains analytical engagement. 2. **Shadow-mode regression exercises**: Quarterly exercises under SOP-MUN-002 include manual analysis tasks where operators must evaluate incidents without Munin recommendations. 3. **Training module integration**: The Digital Twin (`engine/sovereign_digital_twin.py`) provides a sandbox where operators rehearse Authoritative Handshakes without risk, maintaining procedural familiarity. 4. **Applicability boundaries**: `engine/diagnostics/applicability.py` explicitly identifies scenarios where Munin does NOT apply (e.g., Texas 2021, Dubai 2024). This forces operators to recognise the limits of the system and maintain independent capability for out-of-scope events. |

---

### S-005: Adversarial Manipulation of Shadow-Mode Pilot Data

| Attribute | Value |
|-----------|-------|
| **ID** | S-005 |
| **Description** | During the shadow-mode pilot phase, an insider or adversary could manipulate the human-action logs or historical incident data fed into `engine/shadow_replay.py` to make Munin's performance appear better (to accelerate transition to active mode) or worse (to kill the programme). Inflated `duration_seconds` in human-action records would exaggerate Munin's improvement ratio; deflated values would minimise it. |
| **Likelihood** | 2 — Unlikely. Requires insider access to the exercise data preparation process. |
| **Impact** | 4 — Major. Premature transition to active mode based on manipulated data could lead to over-reliance on an inadequately validated system. Conversely, a sabotaged pilot could prevent deployment of a genuinely valuable capability. |
| **Risk Rating** | **8** (Monitoring required) |
| **Mitigation (Product Design)** | 1. **Provenance hashing**: Each packet includes `provenance.dataHash` — a SHA-256 hash of the input data (`engine/packetize.py` — `compute_data_hash()`). Changing input data changes the hash, enabling detection. 2. **Merkle-chained audit log**: All shadow-mode exercise actions are logged to the append-only audit log (`engine/out/audit.jsonl`), making retrospective manipulation detectable. 3. **Independent SSME review**: SOP-MUN-002 requires Subject-Matter Experts to review shadow-mode results against their domain knowledge, providing a human check on data integrity. 4. **Cross-reference with external records**: Shadow-mode exercises should reference independently documented incident timelines (e.g., EA flood event records, Met Office warnings) to validate human-action data. |

---

## 4. Risk Summary Heat Map

| Risk ID | Risk Name | L | I | Rating | Category |
|---------|-----------|---|---|--------|----------|
| S-002 | Blame-shifting to Munin | 4 | 4 | **16** | Sociopolitical |
| S-001 | Politicisation of sign-off | 3 | 5 | **15** | Sociopolitical |
| T-001 | False shadow links | 4 | 3 | **12** | Technical |
| S-003 | Over-centralisation | 3 | 4 | **12** | Sociopolitical |
| S-004 | Operator expertise erosion | 4 | 3 | **12** | Sociopolitical |
| T-003 | TEE enclave vulnerabilities | 2 | 5 | **10** | Technical |
| T-002 | Time-sync failures | 3 | 3 | **9** | Technical |
| T-004 | Merkle chain fork | 2 | 4 | **8** | Technical |
| S-005 | Shadow-mode data manipulation | 2 | 4 | **8** | Sociopolitical |
| T-005 | Pipeline non-determinism | 3 | 2 | **6** | Technical |

---

## 5. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-01 | Risk and Assurance Unit | Initial release — 5 technical, 5 sociopolitical risks |

**END OF DOCUMENT — RISK-REG-001 v1.0**
