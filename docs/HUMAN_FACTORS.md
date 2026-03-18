# Human Factors Analysis

**Document ID:** HF-001
**Classification:** OFFICIAL - SENSITIVE
**Version:** 0.4.0-draft
**Last Updated:** 2026-03-18
**Owner:** Munin Safety Engineering
**Review Cycle:** Biannual

---

## 1. Purpose

This document analyses the human factors considerations in the design and operation of the Munin platform. It examines how human operators interact with an AI-assisted infrastructure orchestration system during both routine monitoring and crisis conditions, and derives design requirements to minimise human error and cognitive overload.

---

## 2. Operator Personas

### 2.1 Duty Officer (Frontline)

**Profile:**
- Trained infrastructure operator with 2-5 years of control room experience
- Works 8-12 hour shifts in a control room environment
- Monitors Munin console alongside existing SCADA/HMI systems
- First responder to Munin alerts and recommendations

**Primary tasks:**
- Monitor dashboard for anomalies and cascade alerts
- Review playbook recommendations against situational awareness
- Approve or reject decision packets
- Escalate to Gold Commander when thresholds are met

**Cognitive characteristics during crisis:**
- High vigilance in first 30-60 minutes; rapid degradation after 4+ hours
- Tendency toward confirmation bias when under time pressure
- Reliance on pattern recognition from prior incidents
- Vulnerable to alarm fatigue during multi-alert scenarios

**Key needs:**
- Clear, unambiguous alert prioritisation
- Minimal information required to make approve/reject decisions
- Confidence indicators that are honest about uncertainty
- Ability to access supporting evidence without leaving primary view

### 2.2 Gold Commander (Strategic)

**Profile:**
- Senior engineer or incident commander with 10+ years of experience
- May be off-site or on-call when incidents begin
- Responsible for strategic decisions affecting multiple infrastructure sectors
- Coordinates across organisations and government bodies

**Primary tasks:**
- Review escalations from Duty Officer
- Authorise elevated governance actions (quorum participation)
- Coordinate cross-sector response strategy
- Interface with external stakeholders (regulators, government, utilities)

**Cognitive characteristics during crisis:**
- Must rapidly build situational awareness from a cold start (if on-call)
- Balances technical assessment with political and organisational considerations
- Experienced in high-pressure decision-making but may lack current operational context
- Susceptible to sunk-cost bias in prolonged incidents

**Key needs:**
- Executive summary view that conveys situation in under 60 seconds
- Clear escalation history showing how the situation developed
- Decision audit trail showing what has already been approved
- Communication tools for coordinating with external parties

### 2.3 Regulator (Oversight)

**Profile:**
- Independent safety professional or government inspector
- Reviews Munin operations periodically or during significant incidents
- Holds veto authority via Regulator signing key
- Not embedded in the operational team

**Primary tasks:**
- Audit operational decisions for safety compliance
- Review emergency override justifications
- Verify that governance procedures are being followed
- Provide independent safety assessment during major incidents

**Cognitive characteristics:**
- Analytical rather than reactive mindset
- May lack real-time operational experience
- Must resist pressure to rubber-stamp decisions under time pressure
- Needs sufficient information to exercise independent judgement

**Key needs:**
- Complete audit trail with search and filter capabilities
- Side-by-side comparison of recommendations vs. operator decisions
- Statistical summaries of system performance over time
- Clear indication of governance compliance status

---

## 3. Cognitive Load Analysis During Crisis

### 3.1 Information Processing Model

During an infrastructure crisis, operators process information through three channels:

1. **Perceptual channel:** Visual scanning of displays, alerts, and status indicators
2. **Cognitive channel:** Interpreting data, comparing against mental models, forming decisions
3. **Motor channel:** Interacting with UI elements, approving actions, communicating

Munin's design must avoid saturating any single channel.

### 3.2 Crisis Phase Analysis

| Phase | Duration | Primary Load | Dominant Risk | Design Response |
|-------|----------|-------------|---------------|-----------------|
| Detection | 0-5 min | Perceptual | Alert blindness; failure to recognise significance | Progressive alert escalation; distinct visual/auditory coding by severity |
| Assessment | 5-30 min | Cognitive | Information overload; incorrect mental model formation | Structured cascade display; confidence intervals; evidence hierarchy |
| Decision | 10-60 min | Cognitive + Motor | Time pressure; confirmation bias; groupthink | Decision packet with explicit uncertainty; devil's advocate prompts |
| Execution | Ongoing | Motor + Perceptual | Monitoring fatigue; loss of situational awareness | Automated status tracking; proactive update display; shift handover support |
| Recovery | Hours-days | Cognitive | Premature stand-down; missed secondary failures | Recovery checklist; automated monitoring for relapse indicators |

### 3.3 Cognitive Load Reduction Strategies

1. **Progressive disclosure:** Show summary first; allow drill-down on demand
2. **Pre-attentive processing:** Use colour, shape, and motion for instant status recognition
3. **Chunking:** Group related information into meaningful clusters (by sector, by severity, by time)
4. **Consistent spatial mapping:** Infrastructure elements always appear in the same screen location
5. **Minimise mode errors:** Make the current system state (training/live, normal/emergency) unmistakably visible

---

## 4. Automation Bias Risks and Mitigations

### 4.1 The Automation Bias Problem

Automation bias is the tendency for operators to over-rely on automated recommendations, even when contradicted by other available evidence. In the context of Munin, this risk is acute because:

- Munin's analysis incorporates more data than any human can process simultaneously
- The system presents recommendations with apparent confidence
- Operators may lack the expertise to independently verify cascade models
- Time pressure during crises increases reliance on automated advice

### 4.2 Documented Automation Bias Failure Modes

| Failure Mode | Description | Munin-Specific Risk |
|-------------|-------------|---------------------|
| Omission error | Operator fails to act because automation does not alert | Munin's anomaly model has blind spots; sensor data gaps create false negatives |
| Commission error | Operator follows incorrect recommendation without questioning | Cascade model error propagated through playbook to operator action |
| Out-of-the-loop unfamiliarity | Operator cannot take manual control because automation has handled routine tasks | Long periods of quiet monitoring reduce operator readiness for manual assessment |
| Complacency | Routine agreement with recommendations reduces critical evaluation | High accuracy rate makes rare errors harder to catch |

### 4.3 Anti-Automation-Bias Design Measures

1. **Mandatory uncertainty display:** Every recommendation includes an explicit confidence interval and the key assumptions it depends upon.
2. **Contradictory evidence surfacing:** When available data conflicts with the recommendation, the conflicting evidence is prominently displayed.
3. **Periodic verification challenges:** During low-activity periods, the system presents calibration scenarios to maintain operator engagement (ref: Training Mode, TR-001).
4. **Recommendation justification:** Operators must select from a list of reasons when approving a recommendation, preventing mindless acceptance.
5. **Disagreement tracking:** When operators override recommendations, the system records this as a learning signal and positively reinforces independent judgement.
6. **Rotation of presentation format:** Recommendations are not always presented identically, preventing purely procedural acceptance patterns.

---

## 5. Decision Fatigue Considerations

### 5.1 Fatigue Model

Decision quality degrades predictably over time:

- **0-2 hours:** Full cognitive capacity; thorough evaluation of recommendations
- **2-4 hours:** Subtle degradation; tendency toward default/recommended options increases
- **4-8 hours:** Significant degradation; increased error rate; reduced ability to detect anomalies
- **8+ hours:** Severe impairment; comparable to mild intoxication in decision quality

### 5.2 Fatigue Mitigations

| Mitigation | Implementation | Enforcement |
|-----------|---------------|-------------|
| Mandatory shift rotation | UI displays session duration prominently; alerts at 6h and 8h marks | Soft lock at 10h requiring Gold Commander override |
| Decision complexity tracking | System monitors decision rate and escalation frequency per operator | Automatic escalation suggestion when complexity exceeds thresholds |
| Fatigue-aware UI mode | After 6 hours, UI reduces information density and increases confirmation steps | Automatic activation; operator cannot disable |
| Handover protocol | Structured handover checklist with situation summary generation | Enforced checklist completion before new operator assumes role |
| Rest period logging | Operators must confirm adequate rest before assuming duties | Pre-shift acknowledgement; logged in audit trail |

---

## 6. UI Design Principles Derived from Analysis

### 6.1 Core Principles

| # | Principle | Rationale | Implementation Guideline |
|---|-----------|-----------|-------------------------|
| 1 | Status at a glance | Operators must assess system state in under 3 seconds | Colour-coded summary bar visible from 3 metres; no scroll required for critical status |
| 2 | Evidence before recommendation | Operators should form initial assessment before seeing system advice | Two-phase display: evidence panel appears first; recommendation revealed on operator action |
| 3 | Honest uncertainty | False confidence is more dangerous than acknowledged ignorance | Confidence intervals on all quantitative outputs; explicit "unknown" states rather than interpolation |
| 4 | Consistent mental model | The UI should reinforce accurate understanding of system capabilities and limitations | Permanent display of system mode, data freshness, and known limitations |
| 5 | Graceful degradation | UI remains usable even when subsystems fail | Fallback displays for each component; clear indication of what is degraded |
| 6 | Reversibility awareness | Operators should understand which actions are reversible before committing | Explicit labelling of irreversible actions; confirmation dialogs proportional to consequence severity |
| 7 | Minimal mode confusion | Training and live modes must be unmistakable | Full-screen visual differentiation (colour scheme, border, watermark) for each mode |
| 8 | Shift-worker optimised | Display must be comfortable for extended viewing in control room lighting | Dark theme default; adjustable brightness; no auto-playing animations; reduced blue light after 20:00 |

### 6.2 Accessibility Requirements

- Colour coding must be supplemented with shape/pattern for colour-blind operators
- All critical interactions must be achievable via keyboard
- Text must meet WCAG AA contrast ratio requirements at minimum
- Audio alerts must have visual equivalents
- UI must function on displays from 24" to 65" without layout breakage

---

## 7. References

- NUREG-0711: Human Factors Engineering Program Review Model (US NRC)
- IEC 61771: Nuclear Power Plants - Human Factors
- HSG48: Reducing Error and Influencing Behaviour (UK HSE)
- Endsley, M.R. (1995). Toward a Theory of Situation Awareness in Dynamic Systems
- Parasuraman, R. & Manzey, D.H. (2010). Complacency and Bias in Human Use of Automation

---

**END OF DOCUMENT HF-001**
