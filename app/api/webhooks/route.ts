/**
 * GET /api/webhooks - List internal webhooks (event subscriptions)
 * POST /api/webhooks - Create internal webhook subscription
 * DELETE /api/webhooks - Delete webhook subscription
 * Air-gapped compliant: internal-only event bus, no external webhooks
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = getDb();
    const webhooks = db.prepare(`
      SELECT * FROM webhook_subscriptions
      ORDER BY created_at DESC
    `).all() as any[];

    return NextResponse.json({
      success: true,
      webhooks
    });
  } catch (error: any) {
    // Table might not exist yet
    if (error.message?.includes('no such table')) {
      return NextResponse.json({
        success: true,
        webhooks: []
      });
    }
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_type, target_url, secret } = body;

    if (!event_type || !target_url) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, target_url' },
        { status: 400 }
      );
    }

    // Validate target_url is internal only
    const url = new URL(target_url);
    const allowedHosts = ['localhost', '127.0.0.1', 'internal'];
    if (!allowedHosts.some(host => url.hostname.includes(host))) {
      return NextResponse.json(
        { error: 'Webhook target must be internal-only (localhost, 127.0.0.1, or internal domain)' },
        { status: 400 }
      );
    }

    const db = getDb();
    
    // Create webhook_subscriptions table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        target_url TEXT NOT NULL,
        secret TEXT,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    db.prepare(`
      INSERT INTO webhook_subscriptions (id, event_type, target_url, secret, enabled)
      VALUES (?, ?, ?, ?, 1)
    `).run(webhookId, event_type, target_url, secret || null);

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhookId,
        event_type,
        target_url,
        enabled: true
      }
    });
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db.prepare('DELETE FROM webhook_subscriptions WHERE id = ?').run(webhookId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted'
    });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
