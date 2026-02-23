# Run the demo (shadow pilot)

One-time setup:

1. **Node 20** (recommended): `nvm use` or install Node 20 LTS.
2. **Dependencies**: `npm install` (or `pnpm install`).
3. **Python venv**: `python3 -m venv venv`, `source venv/bin/activate`, `pip install -r engine/requirements.txt`.

Run the demo:

1. **Generate engine output** (graph, incidents, packets):
   ```bash
   npm run engine
   ```
   Or with venv active: `cd engine && python run.py`.

2. **Start the app**:
   ```bash
   npm run dev
   ```

3. **Open**: `http://localhost:3000` → redirects to `/graph`. Use **Simulation**, **Handshakes**, **Carlisle dashboard** as needed.

For **Carlisle flood demo** (EA data), run the engine from the repo root with:
   ```bash
   source venv/bin/activate && cd engine && python carlisle_demo.py
   ```
   Then use the app as above (default API reads from `engine/out/`; for Carlisle-specific output you may need to copy `engine/out/carlisle_demo/*` to `engine/out/` or point the API at that path).
