# Munin Demo - Quick Reference

## 🚀 One-Command Setup

```bash
./scripts/setup_demo.sh
```

This will:
- ✅ Check prerequisites
- ✅ Install Node.js dependencies
- ✅ Set up Python virtual environment
- ✅ Install Python dependencies
- ✅ Create necessary directories
- ✅ Generate demo data

## ✅ Verify Demo

```bash
./scripts/verify_demo.sh
```

Checks all components and reports any issues.

## 🎬 Run Demo

```bash
npm run dev
# Open http://localhost:3000 (landing); use "Start 5-minute demo" or "Enter platform" for the app)
```

## 📚 Demo Pages

The **primary demo for evidence and baseline** is the **Storm Desmond (Carlisle) flood demo**: `/carlisle-dashboard` and the engine script `engine/carlisle_demo.py`. See [docs/CARLISLE_DEMO_SETUP.md](docs/CARLISLE_DEMO_SETUP.md) and [docs/STORM_DESMOND_BASELINE.md](docs/STORM_DESMOND_BASELINE.md).

- **`/graph`** - Dependency graph with shadow links
- **`/simulation`** - Incident simulation
- **`/handshakes`** - Handshake packet generation
- **`/decisions`** - Decision workflow
- **`/readiness`** - Readiness index
- **`/carlisle-dashboard`** - **Storm Desmond (Carlisle) real-world flood demo** — primary evidence demo
- **`/demos`** - **Cascading failure demos index** (Katrina 2005, Fukushima 2011, UK 2007) — timeline + Munin counterfactual per event; excludes 9/11
- **`/demos/katrina-2005`**, **`/demos/fukushima-2011`**, **`/demos/uk-2007`** - Per-event baseline timeline and counterfactual
- **`/playbooks`** - Playbook editor
- **`/resources`** - Resource locking
- **`/shadow`** - Shadow mode reports
- **`/metrics`** - Performance metrics

## 🌍 Disaster demos (historical cascading failures)

Run the Munin pipeline on historical event data (Katrina 2005, Fukushima 2011, UK 2007; 9/11 excluded):

```bash
cd engine
python disaster_demos.py              # run all
python disaster_demos.py katrina_2005 # run one
```

- **Data:** `engine/sample_data/katrina_2005/`, `fukushima_2011/`, `uk_floods_2007/` (synthetic time-series from research)
- **Baselines:** `engine/fixtures/disaster_baselines/*.json` (timeline, quotes, Munin counterfactual)
- **Playbooks:** `playbooks/katrina_evacuation_supply_coordination.yaml`, `fukushima_venting_evacuation.yaml`, `uk_2007_flood_coordination.yaml`
- **Web:** `/demos` lists all; `/demos/katrina-2005` etc. show timeline and counterfactual

## 🎯 Demo Scripts

See **[Perfect Demo Guide](./docs/PERFECT_DEMO_GUIDE.md)** for:
- Three demo options (Core, Carlisle, Advanced)
- Step-by-step scripts
- Key talking points
- Troubleshooting

## 🐛 Troubleshooting

### "Cannot find module"
```bash
npm install
```

### "Python module not found"
```bash
source venv/bin/activate
pip install -r engine/requirements.txt
```

### "No graph data"
```bash
npm run engine
```

### "Port 3000 already in use"
```bash
PORT=3001 npm run dev
```

## ✅ Health Checks

```bash
# Basic health
curl http://localhost:3000/api/health

# Liveness probe
curl http://localhost:3000/api/health/live

# Readiness probe
curl http://localhost:3000/api/health/ready
```

---

**For complete demo guide, see [Perfect Demo Guide](./docs/PERFECT_DEMO_GUIDE.md)**
