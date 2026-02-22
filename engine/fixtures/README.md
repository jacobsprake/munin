# Golden Fixtures for Regression Testing

This directory contains "golden" expected outputs for known inputs, used for regression testing to ensure the engine produces consistent, deterministic results.

## Structure

- `carlisle_storm_desmond/` - Expected outputs for Storm Desmond replay (Dec 5-7, 2015)
  - `graph.json` - Expected dependency graph
  - `evidence.json` - Expected evidence windows
  - `incidents.json` - Expected incident simulations
  - `packets/` - Expected handshake packets
  - `config_metadata.json` - Config version used to generate fixtures
- `disaster_baselines/` - Timeline and coordination-step data for other evidence disasters (Katrina, Fukushima, 9/11, UK 2007) for demo scenarios and docs. See `disaster_baselines/README.md`. Primary runnable demo remains Storm Desmond (Carlisle).

## Usage

Run the engine with Carlisle Storm Desmond data and compare outputs:

```bash
cd engine
python run.py --data-dir sample_data/carlisle --seed 42
python -m pytest tests/test_golden_fixtures.py
```

## Updating Fixtures

When engine behavior intentionally changes (e.g., config updates, algorithm improvements):

1. Run engine with known seed: `python run.py --seed 42`
2. Review outputs in `engine/out/`
3. If outputs are correct, copy to fixtures: `cp -r out/* fixtures/carlisle_storm_desmond/`
4. Commit updated fixtures

## Fixture Generation

Fixtures are generated with:
- Seed: 42 (for deterministic RNG)
- Config: Default `engine/config.py` settings
- Data: `engine/sample_data/carlisle/*.csv` (Storm Desmond)
