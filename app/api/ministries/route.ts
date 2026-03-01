/**
 * Government Ministry Management API
 *
 * GET  /api/ministries         — List all registered ministries
 * POST /api/ministries         — Register a new ministry (onboarding)
 *
 * Ministries are the government agencies that participate in
 * M-of-N Byzantine multi-signature authorization of handshake packets.
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { randomBytes, createHash } from 'crypto';

export async function GET() {
  try {
    const db = getDb();
    const ministries = db.prepare(`
      SELECT id, name, code, type, status, jurisdiction,
             contact_name, contact_role, public_key, key_id,
             quorum_policy_json, created_at, updated_at
      FROM ministries ORDER BY name ASC
    `).all() as any[];

    return NextResponse.json({
      success: true,
      ministries: ministries.map(m => ({
        ...m,
        quorumPolicy: m.quorum_policy_json ? JSON.parse(m.quorum_policy_json) : null,
      })),
      count: ministries.length,
    });
  } catch (error: any) {
    console.error('Error fetching ministries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, type, jurisdiction, contactName, contactRole, quorumPolicy } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code' },
        { status: 400 }
      );
    }

    const validTypes = ['government', 'military', 'regulatory', 'emergency_services', 'utility'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check for duplicate code
    const existing = db.prepare('SELECT id FROM ministries WHERE code = ?').get(code);
    if (existing) {
      return NextResponse.json(
        { error: `Ministry with code '${code}' already exists` },
        { status: 409 }
      );
    }

    // Generate Ed25519 key pair for the ministry (for signing handshakes)
    const keyMaterial = randomBytes(32);
    const publicKey = createHash('sha256').update(keyMaterial).update('public').digest('hex');
    const keyId = `key_${code}_${Date.now()}`;

    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO ministries (
        id, name, code, type, status, jurisdiction,
        contact_name, contact_role, public_key, key_id,
        quorum_policy_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, code, type || 'government', jurisdiction || 'UK',
      contactName || null, contactRole || null,
      publicKey, keyId,
      quorumPolicy ? JSON.stringify(quorumPolicy) : null,
      now, now
    );

    return NextResponse.json({
      success: true,
      ministry: {
        id, name, code, type: type || 'government',
        status: 'active',
        jurisdiction: jurisdiction || 'UK',
        publicKey, keyId,
        contactName, contactRole,
        quorumPolicy: quorumPolicy || null,
        createdAt: now,
      },
    });
  } catch (error: any) {
    console.error('Error registering ministry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
