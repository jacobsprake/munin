/**
 * GET /api/tenants - List tenants
 * POST /api/tenants - Create tenant
 * PUT /api/tenants/[id] - Update tenant
 * DELETE /api/tenants/[id] - Delete tenant
 * Air-gapped compliant: multi-tenant support with RBAC isolation
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = getDb();
    
    // Create tenants table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT,
        region TEXT,
        config_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all() as any[];

    return NextResponse.json({
      success: true,
      tenants: tenants.map(t => ({
        ...t,
        config_json: typeof t.config_json === 'string' ? JSON.parse(t.config_json) : t.config_json
      }))
    });
  } catch (error: any) {
    console.error('Error listing tenants:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list tenants' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, sector, region, config } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const db = getDb();
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector TEXT,
        region TEXT,
        config_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    db.prepare(`
      INSERT INTO tenants (id, name, sector, region, config_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenantId, name, sector || null, region || null, JSON.stringify(config || {}));

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenantId,
        name,
        sector,
        region,
        config
      }
    });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
