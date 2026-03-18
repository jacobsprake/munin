# Digital Twin Architecture

**Document ID:** DT-001
**Classification:** OFFICIAL - SENSITIVE
**Version:** 0.4.0-draft
**Last Updated:** 2026-03-18
**Owner:** Munin Safety Engineering
**Review Cycle:** Quarterly

---

## 1. Purpose

This document describes the digital twin subsystem within the Munin platform. The digital twin provides physics-based simulation of interconnected infrastructure systems, enabling scenario testing, operator training, cascade analysis validation, and ground truth generation for benchmarking.

---

## 2. Architecture Overview

```
+-----------------------------------------------------------------------+
|                         Digital Twin Engine                             |
|                                                                       |
|  +----------------+   +----------------+   +---------------------+    |
|  | Power Grid     |   | Water Network  |   | Telecommunications  |    |
|  | Subsystem Model|   | Subsystem Model|   | Subsystem Model     |    |
|  |                |   |                |   |                     |    |
|  | - Generation   |   | - Reservoirs   |   | - Core network      |    |
|  | - Transmission |   | - Treatment    |   | - Last mile         |    |
|  | - Distribution |   | - Distribution |   | - Data centres      |    |
|  | - Load models  |   | - Pumping      |   | - Power dependency  |    |
|  +-------+--------+   +-------+--------+   +----------+----------+    |
|          |                     |                       |              |
|          +----------+----------+-----------+-----------+              |
|                     |                      |                         |
|              +------v------+        +------v------+                  |
|              | Coupling    |        | Cascade     |                  |
|              | Interface   |        | Propagation |                  |
|              | Engine      |        | Engine      |                  |
|              +------+------+        +------+------+                  |
|                     |                      |                         |
|              +------v----------------------v------+                  |
|              | Scenario Injection & Evaluation     |                  |
|              +------------------------------------+                  |
+-----------------------------------------------------------------------+
```

---

## 3. Physics-Based Subsystem Models

### 3.1 Power Grid Model

| Component | Model Type | Fidelity | Key Parameters |
|-----------|-----------|----------|----------------|
| Generation | Dispatch model with ramp constraints | Medium | Capacity, ramp rate, fuel type, minimum stable generation |
| Transmission | DC power flow approximation | Medium | Line impedance, thermal limits, topology |
| Distribution | Simplified radial feeder model | Low-Medium | Load profiles, transformer ratings, switching topology |
| Demand | Statistical load profiles with weather correlation | Medium | Base load, temperature sensitivity, time-of-day patterns |
| Renewable | Weather-driven generation profiles | Medium | Capacity factor curves, forecast uncertainty bands |

**Governing equations:** DC power flow (P = B * theta); generator dispatch optimisation; demand response curves.

### 3.2 Water Network Model

| Component | Model Type | Fidelity | Key Parameters |
|-----------|-----------|----------|----------------|
| Reservoirs | Mass balance with capacity constraints | Medium | Volume, inflow, outflow, level thresholds |
| Treatment works | Throughput model with quality constraints | Low-Medium | Capacity, energy dependency, chemical requirements |
| Distribution | Simplified hydraulic network | Low | Pressure zones, pumping stations, demand nodes |
| Pumping | Energy-dependent throughput | Medium | Power consumption, flow rate, pressure head |

**Key dependency:** Water treatment and pumping are critically dependent on power supply. Loss of power triggers immediate cascade into water sector.

### 3.3 Telecommunications Model

| Component | Model Type | Fidelity | Key Parameters |
|-----------|-----------|----------|----------------|
| Core network | Graph-based routing with capacity | Medium | Node capacity, link bandwidth, routing policy |
| Mobile base stations | Coverage model with power dependency | Low-Medium | Battery backup duration, generator availability |
| Data centres | Availability model with redundancy | Medium | UPS duration, generator start time, cooling dependency |
| Last mile | Statistical availability model | Low | Technology mix, power dependency, redundancy |

**Key dependency:** Telecommunications infrastructure depends on power for base stations (typically 4-8h battery backup) and data centres (typically 24-72h generator capacity).

---

## 4. Coupling Interfaces and Cascade Propagation

### 4.1 Inter-Sector Dependencies

| Source Sector | Dependent Sector | Coupling Mechanism | Cascade Latency |
|--------------|-----------------|-------------------|----------------|
| Power | Water | Treatment and pumping require electricity | Minutes (pumps) to hours (reservoirs drain) |
| Power | Telecoms | Base stations, data centres require electricity | Hours (battery backup) to days (generators) |
| Water | Power | Cooling water for thermal generation | Hours to days (thermal limits) |
| Telecoms | Power | SCADA communications for grid management | Minutes (loss of visibility) |
| Telecoms | Water | Remote monitoring and control | Hours (manual fallback) |
| Water | Telecoms | Cooling for data centres (some facilities) | Hours (thermal limits) |

### 4.2 Cascade Propagation Engine

The cascade propagation engine models how failures in one sector flow to dependent sectors:

```
CascadePropagation {
  1. Inject initial failure event (sector, component, severity)
  2. Evaluate direct dependencies of failed component
  3. For each dependency:
     a. Calculate degradation based on coupling strength and backup capacity
     b. If degradation exceeds threshold -> mark as failed
     c. Apply time delay based on cascade latency model
  4. Recurse for newly failed components
  5. Terminate when no new failures propagate or maximum time horizon reached
  6. Output: time-series of system state showing cascade progression
}
```

### 4.3 Cascade Metrics

| Metric | Definition | Use |
|--------|-----------|-----|
| Cascade depth | Maximum number of sequential dependency hops | Measures systemic risk |
| Cascade breadth | Number of sectors affected | Measures impact scope |
| Cascade velocity | Time from initial failure to maximum extent | Measures response window |
| Recovery sequence | Optimal order for restoring services | Informs playbook generation |

---

## 5. Scenario Injection and Evaluation

### 5.1 Scenario Types

| Type | Description | Use Case |
|------|------------|----------|
| Component failure | Single component removed from service | Unit testing of cascade model |
| Sector degradation | Gradual reduction in sector capacity | Stress testing; training scenarios |
| Weather event | Correlated failures driven by weather model | Realistic multi-sector scenarios |
| Adversarial attack | Targeted failures designed to maximise cascade | Red team exercises; security analysis |
| Historical replay | Recreation of documented past incidents | Validation; training; benchmarking |
| Stochastic | Random failure injection with configurable probability | Monte Carlo resilience analysis |

### 5.2 Scenario Definition Format

```
Scenario {
  id: string
  name: string
  description: string
  difficulty: 1-5
  events: [
    {
      time: RelativeTimestamp
      sector: Sector
      component: ComponentID
      action: "fail" | "degrade" | "restore"
      severity: 0.0-1.0
      duration: Duration | "permanent"
    }
  ]
  expectedCascade: CascadeExpectation  // For validation
  scoringCriteria: ScoringRubric       // For training
}
```

### 5.3 Evaluation Framework

Each scenario execution produces:

- **Cascade accuracy score:** How well did the analysis model predict the simulated cascade?
- **Recommendation quality score:** Were the generated playbook recommendations appropriate for the scenario?
- **Operator decision score:** (Training mode only) How did operator decisions compare to optimal response?
- **Time-to-detection:** How quickly did the system identify the developing cascade?
- **False positive rate:** How many spurious alerts were generated?

---

## 6. Ground Truth Generation for Benchmarking

### 6.1 Purpose

The digital twin generates synthetic but physically plausible ground truth data for:

- Validating cascade detection algorithms without requiring real infrastructure failures
- Benchmarking anomaly detection sensitivity and specificity
- Regression testing after model updates
- Comparing Munin's performance across software versions

### 6.2 Ground Truth Dataset Structure

| Layer | Content | Format |
|-------|---------|--------|
| Sensor streams | Simulated sensor readings matching real sensor protocols | Time-series with configurable noise and sampling rate |
| System state | True state of all modelled components | State vector at each simulation timestep |
| Cascade trace | Ground truth cascade propagation path and timing | Directed graph with timestamps |
| Optimal response | Pre-computed optimal operator response sequence | Decision sequence with timing |

### 6.3 Validation Against Historical Data

Where historical incident data is available, the digital twin is calibrated by:

1. Replaying the incident initial conditions
2. Comparing simulated cascade propagation against documented actual cascade
3. Adjusting coupling parameters to minimise divergence
4. Recording calibration confidence metrics

---

## 7. Future: Connection to Real-Time Data Feeds

### 7.1 Vision

In future phases, the digital twin will operate alongside real-time data feeds, providing:

- **Shadow mode:** Digital twin runs in parallel with live analysis, comparing predictions against observed reality to continuously validate model accuracy
- **What-if analysis:** Operators can fork the current real-world state into the digital twin and explore hypothetical scenarios without affecting live operations
- **Predictive cascade warning:** Using current system state as initial conditions, the digital twin simulates potential cascade paths before failures occur

### 7.2 Requirements for Real-Time Integration

| Requirement | Description | Status |
|------------|-------------|--------|
| State synchronisation | Digital twin state must track real-world state within acceptable latency | Design phase |
| Computational budget | Real-time twin must complete simulation faster than real time | Benchmarking required |
| Divergence detection | Automatic detection of when twin diverges from reality | Planned |
| Data diode compatibility | Real-time feed must transit hardware data diode | Architecture confirmed |
| Operator interface | Clear visual separation of twin predictions vs. observed reality | UI design pending |

---

## 8. References

- Munin Cascade Analysis Engine (internal)
- IEC 62351: Security for power system communications
- NERC CIP standards for critical infrastructure protection
- UK National Risk Register (infrastructure interdependency analysis)

---

**END OF DOCUMENT DT-001**
