# Pilot-in-a-Box

Complete deployment package for running a Munin pilot deployment.

## Contents

This package includes:
- Installation scripts
- Configuration templates
- Data mapping guides
- Deployment documentation
- Operator training materials
- Troubleshooting guides

## Quick Start

### 1. Extract Package
```bash
tar -xzf munin-pilot-in-a-box.tar.gz
cd munin-pilot-in-a-box
```

### 2. Select Archetype
Choose your deployment archetype:
- `archetypes/national_water_utility/`
- `archetypes/regional_grid_operator/`
- `archetypes/smart_city_control/`

### 3. Configure
```bash
cd archetypes/national_water_utility
cp config.yaml.example config.yaml
# Edit config.yaml with your settings
```

### 4. Install
```bash
./install.sh --mode pilot --archetype national_water_utility
```

### 5. Initialize
```bash
./initialize.sh --data-dir /path/to/historian/data
```

## Package Structure

```
munin-pilot-in-a-box/
├── install.sh                 # Main installation script
├── initialize.sh              # Initialization script
├── config/
│   ├── deployment-profiles.yaml
│   └── protocol-connectors.yaml.example
├── archetypes/
│   ├── national_water_utility/
│   │   ├── config.yaml.example
│   │   ├── data-mapping.md
│   │   └── playbooks/
│   ├── regional_grid_operator/
│   │   └── ...
│   └── smart_city_control/
│       └── ...
├── scripts/
│   ├── sync-data.sh
│   ├── run-engine.sh
│   └── generate-report.sh
├── docs/
│   ├── DEPLOYMENT_GUIDE.md
│   ├── OPERATIONS_RUNBOOK.md
│   ├── TROUBLESHOOTING.md
│   └── TRAINING_GUIDE.md
└── README.md
```

## Configuration

### Step 1: Select Archetype
Choose the archetype that matches your infrastructure:
- National Water Utility
- Regional Grid Operator
- Smart City Control

### Step 2: Configure Data Sources
Edit `config/protocol-connectors.yaml`:
```yaml
protocols:
  - name: modbus
    enabled: true
    vendor: Siemens
    endpoints:
      - address: 192.168.1.100
        port: 502
```

### Step 3: Configure Deployment Mode
Edit `config/deployment-profiles.yaml`:
```yaml
default_profile: pilot
```

### Step 4: Map Your Data
Follow the data mapping guide for your archetype:
- `archetypes/national_water_utility/data-mapping.md`
- `archetypes/regional_grid_operator/data-mapping.md`
- `archetypes/smart_city_control/data-mapping.md`

## Installation

### Requirements
- Linux (Ubuntu 22.04 LTS or RHEL 8+)
- Python 3.10+
- Node.js 18+ (for frontend)
- 16GB RAM minimum
- 100GB storage minimum

### Installation Steps

1. **Extract Package**
   ```bash
   tar -xzf munin-pilot-in-a-box.tar.gz
   cd munin-pilot-in-a-box
   ```

2. **Run Installation**
   ```bash
   ./install.sh --mode pilot --archetype national_water_utility
   ```

3. **Configure Data Sources**
   ```bash
   # Edit configuration files
   nano config/protocol-connectors.yaml
   ```

4. **Initialize Engine**
   ```bash
   ./initialize.sh --data-dir /path/to/historian/data
   ```

5. **Start Services**
   ```bash
   systemctl start munin-engine
   systemctl start munin-frontend
   ```

6. **Verify Installation**
   ```bash
   curl http://localhost:3000/api/health
   ```

## Data Mapping

### Step 1: Identify Data Sources
- SCADA historians
- API endpoints
- CSV exports
- Protocol endpoints

### Step 2: Map to Munin Format
Use the data mapping templates in your archetype directory:
- `archetypes/national_water_utility/data-mapping.md`

### Step 3: Configure Protocol Translators
Edit `config/protocol-connectors.yaml` with your protocol endpoints.

### Step 4: Test Data Ingestion
```bash
./scripts/sync-data.sh --test
```

## Shadow Mode Setup

### Enable Shadow Mode
Shadow mode is enabled by default in pilot deployments. Configure duration:
```yaml
shadow_mode:
  enabled: true
  duration_days: 365
  passive_only: true
```

### Collect Metrics
Shadow mode automatically collects:
- Time saved per incident
- Damage prevented estimates
- Improvement ratios
- Correlation statistics

### Generate Reports
```bash
./scripts/generate-report.sh --type shadow --period 6months
```

## Operations

### Daily Operations
- Monitor dashboard: `http://localhost:3000/carlisle-dashboard`
- Check engine status: `systemctl status munin-engine`
- Review logs: `tail -f /var/munin/logs/engine_log.jsonl`

### Weekly Review
- Review shadow mode metrics
- Check for incidents detected
- Validate playbook recommendations
- Review operator feedback

### Monthly Deep Dive
- Generate comprehensive shadow report
- Analyze value metrics
- Review system health
- Plan improvements

## Troubleshooting

### Common Issues

**Engine not processing data:**
```bash
# Check engine logs
tail -f /var/munin/logs/engine_log.jsonl

# Restart engine
systemctl restart munin-engine
```

**Protocol translation failing:**
```bash
# Test protocol connector
python -m engine.protocol_translator --test modbus

# Check network connectivity
ping <protocol_endpoint>
```

**Dashboard not loading:**
```bash
# Check frontend logs
journalctl -u munin-frontend

# Restart frontend
systemctl restart munin-frontend
```

## Support

For issues or questions:
- **Documentation**: See `docs/` directory
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`
- **Support**: support@munin.sovereign

## Next Steps

After successful pilot:
1. Review shadow mode metrics
2. Generate value report
3. Get stakeholder approval
4. Plan transition to active mode
5. Configure production deployment

See [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) for detailed operational procedures.
