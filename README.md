# Munin: Sovereign Infrastructure Orchestration

**Munin** is a command-and-control system that transforms siloed operational technology (OT) data into a unified dependency graph, enabling pre-validated crisis response at the speed of the grid.

## The Problem: Coordination Latency & Liability Paralysis

Modern infrastructure failure is not a data problem—we have enough sensors. It is an **Authority** problem. We have built a bureaucratic culture of liability paralysis that makes it illegal for officials to act at the speed of cascading failures.

When a power substation fails, water pumps downstream fail within minutes. But by the time human operators coordinate across agencies, verify legal authorization, and execute a response, the cascade has already consumed entire sectors.

**Munin solves this by:**
1. **Inferring cross-sector dependencies** from time-series data (no manual configuration)
2. **Pre-validating playbooks** through simulation before crises occur
3. **Generating Authoritative Handshakes**—execution packets with cryptographic signatures that pre-validate legal authority
4. **Enabling high-agency response** at machine speed, not bureaucratic speed

## Architecture

```
Siloed OT Data (SCADA Historians)
    ↓
Time-Series Ingestion & Normalization
    ↓
Dependency Graph Inference (Proprietary)
    ↓
Evidence-Backed Edge Confidence Scores
    ↓
Incident Simulation & Cascade Prediction
    ↓
Authoritative Handshake Generation
    ↓
Cryptographic Signing & Immutable Audit Log
```

## Security Model

**Designed for sovereign, air-gapped deployment.**

- No external dependencies or cloud-leakage
- All cryptographic operations performed on-premises
- Handshake signatures logged to immutable local storage
- Core inference algorithms are proprietary assets protected as critical infrastructure technology
- This repository contains the user interface and architectural design for evaluation purposes

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm (or npm/yarn)
- Python 3.11+
- pip

### Installation

1. **Install frontend dependencies**:
```bash
pnpm install
```

2. **Install Python dependencies**:
```bash
cd engine
pip install -r requirements.txt
cd ..
```

3. **Run the engine pipeline** (generates graph, evidence, incidents, packets):
```bash
python engine/run.py
```

4. **Start the Next.js development server**:
```bash
pnpm dev
```

5. **Open the application**:
Navigate to `http://localhost:3000`

## Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── (layout)/          # Layout wrapper with CommandShell
│   ├── graph/             # Dependency Graph view
│   ├── simulation/        # Incident Simulation view
│   ├── handshakes/        # Authoritative Handshake Log
│   └── api/               # API routes for data
├── components/            # React components
│   ├── CommandShell.tsx   # Main layout shell
│   ├── GraphCanvas.tsx   # Force-directed graph
│   ├── EvidencePanel.tsx # Node/edge detail panel
│   ├── SimulationScrubber.tsx
│   ├── HandshakePanel.tsx
│   └── PacketTable.tsx
├── lib/                   # Shared utilities
│   ├── types.ts          # TypeScript type definitions
│   ├── store.ts          # Zustand state management
│   ├── hash.ts           # Cryptographic hashing
│   └── loadData.ts       # Data loading functions
├── contracts/            # JSON schemas for data contracts
├── engine/               # Python inference pipeline
│   ├── run.py           # Main pipeline runner
│   ├── ingest.py        # CSV ingestion
│   ├── infer_graph.py   # Dependency graph inference
│   ├── sensor_health.py # Health detection
│   ├── build_incidents.py
│   ├── packetize.py
│   ├── sample_data/     # Sample historian CSVs
│   └── out/             # Generated outputs
├── playbooks/           # YAML playbook definitions
└── docs/                # Documentation
```

## The Three Main Views

### 1. Dependency Graph
- Force-directed graph showing inferred dependencies
- Click nodes to highlight downstream cascades
- Edges show confidence scores and lag times
- Evidence panel displays supporting time windows

### 2. Incident Simulation
- Timeline scrub bar for pre-validation
- Shows predicted cascading failures before they happen
- Blast radius and time-to-impact visualization
- Recommended playbook display

### 3. Authoritative Handshake Log
- Table of execution packets
- Packet detail panel with evidence bundle
- Authorization workflow with signing
- Immutable audit trail

## Data Flow

1. **Ingest**: CSV files in `engine/sample_data/` → normalized time-series
2. **Infer**: Time-series → dependency graph with confidence scores
3. **Health**: Sensor degradation detection (missingness, stuck-at, drift)
4. **Evidence**: Build supporting windows for each edge
5. **Incidents**: Simulate cascading failure timelines
6. **Packets**: Generate Authoritative Handshake packets from incidents

## API Endpoints

- `GET /api/graph` - Dependency graph (nodes + edges)
- `GET /api/evidence` - Evidence windows
- `GET /api/incidents` - Incident simulations
- `GET /api/packets` - Authoritative Handshake packets
- `POST /api/authorize` - Authorize a packet (requires operator ID + passphrase)

## Design Principles

1. **Not a SaaS dashboard**: Industrial dark mode, command-and-control aesthetic
2. **High-agency UI**: Dense, calm, operational, evidence-first
3. **Explicit uncertainty**: Every edge shows confidence, lag, provenance
4. **Pre-validation**: Simulation proves cascading failures before they happen
5. **Authoritative Handshake**: Signing workflow, not simple submit button
6. **Automatic graph generation**: No manual drawing

## Color Palette

- **Base**: Deep charcoals (#0f0f0f, #1a1a1a) + slate grays
- **Safety Colors**:
  - Amber (#f59e0b) = warnings
  - Cobalt (#3b82f6) = active tasks
  - Emerald (#10b981) = validated states

## Typography

- **Primary**: JetBrains Mono (falls back to ui-monospace)
- **Secondary**: Inter (falls back to system sans)

## Development

### Running the Engine
```bash
python engine/run.py
```

This generates:
- `engine/out/graph.json` - Dependency graph
- `engine/out/evidence.json` - Evidence windows
- `engine/out/incidents.json` - Incident simulations
- `engine/out/packets/*.json` - Handshake packets
- `engine/out/audit.jsonl` - Append-only audit log

### Adding Sample Data
Add CSV files to `engine/sample_data/` with format:
```csv
timestamp,node_id,value
2026-01-01T00:00:00Z,node_01,123.45
```

### Modifying Playbooks
Edit YAML files in `playbooks/` directory. Playbooks are referenced by incident type in `engine/packetize.py`.

## Demo Script

See `docs/demo-script.md` for a 90-second demo walkthrough.

## Acceptance Criteria

✅ App boots with `pnpm dev` and shows three nav views  
✅ Graph view renders force-directed graph with clickable nodes  
✅ Edges show confidence and lag, evidence panel displays windows  
✅ Simulation view has scrub bar, updates impacted nodes  
✅ Handshake can be generated and authorized via signing modal  
✅ Packet and audit log persisted to disk  
✅ Design matches industrial dark mode with safety colors  

## License

**All Rights Reserved. Evaluation License Only.**

This software and associated documentation are proprietary and confidential. Unauthorized copying, modification, distribution, or use is strictly prohibited.

This repository is provided for **evaluation and demonstration purposes only**. The user interface, API contracts, and architectural design are visible for review. The core inference logic and dependency graph algorithms are proprietary assets protected as critical infrastructure technology.

**Commercial use, production deployment, or integration into operational systems requires explicit written authorization.**

Sovereign infrastructure requires absolute integrity. By keeping the core inference logic proprietary, we prevent adversaries from reverse-engineering the national dependency graph while ensuring the system remains a defensible, high-value asset for the state.

For licensing inquiries, see the [LICENSE](./LICENSE) file.
