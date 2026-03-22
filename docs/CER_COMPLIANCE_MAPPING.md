# CER DIRECTIVE (2022/2557) COMPLIANCE MAPPING --- Munin v1

| Field              | Value                                                        |
|--------------------|--------------------------------------------------------------|
| **Classification** | OFFICIAL-SENSITIVE                                           |
| **Document ID**    | CER-001                                                      |
| **Version**        | 1.0                                                          |
| **Date**           | 2026-03-22                                                   |
| **Author**         | Munin Security Engineering                                   |
| **Status**         | DRAFT --- For Internal Review                                |
| **Directive**      | Directive (EU) 2022/2557 on the resilience of critical entities (CER) |
| **Related Docs**   | IC-001 (IEC62443_MAPPING.md), SC-001 (SAFETY_CASE.md), TM-001 (THREAT_MODEL.md) |
| **Tracking**       | SPR-270                                                      |

---

## 1. What is the CER Directive?

Directive (EU) 2022/2557 --- the Critical Entities Resilience Directive (CER) --- replaces the 2008 European Critical Infrastructure Directive. It requires EU member states to identify critical entities across 11 sectors (energy, transport, health, drinking water, wastewater, digital infrastructure, public administration, space, food, financial markets, manufacturing) and ensure those entities can prevent, resist, absorb, and recover from disruptive incidents.

**Transposition deadline: 17 July 2026.** Member states must transpose the directive into national law and identify critical entities by this date. Critical entities themselves must comply with resilience obligations within 10 months of notification.

CER matters for infrastructure operators because it introduces legally binding resilience requirements --- including mandatory risk assessments, incident notification, and cross-border coordination --- that go beyond existing sector-specific regulation.

---

## 2. Article-to-Feature Mapping

| CER Article | Requirement Summary | Munin Feature | Implementation Status |
|-------------|---------------------|---------------|----------------------|
| **Art 4** | Member states adopt a strategy for enhancing critical entity resilience | Munin provides the technical substrate for national resilience strategies: sovereign deployment per jurisdiction, full audit trail | Platform available |
| **Art 5** | Member states identify critical entities, including entities providing essential services with cross-sector dependencies | Shadow link discovery identifies cross-sector dependencies that are invisible to manual inventories; dependency graph surfaces entities whose disruption would cascade across sectors | Implemented |
| **Art 6** | Member state risk assessment must account for cross-sector and cross-border dependencies, natural and man-made threats | Cascade simulation models failure propagation across sector boundaries; dependency graph quantifies inter-sector coupling; scenario benchmarks cover natural hazards (flood, storm) and adversarial threats | Implemented |
| **Art 8** | Critical entities must carry out risk assessments considering all relevant risks that could disrupt essential services | Evaluation harness runs scenario-based risk assessments against real infrastructure topology; results are versioned and auditable; STPA-based safety analysis identifies causal scenarios | Implemented |
| **Art 11** | Critical entities must take technical, security, and organisational resilience measures proportionate to identified risks | Defence-in-depth architecture: TEE-based computation, M-of-N governance for sensitive operations, air-gapped deployment option, IEC 62443 zone/conduit model | Implemented |
| **Art 12** | Critical entities must notify competent authority of incidents within 24 hours (initial notification), with full report within one month | Authorization packet generates a cryptographically signed audit trail for every state-changing operation; incident timeline can be exported within minutes, not hours | Implemented |
| **Art 13** | Specific obligations for critical entities with cross-border significance; cooperation between member states | Sovereign per-jurisdiction architecture ensures data residency while enabling structured packet exchange between national instances; no single foreign jurisdiction controls the system | Designed |
| **Art 14** | Member states designate competent authorities; supervisory framework for oversight of critical entities | Ministry integration layer provides read-only supervisory access; M-of-N governance prevents unilateral override; audit logs are tamper-evident | Implemented |
| **Art 15** | Competent authorities may conduct inspections, audits, and require information from critical entities | Observability stack exposes system state to authorised supervisors without granting write access; audit log integrity is cryptographically verifiable | Implemented |
| **Art 16** | Enforcement actions and penalties for non-compliance | Audit trail provides the evidentiary basis for demonstrating compliance or identifying failure to comply | Implemented |

---

## 3. What Munin Uniquely Enables for CER

The CER Directive repeatedly emphasises cross-sector and cross-border dependencies (Articles 5, 6, 13). No incumbent infrastructure monitoring tool --- neither SCADA historians, GIS platforms, nor enterprise risk registers --- performs automated cross-sector dependency discovery.

Munin fills this gap:

- **Shadow link discovery** crawls operational data to find dependencies that exist in practice but not in documentation. A hospital's backup generator depends on a fuel supplier who depends on a port facility --- CER Article 5 requires member states to identify exactly these chains. Munin finds them automatically.

- **Cascade simulation** models what happens when one entity fails and its dependencies propagate. CER Article 6 requires risk assessments that account for cascading effects. Munin runs these simulations against real topology, not abstract matrices.

- **Sovereign architecture** means each member state operates its own instance with full data residency, while structured packet exchange enables the cross-border cooperation that Article 13 demands. No data leaves national jurisdiction without explicit authorisation.

- **Evaluation harness** provides repeatable, versioned risk assessments --- not one-off consultancy reports. When CER Article 8 requires critical entities to conduct risk assessments "at least every four years," Munin makes each assessment a reproducible artefact.

These capabilities are not incremental improvements over existing tools. They address requirements that CER introduces for the first time and that no current product satisfies.

---

## 4. Deployment Timeline for CER Compliance

A member state or critical entity can pilot Munin and achieve CER-relevant capability before the July 2026 deadline.

| Phase | Timeline | Activities | CER Articles Addressed |
|-------|----------|------------|----------------------|
| **Phase 1: Shadow deployment** | Weeks 1--4 | Deploy Munin in read-only mode against existing SCADA/OT data sources; run shadow link discovery; generate initial dependency graph | Art 5, Art 6 |
| **Phase 2: Risk assessment** | Weeks 5--8 | Configure scenario benchmarks for jurisdiction-specific hazards (flood, storm, supply chain disruption); run cascade simulations; produce first evaluation harness report | Art 6, Art 8 |
| **Phase 3: Incident readiness** | Weeks 9--12 | Integrate authorization packet workflow with national competent authority reporting requirements; test 24-hour notification pipeline; validate audit trail export | Art 12, Art 15 |
| **Phase 4: Supervisory integration** | Weeks 13--16 | Connect ministry integration layer to competent authority systems; configure M-of-N governance with appropriate stakeholders; establish ongoing monitoring | Art 14, Art 15 |
| **Phase 5: Cross-border (if applicable)** | Weeks 17--20 | Establish packet exchange with partner member state instances; validate data residency controls; test cross-border incident coordination | Art 13 |

Total time to operational CER compliance capability: approximately 20 weeks. Given the July 2026 deadline, a pilot beginning any time before March 2026 can reach full readiness.

---

## 5. References

- Directive (EU) 2022/2557 of the European Parliament and of the Council of 14 December 2022 on the resilience of critical entities, OJ L 333, 27.12.2022, p. 164--198.
- Commission Delegated Regulation (EU) 2023/2450 supplementing Directive (EU) 2022/2557 (list of essential services).
- Related Munin documentation: IEC62443_MAPPING.md, SAFETY_CASE.md, THREAT_MODEL.md, MINISTRY_INTEGRATION.md, AUDIT_LOG_INTEGRITY.md.
