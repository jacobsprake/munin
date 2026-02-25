/**
 * POST /api/backup - Create encrypted backup
 * GET /api/backup - List backups
 * Air-gapped compliant: local backups only, encrypted exports
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { existsSync } from 'fs';

const backupsDir = join(process.cwd(), 'data', 'backups');
const BACKUP_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';

// Ensure backups directory exists
if (!existsSync(backupsDir)) {
  mkdir(backupsDir, { recursive: true }).catch(() => {});
}

function encryptBackup(data: string): { encrypted: string; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(BACKUP_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encrypted, iv: iv.toString('hex') };
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    
    // Export all data
    const backup = {
      version: '1.0',
      created_at: new Date().toISOString(),
      database: {
        nodes: db.prepare('SELECT * FROM nodes').all(),
        edges: db.prepare('SELECT * FROM edges').all(),
        incidents: db.prepare('SELECT * FROM incidents').all(),
        packets: db.prepare('SELECT * FROM handshake_packets').all(),
        decisions: db.prepare('SELECT * FROM decisions').all(),
        audit_log: db.prepare('SELECT * FROM audit_log ORDER BY ts ASC').all(),
        operators: db.prepare('SELECT id, operator_id, role, created_at FROM operators').all(), // Exclude passwords
      }
    };
    
    const backupJson = JSON.stringify(backup, null, 2);
    const { encrypted, iv } = encryptBackup(backupJson);
    
    // Save encrypted backup
    const backupFile = join(backupsDir, `${backupId}.encrypted`);
    await writeFile(backupFile, JSON.stringify({ iv, data: encrypted }), 'utf-8');
    
    // Create manifest
    const manifest = {
      backup_id: backupId,
      created_at: backup.created_at,
      size_bytes: encrypted.length,
      checksum: createHash('sha256').update(backupJson).digest('hex'),
      file_path: backupFile
    };
    
    const manifestFile = join(backupsDir, `${backupId}.manifest.json`);
    await writeFile(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      backup: {
        id: backupId,
        created_at: backup.created_at,
        size_bytes: encrypted.length,
        file_path: backupFile
      }
    });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create backup' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const files = await readdir(backupsDir);
    const manifestFiles = files.filter(f => f.endsWith('.manifest.json'));
    const backups = [];
    
    for (const file of manifestFiles) {
      try {
        const content = await readFile(join(backupsDir, file), 'utf-8');
        const manifest = JSON.parse(content);
        backups.push(manifest);
      } catch (error) {
        console.warn(`Failed to read manifest ${file}:`, error);
      }
    }
    
    backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return NextResponse.json({
      success: true,
      backups,
      count: backups.length
    });
  } catch (error: any) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list backups' },
      { status: 500 }
    );
  }
}
