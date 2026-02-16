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
# Open http://localhost:3000
```

## 📚 Demo Pages

- **`/graph`** - Dependency graph with shadow links
- **`/simulation`** - Incident simulation
- **`/handshakes`** - Handshake packet generation
- **`/decisions`** - Decision workflow
- **`/readiness`** - Readiness index
- **`/carlisle-dashboard`** - Real-world flood demo
- **`/playbooks`** - Playbook editor
- **`/resources`** - Resource locking
- **`/shadow`** - Shadow mode reports
- **`/metrics`** - Performance metrics

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
