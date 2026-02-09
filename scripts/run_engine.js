#!/usr/bin/env node
/**
 * Run the Python engine pipeline (ingest → graph → evidence → incidents → packets).
 * Uses venv/bin/python if venv exists, otherwise system python3.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const venvPython = path.join(root, 'venv', 'bin', 'python');
const systemPython = 'python3';
const engineRun = path.join(root, 'engine', 'run.py');

const python = fs.existsSync(venvPython) ? venvPython : systemPython;
const child = spawn(python, [engineRun], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('Failed to run engine:', err.message);
  process.exit(1);
});
