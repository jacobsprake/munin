# ADR-003: Temporal Correlation with Lag Detection vs Network Topology Analysis

**Date:** 2025-12-03

## Status

Accepted

## Context

Munin's primary analytical function is discovering "shadow links" — hidden dependencies between infrastructure systems that are not documented in any official registry. These dependencies are the ones that cause cascading failures: a water treatment plant that silently depends on a specific substation, a hospital backup generator that shares a fuel supply chain with a data center, a telecommunications tower whose cooling system draws from a municipal water main.

The critical insight is that most cross-sector infrastructure dependencies do not operate through digital network connections. They operate through physical channels: water flows through pipes, electricity flows through wires, fuel flows through supply chains, heat dissipates through shared geography. A water treatment plant does not send TCP packets to the power grid — it simply stops working when the power goes out.

This means that network-layer monitoring — packet capture, flow analysis, connection mapping — is fundamentally blind to the dependencies that matter most. You can instrument every switch and router in a country and still miss the dependency between a power plant and the river that cools it, or between a hospital and the road that its ambulances use.

The observable signal of these physical dependencies is temporal correlation. When system A experiences a disruption, system B experiences a correlated disruption after a characteristic lag. The lag encodes the physical mechanism: electrical dependencies propagate in milliseconds, water pressure changes propagate in minutes, thermal effects propagate in hours, supply chain disruptions propagate in days.

## Decision

Shadow link detection in Munin uses statistical temporal correlation analysis with lag detection as its primary inference mechanism.

The system ingests time-series telemetry from infrastructure sensors across sectors — voltage levels, flow rates, pressure readings, temperature measurements, throughput metrics — and computes pairwise cross-correlation functions with variable lag windows. Statistically significant correlations that persist across multiple independent disruption events are flagged as candidate shadow links.

The lag value is used to classify the likely physical mechanism of the dependency. Sub-second lags suggest electrical coupling. Minute-scale lags suggest fluid dynamics (water, gas). Hour-scale lags suggest thermal or chemical processes. Day-scale lags suggest supply chain or logistical dependencies.

Candidate shadow links are presented to human analysts with confidence scores, supporting evidence (the specific disruption events that produced the correlation), and suggested physical mechanisms. Analysts confirm, reject, or modify the inferred dependencies, and their decisions feed back into the model to improve future detection.

## Consequences

**Positive:**
- Detects dependencies that are invisible to network monitoring — the physical, cross-sector links that cause cascading failures.
- Works with existing sensor infrastructure. Most critical infrastructure systems already produce time-series telemetry for operational purposes.
- Lag classification provides actionable information about the nature of the dependency, not just its existence.
- Human-in-the-loop confirmation prevents false positives from entering the dependency graph.
- Improves over time as more disruption events provide additional correlation data.

**Negative:**
- Requires historical disruption data. The system cannot detect dependencies that have never been activated by a correlated event. Newly constructed infrastructure with no operational history is invisible until a disruption occurs.
- Correlation is not causation. Some correlations will be coincidental (e.g., two systems that both experience seasonal demand patterns). Human review is essential to filter these.
- Sensitivity to sensor quality. Noisy, sparse, or irregularly sampled telemetry reduces correlation detection accuracy.
- Privacy considerations. Cross-sector telemetry correlation could reveal commercially sensitive operational patterns. Data governance policies must address this.

## Alternatives Considered

**Network flow analysis:** Monitor digital network traffic between infrastructure systems to map dependencies. This approach is well-understood and has mature tooling (NetFlow, sFlow, packet capture). However, it only detects digital connections. The most dangerous infrastructure dependencies — the ones that cause cascading failures across sectors — operate through physical channels that network monitoring cannot see. A network flow map of a country's infrastructure would miss the majority of cross-sector dependencies. Rejected as fundamentally insufficient for the problem domain.

**Manual expert mapping:** Convene infrastructure operators and domain experts to manually document cross-sector dependencies. This produces high-quality dependency information for known relationships but does not scale. Expert knowledge is siloed within sectors, incomplete, and becomes stale as infrastructure evolves. The entire motivation for Munin is that manual mapping has failed to keep pace with infrastructure complexity. Rejected as the status quo that Munin is designed to improve upon.

**Graph databases of known connections:** Populate a graph database with officially documented infrastructure relationships (permits, contracts, utility records). This captures known dependencies but misses the unknown ones — which are precisely the dependencies that cause surprise cascading failures. Useful as a supplementary data source but insufficient as the primary detection mechanism. Incorporated as a complementary input to the correlation engine, not as a replacement.
