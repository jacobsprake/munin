# Market Sizing — Munin (SPR-271)

Order-of-magnitude estimates for investor conversations. These are not precise figures; assumptions are noted inline.

---

## Bottom-up sizing

### 1. Government emergency management software

**UK (~£50-100M/year)**
- ~50 local resilience forums coordinate multi-agency emergency response, mostly using legacy tools (spreadsheets, GIS layers, manual call trees)
- Environment Agency flood/environmental incident coordination
- Cabinet Office COBR situational awareness tooling
- Assumption: aggregating known contracts (Airwave replacement, ResilienceDirect, various GIS/C2 systems) puts the coordination tooling layer at £50-100M/year. Much of this is fragmented across siloed vendors.

**EU (~€500M-1B compliance technology market)**
- 27 member states must transpose the CER Directive by October 2024, with entity-level compliance by July 2026
- Each member state needs tooling for: critical entity identification, risk assessment, dependency mapping, incident notification
- Assumption: €20-40M average per member state for CER compliance technology (identification, assessment, monitoring, reporting). Some states will spend far less, a few (Germany, France, Netherlands) will spend significantly more.

**US (~$1-2B/year)**
- FEMA ($30B+ annual budget, but technology is a fraction — estimated $500M-1B on coordination/modelling tools)
- 50 state emergency management agencies, each with their own systems
- CISA critical infrastructure protection programs
- Assumption: includes existing spend on GIS, incident management platforms (WebEOC, NC4, etc.), and catastrophe modelling contracts across federal and state levels.

**Global government total: ~$2-4B/year** (order of magnitude)

---

### 2. Critical infrastructure operators (water, energy, telecom)

**UK market structure:**
- ~30 water and sewerage companies (11 regional + ~20 smaller water-only)
- ~14 electricity distribution network operators (DNOs)
- ~4 major telecoms (BT/Openreach, Virgin Media O2, Vodafone, Three)
- Gas distribution: 4 networks (Cadent, SGN, Northern Gas, Wales & West)
- Assumption: ~60-80 entities in scope for cross-sector dependency monitoring

**EU market structure:**
- ~3,000 critical entities expected to be identified under CER across all member states
- Sectors: energy, transport, banking, financial market infrastructure, health, drinking water, wastewater, digital infrastructure, public administration, space, food
- Assumption: not all 3,000 will buy tooling immediately; early movers will be energy, water, and telecom

**Contract value: £100K-1M/year per entity**
- Lower end: dependency mapping and monitoring dashboard for a single-sector operator
- Upper end: real-time cross-sector cascade modelling with API integrations, incident correlation, and reporting
- Assumption: pricing based on comparable infrastructure monitoring SaaS (not bespoke consulting engagements)

**Addressable market from operators alone:**
- UK: 60 entities x £300K avg = ~£18M/year
- EU: 500 early-mover entities x €250K avg = ~€125M/year
- Assumption: "early mover" = ~15-20% of identified critical entities adopt within 3 years of CER deadline

---

### 3. Reinsurance catastrophe modelling

**Market context:**
- Global catastrophe modelling market estimated at $5-10B (dominated by Verisk/AIR, Moody's/RMS, CoreLogic)
- Existing models focus on natural catastrophe (nat-cat): hurricane, earthquake, flood
- Cascade failure modelling (infrastructure interdependency) is a gap — no major vendor models what happens when a flood knocks out a substation that feeds a water treatment plant that serves a hospital
- Key buyers: Swiss Re, Munich Re, Lloyd's syndicates, large P&C insurers

**Munin's slice:**
- Munin does not replace nat-cat models; it adds a cascade/dependency layer on top
- Better cascade prediction = better pricing of correlated infrastructure losses
- Assumption: if cascade modelling captures 5-10% of the cat modelling market over time, that is $250M-1B globally
- Near-term: partnership or data licensing deals with 1-2 major reinsurers, likely £1-5M/year each

---

## Stepping stones (not top-down TAM)

These are concrete, sequenced revenue milestones — not a "we capture X% of a $50B market" story.

| Stage | Target | Deal size | ARR |
|-------|--------|-----------|-----|
| Wedge | 5 UK water authorities | £200K | £1M |
| Expand UK | 30 water + 14 DNOs | £300K avg | ~£13M |
| EU CER early movers | 100 critical entities | €250K | ~€25M |
| National government | 1 UK/EU government contract | £5-20M | £5-20M |

**Why this sequence works:**
- Water authorities are the most approachable: regulated, compliance-driven, mid-sized procurement teams, existing pain point (they already know their dependencies are poorly mapped)
- DNOs are adjacent and share physical infrastructure corridors with water
- CER compliance creates a forcing function across EU — entities must demonstrate resilience measures
- Government contracts follow after demonstrated capability with operators

---

## Why now

**CER Directive deadline: July 17, 2026**
- Critical entities must have resilience measures in place, including dependency assessments
- Member states must complete critical entity identification by early 2026
- This is a hard regulatory deadline, not a voluntary adoption curve
- Procurement cycles for compliance tooling are happening now (2025-2026)

**No incumbent cross-sector dependency tool exists**
- Existing tools are sector-specific (SCADA monitoring for energy, telemetry for water, network monitoring for telecom)
- No vendor offers cross-sector cascade modelling — the thing that actually matters when failures propagate
- Closest analogues are bespoke consulting engagements (expensive, non-recurring, not real-time)

**Post-quantum cryptography timeline creates urgency for signing infrastructure**
- NIST PQC standards finalized (ML-KEM, ML-DSA, SLH-DSA)
- "Harvest now, decrypt later" threat is already active for critical infrastructure data
- Munin's cryptographic signing layer (sovereign key management, verifiable audit trails) is forward-compatible with PQC
- Entities adopting infrastructure monitoring tools now will prefer ones that do not need to be ripped out in 3-5 years

---

## Key assumptions and caveats

- All figures are order-of-magnitude. They are directionally correct, not precisely sourced.
- Government spending estimates aggregate publicly available contract data and budget line items; actual figures vary year to year.
- CER entity counts are based on European Commission impact assessments; final member state identification may differ.
- Contract values assume SaaS-like pricing, not large systems integrator engagements. If Munin enters via an SI channel, deal sizes may be larger but margins lower.
- The reinsurance opportunity is speculative at this stage — it requires proving that cascade modelling improves pricing accuracy, which is a research question as much as a sales question.
- US market is noted for completeness but is not the near-term focus. Regulatory drivers (CER) are stronger in UK/EU.
