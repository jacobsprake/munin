/**
 * POST /api/engine/sync
 * Manually sync engine output files to database
 */
import { NextResponse } from 'next/server';
import { syncAllEngineOutputs } from '@/lib/engine/sync';

export async function POST() {
  try {
    await syncAllEngineOutputs();
    return NextResponse.json({ 
      success: true,
      message: 'Engine outputs synced to database'
    });
  } catch (error: any) {
    console.error('Error syncing engine outputs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync engine outputs' },
      { status: 500 }
    );
  }
}


