# Perfect Demo Guide - Munin

**Goal**: Run a flawless demo that showcases Munin's capabilities  
**Duration**: 5-10 minutes  
**Audience**: Technical, Executive, or Regulatory

**Munin is decision support.** Humans always authorise; Munin recommends pre-validated playbooks. No autonomous execution.

---

## 🚀 For reviewers (shortest path)

1. Open `http://localhost:3000` (landing). Read thesis and "Traditional vs Munin."
2. Click **Start 5-minute demo** → `/demo-path`. Scroll through thesis → problem → solution → Shadow Links → evidence; then use buttons to open Graph, Demos, Carlisle, Simulation.
3. Or go directly to `/demos` (disaster timelines), `/carlisle-dashboard` (flood metrics), `/handshakes` (outcome confidence + authorisation).

See [FOR_REVIEWERS.md](FOR_REVIEWERS.md) for one-page summary and CLI path.

---

## 🎯 Pre-Demo Checklist

### 1. Environment Setup (5 minutes)

```bash
# 1. Verify Node.js version (should be 18-22)
node --version

# 2. Install/verify dependencies
npm install

# 3. Set up Python environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r engine/requirements.txt

# 4. Run verification script
chmod +x scripts/verify_demo.sh
./scripts/verify_demo.sh
```

### 2. Generate Demo Data (2 minutes)

```bash
# Generate engine output (graph, incidents, packets)
npm run engine

# Verify output was created
ls -la engine/out/
# Should see: graph.json, incidents.json, packets/, evidence.json
```

### 3. Start the Application (30 seconds)

```bash
# In one terminal: Start Next.js
npm run dev

# Wait for: "Ready on http://localhost:3000"
```

---

## 🎬 Demo Scripts

### Demo Option 1: Core Features (5 minutes)

**Best for**: Technical audiences, investors

#### Scene 1: Dependency Graph (1 minute)
1. Open `http://localhost:3000` (landing); click **Enter platform** or go to `/graph`
2. **Say**: *"This is Munin's dependency graph. It was automatically inferred from time-series data, not manually drawn."*
3. Click on a node (e.g., `substation_north_01`)
4. **Point out**:
   - Downstream dependencies highlighted
   - Edge labels showing confidence scores and lag times
   - Amber warnings for degraded sensors
5. Click on an edge → Show evidence panel
6. **Say**: *"Every edge has proof: correlation windows, lag estimates, stability scores. This is not hand-waving AI—this is plumbing."*

#### Scene 2: Incident Simulation (2 minutes)
1. Navigate to `/simulation`
2. **Say**: *"The Incident Simulation view demonstrates pre-validation of cascading failures."*
3. Select "Flood Event" incident
4. Use scrub bar to move through time
5. **Point out**:
   - Impacted nodes change as time progresses
   - Blast radius counter
   - Time-to-impact table
   - Confidence bands
6. **Say**: *"We simulate the cascade before it happens. Before Munin: 2–6 hours of coordination. With Munin: playbook and handshake ready in seconds; operators review and authorise in 20–30 minutes."*

#### Scene 3: Handshake Generation (1.5 minutes)
1. Click "Generate Handshake" button
2. Navigate to `/handshakes`
3. Click on the generated packet
4. **Show**:
   - Situation summary
   - Proposed action
   - Evidence references
   - Uncertainty scores
   - Approval requirements
5. **Say**: *"This packet carries the regulatory framework and evidence bundle. It's cryptographically signed. Operators review outcome confidence and proposed action, then authorise—no autonomous execution."*

#### Scene 4: Decision Workflow (1.5 minutes)
1. Navigate to `/decisions`
2. **Show**:
   - Decision status dashboard
   - Signature progress
   - Policy compliance
3. **Say**: *"Decisions require multi-signature approval. This prevents single points of failure and ensures consensus."*

---

### Demo Option 2: Carlisle Flood Demo (7 minutes)

**Best for**: Domain experts, water authority, emergency services

#### Setup (1 minute)
```bash
# Run Carlisle demo
cd engine
python carlisle_demo.py
cd ..
```

#### Scene 1: Real-World Data (2 minutes)
1. Navigate to `/carlisle-dashboard`
2. **Say**: *"This uses real Environment Agency flood data from Storm Desmond, December 2015."*
3. **Show**:
   - River level graphs
   - Station locations
   - Threshold indicators
4. **Say**: *"Munin discovered dependencies between stations that weren't in any registry."*

#### Scene 2: Recommended response (2 minutes)
1. **Show**:
   - Playbook activation
   - Task assignments (for operator review)
   - Approval workflow (humans authorise)
2. **Say**: *"When thresholds are exceeded, Munin generates recommended actions (handshakes) for operator review. Time-to-authorise: < 2 minutes vs 2–6 hours baseline. Humans still decide."*

#### Scene 3: Performance Metrics (2 minutes)
1. Navigate to `/readiness`
2. **Show**:
   - Overall readiness score
   - Time-to-authorize metrics
   - Scenario success rates
   - Trend analysis
3. **Say**: *"This is measurable improvement. Not promises—proof."*

---

### Demo Option 3: Advanced Features (10 minutes)

**Best for**: Technical deep-dive, security-focused audiences

#### All Scenes from Option 1, plus:

#### Scene 5: Shadow Mode Report (2 minutes)
1. Navigate to `/shadow`
2. **Show**:
   - Performance comparison (human vs Munin)
   - Time saved metrics
   - Cost savings estimates
   - Correlation scores
3. **Say**: *"Munin ran in shadow mode for 12 months, recording every human decision and comparing it to what Munin would have done. Result: measurable improvement with zero risk."*

#### Scene 6: Chaos Simulator (2 minutes)
1. Navigate to `/simulation`
2. **Show**:
   - Chaos scenario selector
   - Multiple scenario types
   - Impact metrics
3. **Say**: *"We maintain exhaustive coverage of the scenario space—natural disasters, cyber attacks, infrastructure failures, multi-fault and cascading events."*

#### Scene 7: Resource Management (1 minute)
1. Navigate to `/resources`
2. **Show**:
   - Resource locking
   - Conflict resolution
   - Cross-sector coordination
3. **Say**: *"Prevents double-booking of emergency assets. Once Munin becomes the intermediary, it becomes the Central Nervous System."*

---

## 🎯 Key Talking Points

### The Problem
- **Coordination bottleneck**: Officials have data but lack pre-validated regulatory basis and cross-agency sign-off
- **Cascade speed**: Failures cascade faster than human coordination
- **Shadow Links**: Dependencies exist in physics but not in documentation

### The Solution
- **Pre-validation**: Simulate cascades before they happen
- **Regulatory basis**: Packets carry the required statutory reference and evidence
- **Multi-Signature**: Prevents single points of failure
- **Physics Verification**: Verify digital signals against physical reality

### The Proof
- **Time-to-Authorize**: < 2 minutes vs 2-6 hours baseline
- **Shadow Mode**: 12 months of passive observation with measurable improvement
- **Chaos Testing**: Systematic testing across the full scenario space (single-origin, multi-fault, correlated)

---

## 🐛 Troubleshooting

### Issue: "Cannot find module"
**Solution**: Run `npm install`

### Issue: "Python module not found"
**Solution**: Activate venv and run `pip install -r engine/requirements.txt`

### Issue: "No graph data"
**Solution**: Run `npm run engine` first

### Issue: "Port 3000 already in use"
**Solution**: Kill the process or use `PORT=3001 npm run dev`

### Issue: "Database locked"
**Solution**: Close any other instances of the app

---

## ✅ Post-Demo Checklist

- [ ] All pages loaded correctly
- [ ] No console errors
- [ ] Data displayed correctly
- [ ] Interactions worked smoothly
- [ ] Performance was acceptable (< 2s page loads)

---

## 📊 Demo Metrics

**Target Performance**:
- Page load: < 2 seconds
- Graph render: < 3 seconds
- API response: < 500ms
- No errors in console

**Success Indicators**:
- Audience understands the problem
- Audience sees the value proposition
- Technical questions can be answered
- Follow-up meeting scheduled

---

## 🎓 Demo Tips

1. **Start with the problem**, not the solution
2. **Show, don't tell** - Let the UI speak
3. **Use real data** - Carlisle demo is powerful
4. **Emphasize proof** - Shadow mode, metrics, evidence
5. **Address security** - Air-gapped, zero-trust, post-quantum
6. **End with impact** - Time saved, lives protected, infrastructure secured

---

**Remember**: The demo should feel effortless. If something breaks, have a backup plan (screenshots, video, etc.).
