# Scenarios: Evidence list (when Munin’s thesis applies)

Structured list of real-world events where **coordination/authorisation** was the primary or major bottleneck—and where Munin’s approach (pre-simulated playbooks, multi-agency authorisation in minutes) would apply. See [EVIDENCE_COORDINATION_BOTTLENECK.md](EVIDENCE_COORDINATION_BOTTLENECK.md) for detailed evidence and quotes.

---

## Tier 1: Primary bottleneck = coordination

| Event | Summary | Deaths / damage | How Munin would help |
|-------|---------|------------------|------------------------|
| **Hurricane Katrina (2005)** | Federal/state/local coordination failure; “numerous time consuming approval signatures”; FEMA/Red Cross supply chaos | 1,300+ deaths, ~$161B | Pre-simulated hurricane/evacuation playbooks; Byzantine multi-agency sign-off in minutes; pre-positioned resources |
| **Fukushima (2011)** | 7-hour venting delay despite approval; TEPCO–government disarray; evacuation uncoordinated | 51 evacuation-related deaths | Pre-validated venting and evacuation playbooks; single coordination layer |
| **September 11 (2001)** | FDNY/NYPD incompatible radios; collapse warning never relayed to FDNY | 343 firefighter deaths | Unified decision-support; shared situational awareness; pre-agreed playbooks |
| **UK floods (2007, 2011, 2015)** | “Lack of cross-government coordination”; 2–6 h for multi-agency authorisation | Recurring; Storm Desmond is demo case | Same as Carlisle demo: 2–6 h → &lt;2 min with pre-validated playbooks |

---

## Tier 2: Coordination a major factor

| Event | Summary | Notes |
|-------|---------|------|
| **2003 Northeast blackout** | Multi-utility, cross-border coordination; delayed load-shedding and restoration decisions | Pre-simulated grid cascade playbooks; automated coordination between operators |
| **2011 Tōhoku response** | Earthquake + tsunami + nuclear; 110k+ troops, 28k police, fire; coordination across three simultaneous crises | Multi-disaster cascade coordination |
| **Hurricane Maria (Puerto Rico 2017)** | FEMA–Puerto Rico coordination breakdown; federal–local authorisation delays | Similar to Katrina; pre-simulated playbooks and multi-agency sign-off |
| **California wildfires (multiple years)** | CAL FIRE, local fire, PG&E, evacuation authorities; evacuation and utility coordination delays | Pre-simulated fire + grid cascade playbooks |
| **2021 European floods (Germany/Belgium)** | Warnings existed; coordination to act on warnings failed; cross-border response | Pre-validated cross-border playbooks |
| **Mumbai 2008** | Multiple security agencies; NSG arrived 10 hours after attacks began; communication breakdown | Pre-simulated terrorist-response playbooks; multi-agency authorisation |

---

## Tier 3: Possible, need validation

| Event | Notes |
|-------|------|
| **COVID-19 response** | Federal–state, NHS–local, WHO–national coordination; supply chain coordination failures. Munin’s applicability (pre-simulation, playbooks) would need validation for pandemic-specific workflows. |
| **Haiti 2010** | International aid and UN/NGO/local coordination chaos. |
| **2004 Indian Ocean tsunami** | No regional warning coordination; international response coordination issues. |

---

## Criteria: When Munin applies vs when it doesn’t

**Munin applies when:**

- Multiple agencies are required to respond (federal, state, local, or across sectors).
- Decisions are time-sensitive (hours/minutes matter).
- Authorisation is complex (multiple signatures, legal review).
- Cascade patterns are predictable enough to pre-simulate.
- Infrastructure interdependencies exist (power → water → transport, etc.).
- There are known vulnerabilities (e.g. levees, grid nodes).

**Munin does not apply when:**

- **Equipment failure is primary** (e.g. Texas 2021 grid: frozen turbines; no amount of faster authorisation generates power from broken kit).
- **Insufficient capacity is primary** (e.g. Dubai 2024: drainage overwhelmed; coordination worked, physics didn’t).
- **Single-agency response** (no coordination bottleneck).
- **Instant catastrophic failure** (no time for any coordination).
- **Unpredictable/novel events** that cannot be pre-simulated meaningfully.

---

## Reference

- Evidence and quotes: [EVIDENCE_COORDINATION_BOTTLENECK.md](EVIDENCE_COORDINATION_BOTTLENECK.md)
- Primary demo (Storm Desmond): [CARLISLE_DEMO_SETUP.md](CARLISLE_DEMO_SETUP.md), [STORM_DESMOND_BASELINE.md](STORM_DESMOND_BASELINE.md)
- Baseline data for demo expansion: `engine/fixtures/disaster_baselines/`
