# Adversarial Operator Scenarios: UX and Packet Design Mitigations

**Document ID:** UX-FM-001 v1.0  
**Classification:** OFFICIAL  
**Date:** 2026-03-01  
**Owner:** Product Design Unit, Human Factors Team

---

## 1. Purpose

This document catalogues adversarial operator scenarios — situations where human operators interact with Munin in ways that defeat the system's safety guarantees. For each scenario, we identify the specific UX element and/or packet design feature that mitigates the failure, and analyse residual risk.

These scenarios are not hypothetical. Each is grounded in documented human-factors failure modes from aviation (NTSB reports), nuclear power (NRC event reports), healthcare (FDA MAUDE database), and emergency management (post-incident inquiry reports).

---

## 2. Scenario Catalogue

### Scenario FM-001: Operator Over-Trusts a HIGH Confidence Shadow Link

#### Narrative

A Sector Operator sees a shadow link between `Substation_A` (power) and `Pump_Station_7` (water) with `correlation = 0.92`, `stability = 0.85`, and confidence label **HIGH**. The operator treats this as a confirmed dependency and approves a packet that isolates `Pump_Station_7` when `Substation_A` reports a voltage dip. In reality, the correlation is driven by a shared weather pattern (cold snap increasing both power demand and pump cycling), not a direct physical coupling. Isolating the pump station disrupts water supply to 40,000 residents for no benefit.

#### Root Failure

**Automation bias** — the operator uncritically accepts a HIGH confidence rating without examining the evidence quality or considering confounders. The ordinal label "HIGH" is treated as permission to stop thinking.

#### Mitigations

| Mitigation | Component | How It Works |
|------------|-----------|--------------|
| **Counterexample windows** | `components/EvidencePanel.tsx` + `engine/sensor_health.py` — `build_evidence_windows()` | The evidence panel displays counterexample windows (time periods where the correlation was negative or weak) with equal visual weight to supporting windows. For a weather-driven spurious link, counterexample windows would cluster in summer months when the cold-snap driver is absent. An operator who examines counterexamples would see seasonal variation inconsistent with a permanent physical coupling. |
| **Quality context badges** | `components/EvidencePanel.tsx` | Each evidence window displays missingness, noise, and drift scores. A weather-confounded link would show high drift scores (seasonal variation in correlation strength), flagging the edge for scrutiny. |
| **Stability score display** | `engine/infer_graph.py` — `compute_stability_score()` | Stability is computed across 5 overlapping 24-hour windows. A weather-driven link would show lower stability than a genuine physical dependency because correlation varies with weather conditions. The graph view (`/graph`) displays stability alongside correlation for each edge. |
| **Uncertainty notes** | `engine/packetize.py` → `uncertainty.notes[]` | The packet generator adds notes like `"Limited historical evidence for this scenario"` when evidence quality is mixed. These notes appear in the Authorisation Console. |
| **Sector Operator review gate** | SOP-MUN-001, Step 6 | The SOP requires Sector Operators to provide sector-specific commentary on evidence quality before packet approval. A water SO who knows that pump cycling is weather-driven would flag the spurious link. |

#### Residual Risk

**Moderate.** If the operator does not expand the evidence panel, does not read counterexamples, and the SO does not flag the link, the mitigation fails. The system cannot force an operator to look at information — it can only present it prominently.

#### Recommended Enhancement

Add a mandatory counterexample acknowledgement checkbox: the operator must check "I have reviewed counterexample windows" before approving a packet containing any shadow link with `counterexampleCount > 0`. This adds friction specifically where automation bias is most dangerous.

---

### Scenario FM-002: Operator Rejects a Correct Playbook Due to Anchoring on a Single Data Point

#### Narrative

The Incident Commander receives a packet recommending activation of `carlisle_flood_gate_coordination.yaml` for a flood event. The packet confidence is `0.78` (MEDIUM). The IC notices that one sensor (`eden_sands_centre`) reports a water level of 2.3m, which is below the playbook trigger threshold of 2.5m. The IC rejects the packet, reasoning that the trigger condition is not met. However, the cascade simulation (`engine/build_incidents.py` — `simulate_cascade()`) predicts that three upstream sensors will push `eden_sands_centre` above 2.5m within 15 minutes based on shadow-link propagation delays. By the time the sensor confirms the threshold, the cascade has advanced beyond containment.

#### Root Failure

**Anchoring bias** — the operator fixates on a single data point (current sensor reading) and ignores the predictive model (cascade simulation) that accounts for propagation delays.

#### Mitigations

| Mitigation | Component | How It Works |
|------------|-----------|--------------|
| **Cascade timeline visualisation** | `components/SimulationScrubber.tsx` | The simulation view (`/simulation`) provides a timeline scrub bar showing predicted cascade progression. The operator can scrub forward in time to see when each node is predicted to be impacted, including the predicted time at which `eden_sands_centre` exceeds 2.5m. |
| **Blast radius display** | `engine/build_incidents.py` → `incidents.json` | Each incident includes a blast radius (total nodes impacted) and time-to-total-cascade. The packet's `scope.nodeIds` shows all predicted impacted nodes, not just currently-affected ones. |
| **Diff panel for scope** | `lib/packet/diff.ts` — `diffPackets()` → `scopeDelta` | If the IC requests a revised packet after waiting, the diff panel would show `nodesAdded` — the nodes that entered the blast radius during the delay. This retrospective evidence demonstrates the cost of waiting. |
| **Outcome confidence display** | `engine/packetize.py` → `outcomeConfidence`, `outcomeSummary` | The packet includes a pre-simulated outcome summary (e.g., `"78% confidence cascade contained to affected zone with coordinated gate operations"`). This communicates the predicted outcome of acting, counterbalancing the anchor on the current sensor state. |
| **`munin applicability` check** | `engine/cli.py` — `_run_applicability()` | The MO can run applicability analysis to confirm the incident type is within Munin's validated domain, providing additional justification for the recommendation. |

#### Residual Risk

**Moderate.** The cascade timeline is available but requires the IC to navigate to the simulation view (`/simulation`). If the IC reviews only the packet summary in the Authorisation Console without checking the simulation, the anchoring bias persists.

#### Recommended Enhancement

Embed a miniature cascade timeline directly in the packet detail view (Authorisation Console) showing predicted T+5, T+15, T+30 minute states for the most critical node. This removes the navigation step that allows the IC to avoid the simulation data.

---

### Scenario FM-003: Operator Ignores Counterexamples and Approves Based on Headline Confidence

#### Narrative

An operator reviews a packet with `uncertainty.overall = 0.82` (HIGH) and `evidenceRefs` pointing to 4 supporting windows and 3 counterexample windows. The operator reads the confidence label ("HIGH"), glances at the first supporting window, and clicks "Approve" without scrolling to the counterexample section. The counterexample windows show that the dependency reverses polarity during a maintenance window — the correlation is high when both systems are in normal operation but becomes negative when maintenance occurs on either system. The packet's recommendation is enacted during a scheduled maintenance period, producing the opposite of the intended effect.

#### Root Failure

**Selective attention / confirmation bias** — the operator attends to confirming evidence (high confidence label, supporting windows) and ignores disconfirming evidence (counterexamples) because the UI allows bypassing the counterexample section.

#### Mitigations

| Mitigation | Component | How It Works |
|------------|-----------|--------------|
| **Dual-column evidence layout** | `components/EvidencePanel.tsx` | Supporting and counterexample windows are displayed side-by-side in a dual-column layout. Counterexamples have amber borders and warning icons. The operator cannot view supporting evidence without counterexamples being in peripheral vision. (See `docs/ux/authorisation_console.md`, Section 2.2.) |
| **Counterexample count badge** | `lib/packet/types.ts` — `UncertaintyBlock.counterexampleCount` | A distinct warning badge (`"⚠ 3 counterexample windows"`) is displayed alongside the uncertainty label. This creates cognitive dissonance: "HIGH confidence" next to "3 counterexamples" forces the operator to reconcile the two signals. |
| **Validation warning for empty evidence** | `lib/packet/validate.ts` | Packets with empty `evidenceRefs` trigger a warning: `"No evidence references — packet is unsupported"`. While not directly addressing counterexample ignoring, this ensures evidence is present for review. |
| **`lintPacket()` output** | `lib/packet/validate.ts` — `lintPacket()` | The packet linter produces human-readable warnings that can be displayed as a pre-approval checklist. Warnings include evidence and uncertainty issues. |
| **Audit trail of approval** | `lib/audit/auditLog.ts` | The approval action is logged with Ed25519 signature, creating a non-repudiable record. Post-incident review can determine whether the operator had access to counterexample data at the time of approval. |

#### Residual Risk

**High.** Even with prominent display, operators under time pressure will skip counterexample review. The dual-column layout helps but does not guarantee engagement. No UI can force an operator to read.

#### Recommended Enhancement

Implement a "counterexample digest" — a one-sentence summary of the most significant counterexample — displayed inline in the packet header, immediately below the confidence label. Example: `"⚠ Dependency reverses during maintenance windows (3 counterexamples, strongest: r = −0.45 during 2026-01-15 00:00–2026-01-16 00:00)"`. This reduces the cognitive cost of engaging with counterexamples from "scroll and read a table" to "read one sentence."

---

### Scenario FM-004: Operator Rubber-Stamps Without Reading (Multi-Sig Degradation)

#### Narrative

A 3-of-4 multi-sig packet for a CRITICAL action (dam gate operation) requires signatures from the Water Authority, Power Grid Operator, and National Security. The Water Authority signs first after thorough review (20 minutes). The Power Grid Operator, seeing that the Water Authority has already signed, assumes due diligence has been performed and signs within 30 seconds without reviewing the evidence or uncertainty. National Security, seeing two prior signatures, signs in 15 seconds. Total review time: 21 minutes, of which 20 minutes were spent by a single signer. The M-of-N quorum is technically satisfied, but 2 of 3 signers exercised no independent judgement.

#### Root Failure

**Diffusion of responsibility** — the multi-sig system, designed to prevent single-point-of-failure, degenerates into a rubber-stamp chain where each signer relies on prior signers' judgement.

#### Mitigations

| Mitigation | Component | How It Works |
|------------|-----------|--------------|
| **Named signer attribution** | `lib/packet/types.ts` — `MultiSigBlock.signers[]` | Each signer's role and identity are recorded and displayed in the multi-sig progress bar. Every signer knows their name is attached to the decision. This counteracts anonymity, the primary enabler of diffusion of responsibility. |
| **Time-to-sign metric** | `engine/packetize.py` — `timeToAuthorizeSeconds` | The time between first approval and final authorisation is recorded. Extremely short signing times (< 60 seconds for a CRITICAL packet) are flagged in post-incident review. |
| **Biometric handshake requirement** | `engine/byzantine_resilience.py` — `BiometricHandshake` | For CRITICAL and HIGH consequence actions, each signer must complete a multi-factor biometric handshake (iris + palm + hardware token + air-gap verification). This physical process takes a minimum of 30–60 seconds, creating a forced minimum engagement time. |
| **Independent evidence context per signer** | Authorisation Console design | Each signer sees the full packet — evidence windows, uncertainty, counterexamples — regardless of prior signers' state. The UI does not reveal prior signers' review depth or comments until after the current signer has recorded their own assessment. |
| **Quorum diversity check** | `engine/byzantine_resilience.py` — `ByzantineMultiSig.is_authorized()` | Verification checks `len(unique_ministries) >= threshold` — ensuring signatures come from different organisations, not the same organisation signing multiple times. |
| **Audit log with signatures** | `lib/audit/auditLog.ts`, `lib/audit/decisions.ts` | Each signing action creates an Ed25519-signed audit log entry with the signer's `key_id`, `signer_id`, and timestamp. The cryptographic signature proves that the named individual performed the action at the recorded time. |

#### Residual Risk

**Moderate.** Biometric handshake creates physical friction, but does not guarantee cognitive engagement. An operator can complete iris/palm verification while mentally disengaged. Time-to-sign metrics enable post-incident accountability but do not prevent real-time rubber-stamping.

#### Recommended Enhancement

Implement a per-signer comprehension check: before signing, each signer must answer a randomly selected factual question about the packet (e.g., "How many nodes are in the blast radius?" or "What is the confidence level?"). Incorrect answers trigger a re-review prompt. This is analogous to the "challenge-response" protocol used in aviation checklists.

---

### Scenario FM-005: Operator Exploits Minimum Sign-Off to Bypass Scrutiny

#### Narrative

A playbook with `minimum_sign_off: true` (e.g., `carlisle_flood_gate_coordination.yaml`, approval role `EA Duty Officer`) is designed for lower-consequence warning-level actions. An operator deliberately categorises a higher-consequence action as warning-level to exploit the single-signer path and avoid the multi-sig quorum that would apply at alert or critical level. The operator gains unilateral authority over an action that should require multi-agency oversight.

#### Root Failure

**Authority gaming** — the operator manipulates the severity classification to circumvent governance controls.

#### Mitigations

| Mitigation | Component | How It Works |
|------------|-----------|--------------|
| **Automatic severity classification** | `engine/packetize.py` — `determine_multi_sig_requirements()` | Multi-sig requirements are computed automatically from the incident data (timeline length, critical keywords, playbook type), not manually set by the operator. High-risk indicators (`len(timeline) > 5`, `"critical"` in timeline, incident type in `['power_instability', 'flood']`) trigger elevated quorum regardless of operator input. |
| **Packet scope validation** | `lib/packet/validate.ts` — scope validation | Packets with large `scope.nodeIds` (> 15 nodes) trigger constraint warnings. A high-consequence action that affects many nodes will be flagged even if the playbook allows minimum sign-off. |
| **Immutable audit trail** | `engine/out/audit.jsonl` | The severity classification and quorum assignment are logged with the packet creation event. Post-incident review can determine whether the classification was appropriate. |
| **Byzantine multi-sig override** | `engine/byzantine_resilience.py` — `integrate_byzantine_multi_sig_into_packet()` | The Byzantine engine independently evaluates the packet and adds multi-sig requirements for high-consequence actions (`open_dam`, `close_dam`, etc.), overriding playbook-level minimum sign-off settings. |

#### Residual Risk

**Low.** The automatic classification and Byzantine override make it difficult for an operator to exploit minimum sign-off for genuinely high-consequence actions. Residual risk exists for edge cases where the action is high-consequence but does not match the keyword-based high-risk indicators.

---

### Scenario FM-006: Operator Deliberately Delays Signing to Run Out the Clock

#### Narrative

A ministry representative opposed to a recommended action (e.g., opening flood gates that will damage farmland in their constituency) deliberately delays their signature. They do not formally reject the packet — rejection would be logged and create accountability. Instead, they claim to be "reviewing" while the cascade progresses. By the time the quorum is met (via other signers), the window for effective intervention has passed.

#### Root Failure

**Strategic delay** — a signer exploits the time dimension of the multi-sig process to achieve a de facto veto without the accountability of an explicit rejection.

#### Mitigations

| Mitigation | Component | How It Works |
|------------|-----------|--------------|
| **Quorum threshold < total signers** | `engine/byzantine_resilience.py` | The quorum is M-of-N (e.g., 3-of-4), meaning one signer can be bypassed. A single delaying ministry does not block authorisation if the other 3 sign. |
| **Time-to-authorise tracking** | `engine/packetize.py` — `timeToAuthorize`, `timeToAuthorizeSeconds` | Coordination latency is a first-class metric. The system records time from first approval to quorum completion. Delays are visible and attributable. |
| **Real-time progress visibility** | Multi-sig progress bar | All signers can see which ministries have signed and which are pending. Social pressure from visible non-compliance creates incentive to sign. |
| **Shadow-mode cost evidence** | `engine/shadow_simulation.py` — `_estimate_damage_prevented()` | The shadow-mode report quantifies the cost of delayed action using domain-specific cost models (economic, social, environmental damage per second of delay). This data can be cited in real-time to the delaying party. |
| **CMI escalation** | `engine/cmi_prioritization.py` | During declared emergencies, Civilian-Military Integration provides an escalation path that bypasses standard quorum via elevated emergency powers. |

#### Residual Risk

**Moderate.** If exactly M signers are available and one delays, the quorum cannot be met through the standard N-M+1 bypass path. CMI escalation requires an emergency declaration, which introduces its own political dynamics.

---

## 3. Summary Matrix

| ID | Scenario | Root Failure | Primary Mitigation | Residual Risk |
|---|---|---|---|---|
| FM-001 | Over-trusts HIGH confidence link | Automation bias | Counterexample windows (dual-column layout) | Moderate |
| FM-002 | Rejects correct playbook (anchoring) | Anchoring bias | Cascade timeline + outcome confidence | Moderate |
| FM-003 | Ignores counterexamples | Confirmation bias | Counterexample count badge + dual-column | High |
| FM-004 | Rubber-stamps without reading | Diffusion of responsibility | Biometric handshake + named attribution + time-to-sign | Moderate |
| FM-005 | Exploits minimum sign-off | Authority gaming | Automatic severity classification + Byzantine override | Low |
| FM-006 | Strategic signing delay | Strategic delay | M-of-N quorum + time tracking + CMI escalation | Moderate |

---

## 4. References

- `docs/ux/authorisation_console.md` — UX rationale for each UI element
- `docs/risk_register.md` — S-001 (politicisation), S-002 (blame-shifting), S-004 (expertise erosion)
- `lib/packet/types.ts` — `AuthorisationPacket`, `UncertaintyBlock`, `MultiSigBlock`
- `lib/packet/validate.ts` — Validation rules and warnings
- `lib/packet/diff.ts` — Packet diff for change tracking
- `engine/byzantine_resilience.py` — Multi-sig and biometric handshake
- `engine/packetize.py` — Automatic severity classification
- `engine/shadow_simulation.py` — Cost-of-delay quantification
- `engine/sensor_health.py` — Evidence window generation with counterexamples
- `components/EvidencePanel.tsx` — Evidence display component
- `components/HandshakePanel.tsx` — Packet detail and approval interface
- `components/SimulationScrubber.tsx` — Cascade timeline visualisation

**END OF DOCUMENT — UX-FM-001 v1.0**
