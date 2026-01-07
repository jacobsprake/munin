# Munin PRD Add-on: "Thiel Objection Crusher" Expansion

**"Munin is not software that explains infrastructure. It is software that grants permission for infrastructure to survive. The moat is Shadow Links inferred from ugly OT telemetry. The differentiator is the Authoritative Handshake that collapses liability paralysis into a signed, auditable packet. The deployment posture is sovereign by default."**

## Overview

This add-on transforms Munin from a graph inference tool into a **sovereign orchestration layer** for physical infrastructure. It addresses five critical objections that could dismiss Munin as consulting, a dashboard, or a shallow demo.

## Core Pillars

1. **Shadow Link Evidence System** - Detects hidden dependencies from telemetry
2. **Pre-Validation Simulation System** - Simulates cascades before they occur
3. **Permission Engine (Authoritative Handshake)** - Converts inference into permission
4. **Sovereign Runtime** - Air-gapped operational mode
5. **Hyperfluency Interface** - Protocol + dirty data realism

## Key Features Implemented

### Shadow Links
- First-class edge type with proof: confidence, lag, stability, windows, counterexamples
- Toggle to show only shadow links (edges not in registry)
- Visual distinction (amber color) in graph view
- Evidence pack export for any edge

### Sensor Health & Observability
- Observability scores with drivers (missingness, noise, drift, timestamp skew)
- Sensor degradation modes for demo (drift, missingness, stuck-at, timestamp skew)
- Graceful confidence degradation under sensor issues

### Pre-Validation Simulation
- Timeline scrubber with event markers
- Cascade prediction with time-to-impact
- Confidence bands that widen under degradation
- Recommended playbook cards
- Latency impact comparison widget

### Authoritative Handshake
- Technical verification (simulated success probability, constraints)
- Actuator boundary statement (no direct OT writes)
- Signing workflow with hash generation
- Immutable audit trail (append-only)
- Regulatory basis mapping

### Sovereign Runtime
- Deployment mode selector (On-Prem OT, Sovereign Cloud, Lab Demo)
- Connectivity state indicator
- Local node status grid
- Offline capability (graph browsing, simulation replay, handshake viewing)
- Signed update bundles (model + playbooks)

### Protocol Deep-Dive
- Raw hex stream display
- Decoded protocol fields
- Dirty data showcase toggles
- Sensor health impact visualization

### Expansion Map
- Three-step conquest plan: Water → Power → Telecom
- Exact data sources required
- Inference coverage targets
- Expected shadow link types
- Regulatory frameworks

## Data Contract Extensions

### Node
- `observability: { score: number; drivers: string[] }`

### Edge
- `isShadowLink: boolean`
- `stabilityScore: number`
- `evidenceWindowCount: number`
- `confounderNotes: string[]`

### EvidenceWindow
- `qualityContext: { missingness: number; noiseScore: number; driftScore: number }`
- `supportType: "support" | "counterexample"`

### HandshakePacket
- `technicalVerification: { simulatedSuccessProb: number; constraintsSatisfied: string[]; constraintsFailed?: string[] }`
- `actuatorBoundary: { writesToHardware: false; notes: string }`
- `audit: { lastAuditHash: string; previousAuditHash?: string }`

### SystemStatus (new)
- `deploymentMode: "on_prem_ot" | "sovereign_cloud" | "lab_demo"`
- `connectivityState: "connected" | "degraded" | "disconnected"`
- `localNodes: Array<{ nodeId: string; region: string; lastSyncTs: string; health: HealthStatus }>`

## Engine Enhancements

### infer_graph.py
- Stability score computation across multiple windows
- Shadow link detection (cross-sector heuristic or registry comparison)
- Evidence window quality metrics

### sensor_health.py
- Observability score computation
- Quality context for evidence windows
- Support type classification (support vs counterexample)

### degradation_injector.py (new)
- Drift injection
- Missingness injection
- Stuck-at injection
- Timestamp skew injection
- Combined degradation modes

### evidence_pack.py (new)
- Evidence pack generation
- JSON export
- Human-readable summary

### packetize.py
- Technical verification computation
- Actuator boundary statement
- Enhanced provenance hashing

## UI Components

### New Components
- `TopBar` - Region, mode, clock, deployment mode, connectivity
- `LeftRail` - Navigation with all screens
- `RightPanel` - Contextual right panel
- `EvidencePackExportButton` - Export evidence packs
- `LatencyImpactWidget` - Before/after comparison
- `ProtocolDeepDivePanel` - Protocol inspection
- `LocalNodeStatusGrid` - Local node status
- `ExpansionMapScreen` - Expansion roadmap
- `AuditIntegrityIndicator` - Audit verification status

### Enhanced Components
- `GraphCanvas` - Shadow link toggle, blast radius depth selector
- `EvidencePanel` - Protocol deep-dive tab, quality context
- `StatusStrip` - Data integrity, sensor warnings, model version, audit status
- `SimulationScrubber` - Confidence bands, time-to-impact
- `HandshakePanel` - Technical verification, actuator boundary, signing workflow
- `PacketTable` - Filters, export actions

## New Screens

- `/protocol` - Protocol Deep-Dive screen
- `/sovereign` - Sovereign Runtime screen
- `/expansion` - Expansion Map screen

## Acceptance Criteria

✅ **Shadow Link Proof**: At least one edge with `isShadowLink = true`, visible in UI with evidence
✅ **Sensor Degradation Resilience**: Toggling degradation changes health, reduces confidence, widens bands
✅ **Pre-Validation Proof**: Simulation shows cascade before impact, playbook appears, handshake generation works
✅ **Authoritative Handshake Proof**: Signing produces hash, audit record, status becomes AUTHORIZED
✅ **Sovereign Runtime Proof**: Disconnected mode allows graph browsing, simulation replay, handshake viewing
✅ **War Room Proof**: War Room Mode meaningfully increases density and changes layout

## Demo Sequence

1. Open Graph view. Toggle "Shadow Links only." Click substation. Dependencies light up.
2. Open evidence windows. Point to lag. Export evidence pack.
3. Toggle "Sensor Degradation: Drift." Watch confidence drop and uncertainty rise.
4. Go to Simulation. Scrub to Flood Event. Cascade appears. Show time-to-impact.
5. Show Latency Impact widget: "Before 4h, After 1s."
6. Generate Handshake. Show regulatory basis and technical verification.
7. Sign it. Show hash. Show audit log append and integrity indicator.
8. Flip to DISCONNECTED mode. Show it still works.
9. Flash Expansion Map: water to power to telecom with concrete data sources.

## Implementation Status

- ✅ Type system extensions
- ✅ Engine enhancements (infer_graph, sensor_health, packetize)
- ✅ New engine modules (degradation_injector, evidence_pack)
- ✅ Global Command Shell layout (TopBar, LeftRail, RightPanel)
- ✅ Enhanced StatusStrip
- ✅ GraphCanvas with shadow links and blast radius
- ✅ EvidencePackExportButton
- ✅ LatencyImpactWidget
- ⏳ Remaining UI components and screens
- ⏳ API route enhancements
- ⏳ Additional documentation

