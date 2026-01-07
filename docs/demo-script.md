# Sovereign Orchestration Prototype - 90-Second Demo Script

## Pre-Demo Setup (30 seconds)
1. **Start the engine**: `python engine/run.py`
   - Wait for pipeline completion
   - Verify outputs in `engine/out/`

2. **Start the frontend**: `pnpm dev`
   - Navigate to `http://localhost:3000`
   - Verify all three views are accessible

## Demo Flow (90 seconds)

### 0:00 - 0:15 | Dependency Graph View
**Narrator**: "This is the Dependency Graph view. The system has inferred cross-sector dependencies from historian time-series data."

**Actions**:
- Click on a node (e.g., `substation_north_01`)
- Observe downstream dependencies highlighted
- Point out edge labels showing confidence scores and lag times
- Open evidence panel to show supporting time windows

**Key Points**:
- "Every edge shows confidence, lag, and provenance"
- "The graph is generated automatically, not manually drawn"
- "Notice the amber warnings for degraded sensors"

### 0:15 - 0:45 | Incident Simulation View
**Narrator**: "The Incident Simulation view demonstrates pre-validation of cascading failures."

**Actions**:
- Navigate to Simulation view
- Select "Flood Event" incident
- Use the scrub bar to move through time
- Show how impacted nodes change as time progresses
- Point out the blast radius counter and time-to-impact table
- Highlight the recommended playbook

**Key Points**:
- "This proves pre-validation - we see cascading failures before they happen"
- "The scrub bar shows the timeline of predicted impacts"
- "Each timeline entry shows confidence and affected nodes"
- "The system recommends a playbook based on the incident type"

### 0:45 - 1:15 | Authoritative Handshake Generation
**Narrator**: "When an incident is detected, the system generates an Authoritative Handshake packet."

**Actions**:
- Click "Generate Handshake" button
- Navigate to Handshake Log view
- Click on the generated packet
- Show the execution panel with:
  - Situation summary
  - Proposed action
  - Regulatory basis
  - Evidence bundle
  - Required approvals

**Key Points**:
- "This is not a simple submit button - this is an execution packet"
- "Every packet includes regulatory compliance basis"
- "Evidence links back to the dependency graph edges"
- "Uncertainty is explicitly quantified"

### 1:15 - 1:30 | Authorization Workflow
**Narrator**: "Authorization requires a signing step with operator credentials."

**Actions**:
- Click "Confirm & Authorize"
- Show the signing modal
- Enter operator ID and passphrase
- Complete authorization
- Show updated packet status
- Point out the signature hash in the audit trail

**Key Points**:
- "This feels like signing an order, not clicking submit"
- "The signature hash is cryptographically generated"
- "Every authorization is appended to an immutable audit log"
- "The packet status updates to 'authorized'"

## Closing (1:30)
**Narrator**: "This prototype demonstrates a command-and-control digital twin that infers dependencies, simulates cascades, and generates regulator-compliant execution packets. Every action is evidence-first, with explicit uncertainty and provenance tracking."

## Technical Highlights to Mention
- **Not a SaaS dashboard**: Industrial dark mode, cockpit-like interface
- **High-agency UI**: Dense, calm, operational, evidence-first
- **Automatic graph inference**: No manual drawing
- **Pre-validation**: Simulation shows failures before they happen
- **Authoritative Handshake**: Signing workflow with audit trail
- **Regulatory compliance**: Every packet includes compliance basis

## Troubleshooting
- If graph is empty: Run `python engine/run.py` first
- If API errors: Check that `engine/out/` contains JSON files
- If signing fails: Check browser console for errors
- If styles look wrong: Verify Tailwind is compiling (`pnpm dev` output)

