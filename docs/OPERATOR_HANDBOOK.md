# Munin: Operator Handbook

Classification: OFFICIAL -- SENSITIVE

Version: 1.0
Last revised: 2026-03-18
Owner: Critical Infrastructure Directorate

---

## 1. What Munin Does for You

Munin watches the hidden connections between infrastructure systems -- water,
power, and telecom -- and warns you when a failure in one system is likely to
cause problems in another. It predicts cascading failures before they happen
and recommends coordinated responses.

Munin watches the connections between infrastructure systems that your SCADA
cannot see.

Your SCADA system tells you the pressure in a pipe or the voltage on a bus.
Munin tells you that a drop in water pressure at the treatment plant is about
to cause a pump station failure that will flood the road carrying the telecom
fibre link to the hospital.

---

## 2. What Munin Will Never Do

Read this section carefully and refer back to it if you are ever uncertain.

- **Munin cannot control equipment.** It has no connection to any valve,
  breaker, pump, or switch. It is physically impossible for Munin to issue
  a command to your operational systems.

- **Munin cannot override your decisions.** If you disagree with a
  recommendation, you reject it. Munin logs your reasoning and moves on.

- **Munin cannot bypass your authority.** Every recommendation requires
  human approval from authorised signatories before any action is taken.
  Munin cannot escalate around you.

- **Version 1 is read-only, always.** Munin observes sensor data. It does
  not write to any operational system. This is enforced by hardware -- the
  data diode between your utility systems and Munin allows information to
  flow in one direction only.

---

## 3. Your Daily Workflow

On a normal day with no incidents, your Munin-related duties take
approximately 10 minutes per shift.

### 3.1 Start of Shift

1. **Open the Munin dashboard.** Your console shows sector-by-sector
   health: water, power, telecom. Each sector is colour-coded:
   - **Green:** All sensors reporting normally. No anomalies detected.
   - **Amber:** Minor anomaly or degraded sensor health. Worth a look
     but not urgent.
   - **Red:** Significant anomaly detected. A packet may be pending
     your review.

2. **Check sensor health.** The "Collector Status" panel shows which
   utility collectors are reporting and when they last sent data. If a
   collector is marked "STALE" (no data in the last 5 minutes), note it
   in your shift log and contact the relevant utility.

3. **Review new shadow links.** The "Shadow Links" panel shows any newly
   detected hidden dependencies between systems. For example: "New link
   detected: WTR-REG04-PUMP-017 <-> PWR-REG04-SUB-003 (confidence 0.82)."
   This means Munin has found a statistical relationship between a water
   pump and a power substation that was not in the known dependency model.
   Note new links in your shift log.

### 3.2 During Shift

- No active monitoring of Munin is required during normal operations.
  The system will alert you if an anomaly is detected.
- If the dashboard stays green, no Munin-related action is needed.

### 3.3 End of Shift

- Log "Munin status: normal" (or note any anomalies) in the shift
  handover record.
- Brief the incoming operator on any new shadow links or amber
  conditions.

---

## 4. During a Flood Incident

When Munin detects a developing situation, you will see a red alert on
your console. Follow these steps in order.

### Step 1: Read the Alert

The alert banner will state what Munin has detected. Example:

```
  ALERT: Cascade risk detected.
  Trigger: Flood gauge WTR-ENV-GAUGE-041 rising above threshold.
  Predicted cascade: Pump station WTR-REG04-PUMP-017 failure ->
    Road flooding on A-4012 -> Telecom fibre break TEL-REG04-FBR-009 ->
    Hospital TEL-REG04-HSP-002 connectivity loss.
  Confidence: 0.87
  Recommended playbook: FLOOD-CASCADE-04
```

### Step 2: Review the Cascade Prediction

Open the cascade detail view. You will see:

- **A diagram** showing the chain of systems at risk, in order.
- **Timeline estimate:** how long before each stage of the cascade
  is expected to occur.
- **Which sensors** are driving the prediction (with current values).

Ask yourself: does this make sense given what I know about conditions
on the ground?

### Step 3: Open the Recommended Playbook Packet

The packet contains:

- **Recommended actions** for each agency involved (e.g., "Pre-position
  portable pumps at grid reference X," "Divert traffic from A-4012,"
  "Alert telecom provider to prepare backup generator at cabinet Y").
- **Evidence summary:** the sensor data, graph state, and model outputs
  that led to this recommendation.
- **Uncertainty statement:** what Munin is not sure about (e.g., "Flood
  gauge WTR-ENV-GAUGE-041 has been in SUSPECT quality for the last 20
  minutes; prediction may be less reliable").

### Step 4: Check the Evidence and Uncertainty

Read the uncertainty statement carefully. If a key sensor is flagged as
SUSPECT or BAD, the prediction may be wrong. Use your judgment.

Look at the evidence graphs. Do the sensor trends match what you would
expect for a real flood event, or could this be a sensor malfunction?

### Step 5: Decide -- Sign or Reject

**If you agree** with the recommendation:

- Click "Sign Packet."
- Your digital signature is applied.
- The packet is forwarded to the next required signatory (e.g., the
  Infrastructure ministry representative).
- Once all required signatures are collected (the "quorum"), the packet
  status changes to AUTHORIZED and operators can act on it.

**If you disagree** with the recommendation:

- Click "Reject Packet."
- Enter your reasoning (e.g., "Gauge 041 is known to be unreliable in
  high-wind conditions. On-site team reports no flooding.").
- Your rejection and reasoning are logged permanently.
- You are free to take whatever alternative action you deem appropriate
  through normal channels.

There is no penalty for rejecting a Munin recommendation. The system
exists to support your judgment, not to replace it.

### Step 6: Coordinate Using the Signed Packet

Once a packet is AUTHORIZED, it serves as a coordination document:

- All agencies can see the same recommended actions.
- Each agency knows which other agencies have signed.
- The packet provides a shared reference for inter-agency communication.
- Actions taken (and any deviations) are logged against the packet for
  post-incident review.

### Step 7: Log the Outcome

After the incident, record what actually happened:

- Which recommended actions were taken?
- Which were modified or skipped, and why?
- Did the cascade occur as predicted?

This feedback improves future predictions.

---

## 5. Understanding Confidence Scores

Every Munin prediction comes with a confidence score between 0.0 and 1.0.
Here is what the numbers mean in practical terms.

| Score Range | What It Means                                           | What You Should Do                         |
|-------------|---------------------------------------------------------|--------------------------------------------|
| 0.90 - 1.00| Strong evidence from multiple independent sensors.      | Take seriously. Review and sign promptly   |
|             | The predicted cascade is highly likely given current    | if you agree with the evidence.            |
|             | conditions.                                             |                                            |
| 0.75 - 0.89| Good evidence but some uncertainty. One or more sensors | Review carefully. Check the uncertainty    |
|             | may be degraded, or the model has limited historical    | statement. Verify key sensors with on-site |
|             | data for this scenario.                                 | teams if time permits.                     |
| 0.60 - 0.74| Moderate evidence. The cascade is plausible but not     | Treat as an early warning. Monitor the     |
|             | certain. May be driven by a single sensor or a newly   | situation. Do not rush to sign unless      |
|             | detected shadow link with limited validation.           | ground conditions confirm the prediction.  |
| 0.40 - 0.59| Weak evidence. Munin sees a possible pattern but is     | Awareness only. Do not act on this alone.  |
|             | not confident. Could be noise.                          | Use it as one input among many.            |
| Below 0.40 | Very low confidence. Munin will typically not generate  | If you see this, it is likely flagged as   |
|             | a packet at this level unless the potential impact is   | informational only. No action expected.    |
|             | severe.                                                 |                                            |

**Key point:** a confidence score of 0.87 does not mean "87% chance of
happening." It means "87% of the sensor evidence is consistent with this
cascade model." The distinction matters. Real-world conditions that Munin
cannot see (e.g., a maintenance crew already on site) may change the
actual probability significantly.

---

## 6. When to Override Munin

**Always trust your own judgment.**

Munin is a tool. It processes sensor data and statistical models. It does
not know things that you know:

- That a sensor was replaced last week and is still being calibrated.
- That a road is already closed for planned maintenance.
- That a backup generator was installed at the telecom cabinet yesterday.
- That the weather forecast has changed in the last hour.

**Override Munin whenever:**

- The evidence does not match what you can see or confirm on the ground.
- A key sensor is flagged as SUSPECT or BAD and you believe the prediction
  is unreliable as a result.
- You have local knowledge that contradicts the model's assumptions.
- Your training and experience tell you the recommendation is wrong.

**When you override:**

- Reject the packet with a clear explanation.
- Take whatever action you believe is correct through your normal
  operational channels.
- Log your reasoning so it can be reviewed and so the model can be
  improved.

Munin learns from your overrides. Every rejection with a stated reason
is reviewed by the model improvement team and used to refine future
predictions. Your operational expertise makes the system better.

---

## Quick Reference Card

```
  +------------------------------------------+
  |  NORMAL DAY                              |
  |  1. Check dashboard (green = good)       |
  |  2. Check collector health               |
  |  3. Note new shadow links                |
  |  4. Log "all clear" at shift end         |
  +------------------------------------------+

  +------------------------------------------+
  |  INCIDENT                                |
  |  1. Read the alert                       |
  |  2. Review cascade prediction            |
  |  3. Open playbook packet                 |
  |  4. Check evidence + uncertainty         |
  |  5. Sign (agree) or Reject (disagree)    |
  |  6. Coordinate with agencies             |
  |  7. Log outcome                          |
  +------------------------------------------+

  +------------------------------------------+
  |  REMEMBER                                |
  |  - Munin cannot control equipment        |
  |  - Your judgment overrides Munin         |
  |  - Rejecting a recommendation is OK      |
  |  - Log your reasoning, always            |
  +------------------------------------------+
```

---

*End of document.*
