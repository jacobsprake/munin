/**
 * Utility functions for Munin
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names with clsx and tailwind-merge.
 * Standard shadcn/ui utility used by all UI components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the correct Python executable path.
 * Server-only: checks for venv/bin/python first, falls back to python3.
 * Uses dynamic import to avoid bundling 'fs' on the client side.
 */
export function getPythonPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { join } = require('path');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { existsSync } = require('fs');

  const root = process.cwd();
  const venvPython = join(root, 'venv', 'bin', 'python');

  if (existsSync(venvPython)) {
    return venvPython;
  }

  return 'python3';
}
