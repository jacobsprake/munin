/**
 * Ministry Management API (by ID)
 *
 * GET    /api/ministries/:id              — Get ministry details
 * PUT    /api/ministries/:id              — Update ministry info
 * POST   /api/ministries/:id?action=...   — Key rotation, revocation
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { randomBytes, createHash } from 'crypto';
import { appendAuditLogEntry } from '@/lib/audit/auditLog';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const ministry = db.prepare('SELECT * FROM ministries WHERE id = ?').get(params.id) as any;
    if (!ministry) {
      return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      ministry: {
        ...ministry,
        quorumPolicy: ministry.quorum_policy_json ? JSON.parse(ministry.quorum_policy_json) : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const body = await request.json();
    const { name, contactName, contactRole, status, quorumPolicy } = body;

    const ministry = db.prepare('SELECT * FROM ministries WHERE id = ?').get(params.id) as any;
    if (!ministry) {
      return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (contactName !== undefined) { updates.push('contact_name = ?'); values.push(contactName); }
    if (contactRole !== undefined) { updates.push('contact_role = ?'); values.push(contactRole); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (quorumPolicy) { updates.push('quorum_policy_json = ?'); values.push(JSON.stringify(quorumPolicy)); }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(params.id);
      db.prepare(`UPDATE ministries SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM ministries WHERE id = ?').get(params.id);
    return NextResponse.json({ success: true, ministry: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST actions: rotate-key, revoke-key
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const ministry = db.prepare('SELECT * FROM ministries WHERE id = ?').get(params.id) as any;
    if (!ministry) {
      return NextResponse.json({ error: 'Ministry not found' }, { status: 404 });
    }

    if (action === 'rotate-key') {
      const oldKeyId = ministry.key_id;
      const oldPublicKey = ministry.public_key;

      // Generate new key pair
      const newKeyMaterial = randomBytes(32);
      const newPublicKey = createHash('sha256').update(newKeyMaterial).update('public').digest('hex');
      const newKeyId = `key_${ministry.code}_${Date.now()}`;

      // Archive old key in history
      db.prepare(`
        INSERT INTO user_key_history (id, user_id, key_id, public_key, status, created_at, rotated_to_key_id)
        VALUES (?, ?, ?, ?, 'ROTATED', ?, ?)
      `).run(
        randomBytes(16).toString('hex'),
        params.id, oldKeyId, oldPublicKey,
        new Date().toISOString(), newKeyId
      );

      // Update ministry with new key
      db.prepare(`
        UPDATE ministries SET public_key = ?, key_id = ?, updated_at = ? WHERE id = ?
      `).run(newPublicKey, newKeyId, new Date().toISOString(), params.id);

      // Audit log
      appendAuditLogEntry('KEY_ROTATED', {
        ministryId: params.id,
        ministryCode: ministry.code,
        oldKeyId,
        newKeyId,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Key rotated for ${ministry.name}`,
        oldKeyId,
        newKeyId,
        newPublicKey,
      });
    }

    if (action === 'revoke-key') {
      // Archive current key as revoked
      db.prepare(`
        INSERT INTO user_key_history (id, user_id, key_id, public_key, status, created_at, revoked_at)
        VALUES (?, ?, ?, ?, 'REVOKED', ?, ?)
      `).run(
        randomBytes(16).toString('hex'),
        params.id, ministry.key_id, ministry.public_key,
        new Date().toISOString(), new Date().toISOString()
      );

      // Clear ministry key (cannot sign until new key issued)
      db.prepare(`
        UPDATE ministries SET public_key = NULL, key_id = NULL, status = 'key_revoked', updated_at = ? WHERE id = ?
      `).run(new Date().toISOString(), params.id);

      appendAuditLogEntry('KEY_REVOKED', {
        ministryId: params.id,
        ministryCode: ministry.code,
        revokedKeyId: ministry.key_id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `Key revoked for ${ministry.name}. Ministry cannot sign until a new key is issued.`,
        revokedKeyId: ministry.key_id,
      });
    }

    return NextResponse.json({ error: 'Unknown action. Use ?action=rotate-key or ?action=revoke-key' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
