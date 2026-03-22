// DEMO ENDPOINT -- Returns simulated data for demonstration purposes.
// Production implementation requires hardware-backed key storage,
// physical key verification, and cryptographic snapshot/restore with integrity proofs.

import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, resolve } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { getPythonPath } from '@/lib/serverUtils';

const execFileAsync = promisify(execFile);

function sanitizeInput(input: string): string {
  if (/[;&|`$(){}[\]<>!#"'\\]/.test(input)) {
    throw new Error('Invalid input');
  }
  return input;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vaultId = searchParams.get('vaultId');
    const action = searchParams.get('action') || 'status';

    if (action === 'status' && vaultId) {
      // Path traversal protection
      if (vaultId.includes('..') || vaultId.includes('/') || vaultId.includes('\\')) {
        return NextResponse.json({ error: 'Invalid vault ID' }, { status: 400 });
      }

      // Get vault status
      const vaultPath = join(process.cwd(), 'engine', 'out', 'vaults', vaultId, 'manifest.json');

      try {
        const manifestData = await readFile(vaultPath, 'utf-8');
        const manifest = JSON.parse(manifestData);
        return NextResponse.json({
          status: 'ok',
          vault: manifest
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
        }
        throw error;
      }
    }

    if (action === 'list') {
      // List all vaults
      const vaultsDir = join(process.cwd(), 'engine', 'out', 'vaults');

      if (!existsSync(vaultsDir)) {
        return NextResponse.json({ status: 'ok', vaults: [] });
      }

      // In production, would scan directory for vaults
      return NextResponse.json({
        status: 'ok',
        vaults: []
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get vault status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'create') {
      // Create new vault
      const scriptPath = join(process.cwd(), 'engine', 'digital_asset_vault.py');

      // Run Python script to create vault
      const pythonPath = getPythonPath();
      const { stdout, stderr } = await execFileAsync(
        pythonPath, [scriptPath],
        { cwd: process.cwd(), timeout: 10000 }
      );

      if (stderr && !stderr.includes('Warning')) {
        throw new Error('Vault creation failed');
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Vault created',
        output: stdout
      });
    }

    if (action === 'open') {
      // Open vault with physical key
      const { vaultId, physicalKey } = params;

      if (!vaultId || !physicalKey) {
        return NextResponse.json(
          { error: 'Missing vaultId or physicalKey' },
          { status: 400 }
        );
      }

      // Path traversal protection
      if (vaultId.includes('..') || vaultId.includes('/') || vaultId.includes('\\')) {
        return NextResponse.json({ error: 'Invalid vault ID' }, { status: 400 });
      }

      // In production, this would verify physical key and open vault
      return NextResponse.json({
        status: 'ok',
        vaultId,
        opened: true,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'seal') {
      // Seal vault
      const { vaultId, physicalKey } = params;

      if (!vaultId || !physicalKey) {
        return NextResponse.json(
          { error: 'Missing vaultId or physicalKey' },
          { status: 400 }
        );
      }

      // Path traversal protection
      if (vaultId.includes('..') || vaultId.includes('/') || vaultId.includes('\\')) {
        return NextResponse.json({ error: 'Invalid vault ID' }, { status: 400 });
      }

      // In production, this would seal the vault
      return NextResponse.json({
        status: 'ok',
        vaultId,
        sealed: true,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'create_snapshot') {
      // Create snapshot
      const { vaultId, graphData, logicData, configData } = params;

      if (!vaultId) {
        return NextResponse.json(
          { error: 'Missing vaultId' },
          { status: 400 }
        );
      }

      // Path traversal protection
      if (vaultId.includes('..') || vaultId.includes('/') || vaultId.includes('\\')) {
        return NextResponse.json({ error: 'Invalid vault ID' }, { status: 400 });
      }

      // In production, this would create a snapshot
      return NextResponse.json({
        status: 'ok',
        snapshotId: `snapshot_${Date.now()}`,
        vaultId,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'restore') {
      // Restore from snapshot
      const { vaultId, snapshotId } = params;

      if (!vaultId || !snapshotId) {
        return NextResponse.json(
          { error: 'Missing vaultId or snapshotId' },
          { status: 400 }
        );
      }

      // Path traversal protection
      if (vaultId.includes('..') || vaultId.includes('/') || vaultId.includes('\\')) {
        return NextResponse.json({ error: 'Invalid vault ID' }, { status: 400 });
      }

      // In production, this would restore from snapshot
      return NextResponse.json({
        status: 'ok',
        vaultId,
        snapshotId,
        restored: true,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process vault request' },
      { status: 500 }
    );
  }
}
