/**
 * Server-only utility functions for Munin.
 * Do NOT import this file from client components.
 */
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Get the correct Python executable path.
 * Checks for venv/bin/python first, falls back to python3.
 */
export function getPythonPath(): string {
  const root = process.cwd();
  const venvPython = join(root, 'venv', 'bin', 'python');

  if (existsSync(venvPython)) {
    return venvPython;
  }

  return 'python3';
}
