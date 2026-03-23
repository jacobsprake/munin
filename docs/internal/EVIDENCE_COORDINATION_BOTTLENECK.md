# Evidence: Coordination as the Bottleneck in Infrastructure Disasters

This document summarises real-world disasters where **multi-agency coordination and authorisation delays** were the primary or major bottleneck—the problem Munin is designed to address.

**Primary demo for evidence:** The live demo that illustrates coordination latency and Munin’s response is the **Storm Desmond (Carlisle) flood demo**. See [CARLISLE_DEMO_SETUP.md](CARLISLE_DEMO_SETUP.md) and [STORM_DESMOND_BASELINE.md](STORM_DESMOND_BASELINE.md). Run the Carlisle demo via `engine/carlisle_demo.py` or the `/carlisle-dashboard` route (see [README](../README.md) One-Command Demo section).

---

## Hurricane Katrina (2005)

**Deaths:** 1,300+  
**Damage:** ~\$161 billion  
**Location:** USA (Gulf Coast, especially New Orleans)

### Coordination as primary failure

Official reports identify coordination and authorisation as the main failure mode:

- **“Numerous time consuming approval signatures and data processing steps prior to any action, delaying the response.”** — Mayor Melvin Holden, cited in official response reviews.
- **“Poor operational coordination generated a weak Federal performance.”** — President’s report on the Federal response.
- **“The system, at every level of government, was not well-coordinated and was overwhelmed.”** — President George W. Bush.

FEMA waited for state requests instead of acting proactively; the Red Cross ordered 300,000 meals, FEMA cancelled the order, and meals were eventually delivered 37 days later (Oct 8 vs Sept 1). Multi-day delays in basic coordination and authorisation contributed directly to loss of life and suffering.

### Munin counterfactual

With pre-simulated hurricane and evacuation playbooks, pre-validated legal authority, and Byzantine-style multi-agency sign-off (e.g. FEMA + state + local in a single streamlined flow), authorisation could have been completed in minutes rather than days. Pre-positioning and pre-contracted resources could have been activated before landfall.

---

## Fukushima Daiichi (2011)

**Deaths:** 51 evacuation-related (hypothermia, medical neglect during evacuation)  
**Damage:** Ongoing (multi-decade cleanup)  
**Location:** Japan

### Coordination and command disarray

- **7+ hour delay in venting decision** despite top TEPCO officials having approved the action; coordination between TEPCO, the Prime Minister’s office, and regulators caused the delay.
- **“Crisis-command disarray caused by government and TEPCO.”** — Official investigation.
- **“Coordination among the central and local governments was hampered by limited and poor communications. Protective actions were improvised and uncoordinated, particularly when evacuating vulnerable populations.”** — NRC/Lessons Learned report.

Evacuation and protective actions were improvised and uncoordinated; timely venting and clearer multi-party authorisation could have reduced consequences.

### Munin counterfactual

Pre-simulated nuclear cascade scenarios with pre-validated venting and evacuation playbooks, and a single coordination layer for TEPCO + national + prefectural government, could have cut authorisation from hours to minutes and reduced evacuation chaos.

---

## September 11, 2001 (World Trade Center)

**Deaths:** 343 firefighters (many linked to coordination and communication failures)  
**Location:** USA (New York City)

### Interagency communication and coordination failure

- **FDNY and NYPD used incompatible radio systems** (VHF vs UHF); Port Authority Police used a third system. “UHF (police) and VHF (fire) frequencies were not interoperable, hampering interagency coordination.”
- **NYPD helicopter had clear warning of imminent collapse**; this was never relayed to FDNY command. Firefighters in the North Tower did not know the South Tower had collapsed.
- **“Commanders lacked communication with NYPD who had helicopters at scene.”** — Post-incident reports.

Coordination and information-sharing between agencies were the bottleneck, not lack of data or willingness to act.

### Munin counterfactual

A unified decision-support layer with pre-agreed playbooks and shared situational awareness (e.g. helicopter reconnaissance integrated into command) could have enabled faster, coordinated decisions and safer withdrawal.

---

## UK Floods (2007, 2011, and context for Storm Desmond)

**Context:** Recurring flood events with documented coordination problems.

- **“Lack of cross-government coordination”** and **“insufficient clarity over leadership for adaptation.”** — UK Parliamentary and audit reports.
- **“Coordination difficulties”** cited as a major failure by experts; only **12% of UK experts** thought government performed well in flood response (vs 64% in Germany in comparable studies).
- **Storm Desmond (2015)** is the event we use for the **primary evidence demo** (Carlisle): see [STORM_DESMOND_BASELINE.md](STORM_DESMOND_BASELINE.md) and the Carlisle flood gate coordination playbook. Multi-agency authorisation for coordinated flood operations followed the traditional 2–6 hour cycle; Munin reduces that to under 2 minutes in the demo.

---

## Summary

| Event           | Primary bottleneck   | Munin’s relevance                                      |
|----------------|----------------------|--------------------------------------------------------|
| Katrina        | Coordination/sign-off| Pre-simulated playbooks, multi-agency sign-off in mins |
| Fukushima      | Command/coordination | Pre-validated procedures, single coordination layer    |
| 9/11           | Interagency comms    | Shared situational awareness, pre-agreed playbooks      |
| UK floods      | Cross-government     | Same as Storm Desmond demo: 2–6 h → &lt;2 min            |

For a full list of scenarios (Tier 1/2/3 and when Munin applies), see [SCENARIOS_EVIDENCE_LIST.md](SCENARIOS_EVIDENCE_LIST.md).
