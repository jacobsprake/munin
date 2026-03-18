# Examples

Ready-to-run examples demonstrating Munin's capabilities.

## Quick Start

```bash
# From the repo root:
./examples/quick_start.sh
```

This runs three demos back-to-back:
1. **Carlisle flood demo** — synthetic Storm Desmond data, full pipeline
2. **Real EA data demo** — live Environment Agency river gauge readings
3. **Digital twin** — physics-based cascade simulation

## Individual Examples

| Script | What it does | Time |
|--------|-------------|------|
| `quick_start.sh` | All three demos in sequence | ~5s |
| `carlisle_custom.sh` | Carlisle demo with custom graph inspection | ~3s |
| `adversarial_demo.sh` | Run adversarial attacks against the pipeline | ~10s |

## Custom Configuration

See `config/connectors.example.yaml` for historian connector configuration
and `config/deployment-profiles.yaml` for deployment profile options.
