# Operator Experience Design

**Document ID:** UX-001
**Classification:** OFFICIAL - SENSITIVE
**Version:** 0.4.0-draft
**Last Updated:** 2026-03-18
**Owner:** Munin Safety Engineering
**Review Cycle:** Biannual

---

## 1. Purpose

This document defines the operator experience for the Munin platform, specifying how information is presented to human operators during both routine monitoring and crisis response. It translates the human factors analysis (HF-001) into concrete design specifications.

---

## 2. Operator Personas and Crisis Needs

### 2.1 Duty Officer (Frontline)

**During crisis, the Duty Officer needs:**
- Immediate visual confirmation that an anomaly has been detected (under 3 seconds to comprehend)
- Clear indication of affected infrastructure sectors and geographic scope
- Cascade projection showing likely escalation path and timeline
- Playbook recommendation with explicit confidence level and key assumptions
- Single-action approval or rejection of decision packets
- Escalation controls to engage Gold Commander

**Must NOT see during initial response:**
- Raw model internals or algorithm diagnostics
- Historical trend analysis (available on demand, not on initial alert)
- Governance configuration details
- System health metrics unrelated to the current incident

### 2.2 Gold Commander (Strategic)

**During crisis, the Gold Commander needs:**
- Executive summary of the situation in under 60 seconds of reading
- Timeline of the incident from detection to present
- What has already been decided and by whom
- What decisions are pending and what quorum is required
- Cross-sector impact assessment
- Communication status with external stakeholders

### 2.3 Regulator (Oversight)

**During or after crisis, the Regulator needs:**
- Complete audit trail with search, filter, and export capabilities
- Side-by-side comparison: what did the system recommend vs. what did operators decide?
- Governance compliance status: were all quorum requirements met?
- Emergency override log: was reduced governance invoked, and was it justified?
- Statistical performance data over time

---

## 3. War Room Workflow

### 3.1 End-to-End Incident Flow

```
Phase 1: DETECTION
+------------------------------------------------------------------+
| ALERT BAR (top of screen)                                         |
| [AMBER] Anomaly detected: Power sector - Southeast transmission   |
| Confidence: 78%  |  Time: 14:32:07  |  Severity: ELEVATED        |
+------------------------------------------------------------------+

                              |
                              v

Phase 2: CASCADE DISPLAY
+------------------------------------------------------------------+
| CASCADE VIEW                                                      |
|                                                                   |
|  POWER [DEGRADED] ----> WATER [AT RISK] ----> TELECOMS [NORMAL]  |
|    |                       |                                      |
|    +-- 3 substations      +-- 2 pumping stations                 |
|        affected                losing redundancy                  |
|                                                                   |
|  Projected cascade: Water pumping failure in 2-4 hours if         |
|  power not restored. Telecoms unaffected for 6+ hours.            |
|                                                                   |
|  [Confidence: 72%]  [Key assumption: Battery backup at 80%]      |
+------------------------------------------------------------------+

                              |
                              v

Phase 3: PLAYBOOK RECOMMENDATION
+------------------------------------------------------------------+
| RECOMMENDED RESPONSE                                              |
|                                                                   |
|  Playbook: PWR-RESTORE-003                                       |
|  "Coordinate restoration of Southeast transmission with           |
|   priority protection of water infrastructure feeds"              |
|                                                                   |
|  Evidence supporting this recommendation:                         |
|    - 3 of 4 historical precedents followed this pattern           |
|    - Water sector has 2.5h of reservoir buffer                    |
|    - Telecoms battery backup provides 6h window                   |
|                                                                   |
|  Confidence: 74%                                                  |
|  Key uncertainties:                                               |
|    - Actual battery state of charge unverified                    |
|    - Weather forecast suggests demand increase in 3h              |
|                                                                   |
|  [VIEW FULL EVIDENCE]  [VIEW ALTERNATIVE RESPONSES]              |
+------------------------------------------------------------------+

                              |
                              v

Phase 4: DECISION PACKET
+------------------------------------------------------------------+
| DECISION PACKET #2026-0318-001                                    |
|                                                                   |
|  Action: Recommend PWR-RESTORE-003 to power sector operator       |
|  Authority required: Duty Officer (1-of-2)                        |
|  Governance status: STANDARD (no override required)               |
|                                                                   |
|  Before approving, confirm:                                       |
|    [ ] I have reviewed the cascade projection                     |
|    [ ] I understand the key uncertainties listed above             |
|    [ ] I have considered alternative responses                    |
|                                                                   |
|  Reason for decision (select one):                                |
|    ( ) Agree with recommendation based on evidence                |
|    ( ) Agree with modifications (specify below)                   |
|    ( ) Reject - alternative response preferred                    |
|    ( ) Reject - insufficient evidence                             |
|    ( ) Escalate to Gold Commander                                 |
|                                                                   |
|  [APPROVE]  [REJECT]  [ESCALATE]                                 |
+------------------------------------------------------------------+

                              |
                              v

Phase 5: HUMAN APPROVAL
+------------------------------------------------------------------+
| DECISION RECORDED                                                 |
|                                                                   |
|  Packet #2026-0318-001: APPROVED by Duty Officer                  |
|  Timestamp: 14:34:52                                              |
|  Reason: Agree with recommendation based on evidence              |
|  Audit chain: [hash]                                              |
|                                                                   |
|  Recommendation transmitted to power sector operator.             |
|  Next review: Automated in 30 minutes or on status change.        |
|                                                                   |
|  [VIEW AUDIT RECORD]  [SET MANUAL REVIEW TIMER]                  |
+------------------------------------------------------------------+
```

---

## 4. Information Hierarchy

### 4.1 What Operators Need to See First

The display is organised in strict priority order:

| Priority | Information | Location | Persistence |
|----------|------------|----------|-------------|
| 1 | Active alerts and their severity | Top bar, always visible | Until resolved or escalated |
| 2 | Current system mode (LIVE / TRAINING / DEGRADED) | Top-right corner, permanent | Always |
| 3 | Cascade status (sectors affected, projected timeline) | Primary canvas | During active incident |
| 4 | Pending decision packets requiring action | Right panel, with count badge | Until acted upon |
| 5 | Data freshness indicator (time since last sensor update) | Below top bar | Always |
| 6 | Governance status (current quorum, emergency mode) | Status bar, bottom | Always |
| 7 | Shift information (operator ID, time on shift, next handover) | Bottom-right | Always |

### 4.2 Progressive Disclosure Layers

| Layer | Content | Access Method |
|-------|---------|--------------|
| Summary | Alert severity, sector affected, cascade status | Default view (always visible) |
| Detail | Evidence chain, confidence intervals, assumptions | Click to expand from summary |
| Technical | Model internals, raw sensor data, algorithm diagnostics | Separate diagnostic view (tabbed) |
| Audit | Full decision history, governance compliance | Dedicated audit panel |
| Configuration | System settings, quorum policies, role mappings | Admin interface (separate application) |

---

## 5. Trust Calibration

### 5.1 The Trust Calibration Problem

Operators must trust Munin enough to act on its recommendations promptly, but not so much that they stop applying independent judgement. Both under-trust and over-trust are dangerous failure modes.

### 5.2 Building Appropriate Trust

| Mechanism | Purpose | Implementation |
|-----------|---------|----------------|
| Transparent reasoning | Operator understands why a recommendation was made | Evidence chain displayed with every recommendation |
| Honest uncertainty | System acknowledges what it does not know | Confidence intervals and explicit assumption statements |
| Track record display | Operator can see historical accuracy | Rolling accuracy metric visible in status bar |
| Graceful failure | When Munin is wrong, the consequences are visible and bounded | Post-incident analysis comparing recommendation to outcome |
| Training validation | Operators experience Munin being both right and wrong in training | Training scenarios include cases where Munin's recommendation is deliberately suboptimal |
| Disagreement respect | Operator overrides are treated as valuable signals, not errors | Override tracking with positive framing; no punitive metrics |

### 5.3 Preventing Automation Bias

| Strategy | Implementation |
|----------|---------------|
| Evidence-before-recommendation | Cascade display appears before playbook recommendation; operator forms initial assessment first |
| Mandatory acknowledgement | Approval requires checking confirmation boxes and selecting a reason |
| Periodic calibration | Training mode periodically injects scenarios where correct action differs from recommendation |
| Override normalisation | UI presents override as a normal, expected action rather than an exception |
| Confidence decay | Extended periods of high accuracy trigger subtle UI changes that encourage increased scrutiny |

---

## 6. Visual Design Specifications

### 6.1 Colour System

| Colour | Meaning | Usage |
|--------|---------|-------|
| Green (#2D8B4E) | Normal / healthy / resolved | System status; resolved alerts |
| Amber (#D4A017) | Elevated / at risk / attention required | Active anomalies; pending decisions |
| Red (#C0392B) | Critical / failed / immediate action | Critical alerts; failed components |
| Blue (#2471A3) | Informational / neutral data | Data displays; historical information |
| Purple (#7D3C98) | Training mode | All training mode UI elements |
| Grey (#808080) | Inactive / unavailable / stale | Stale data; unavailable components |

All colour coding is supplemented with shape and pattern differentiation for accessibility.

### 6.2 Control Room Optimisation

- Dark background (#1A1A2E) to reduce eye strain during extended shifts
- Minimum text size: 14px for data, 18px for alerts, 24px for critical status
- Readable from 3 metres for critical status elements
- No auto-playing animations; motion used only for state transitions
- Reduced blue light emission mode activates automatically after 20:00 local time

---

## 7. References

- Human Factors Analysis (HF-001)
- Training Mode Design (TR-001)
- Governance Model (GOV-001)
- ISO 11064: Ergonomic design of control centres

---

**END OF DOCUMENT UX-001**
