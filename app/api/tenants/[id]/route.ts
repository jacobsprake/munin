/**
 * PUT /api/tenants/[id] - Update tenant
 * DELETE /api/tenants/[id] - Delete tenant
 */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, sector, region, config } = body;

    const db = getDb();
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (sector !== undefined) {
      updates.push('sector = ?');
      values.push(sector);
    }
    if (region !== undefined) {
      updates.push('region = ?');
      values.push(region);
    }
    if (config !== undefined) {
      updates.push('config_json = ?');
      values.push(JSON.stringify(config));
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(params.id);

    const result = db.prepare(`
      UPDATE tenants
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant updated'
    });
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM tenants WHERE id = ?').run(params.id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant deleted'
    });
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}
