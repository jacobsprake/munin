# Data source: engine output vs database

## Single source of truth

- **Primary source**: The Python engine writes to `engine/out/` (graph.json, evidence.json, incidents.json, packets/*.json, audit.jsonl).
- **API behaviour**: The Next.js API routes (`/api/graph`, `/api/incidents`, `/api/packets`, etc.) read from **database first**. If the DB has no rows, they **fall back** to reading from `engine/out/*` and then **sync** that data into the DB for the next request.
- **Result**: After the first request that hits the file fallback, the DB is populated. Later requests are served from the DB until you run the engine again; the sync step then repopulates from the new files.

## Keeping data in sync

1. **Run the engine** after changing sample data or playbooks: `npm run engine` or `./scripts/run_engine.sh` (with venv active).
2. **Restart or re-request**: The sync runs when an API route uses the file fallback. To force re-sync from files, you can clear the DB (e.g. delete `data/munin.db`) and restart the app, or add a dedicated “Sync from engine” API if you want an explicit trigger.

## Carlisle demo

For the Carlisle flow, run the engine from the `engine/` directory with Carlisle data (or use `engine/carlisle_demo.py`). Output can go to `engine/out/carlisle_demo/` or the default `engine/out/`; the API looks at `engine/out/` by default. Point the app at the correct output path if you use a different directory.
