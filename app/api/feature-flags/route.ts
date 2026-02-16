import { NextRequest, NextResponse } from 'next/server';
import { featureFlags } from '@/lib/featureFlags';

/**
 * GET /api/feature-flags
 * 
 * Get all feature flags or a specific flag.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flagName = searchParams.get('flag');

    if (flagName) {
      const flag = featureFlags.getFlag(flagName);
      if (!flag) {
        return NextResponse.json(
          { error: `Feature flag '${flagName}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        flag,
      });
    }

    // Return all flags
    return NextResponse.json({
      success: true,
      flags: featureFlags.getAllFlags(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get feature flags', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feature-flags
 * 
 * Update a feature flag.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flag, enabled } = body;

    if (!flag || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: flag, enabled' },
        { status: 400 }
      );
    }

    featureFlags.setFlag(flag, enabled);

    return NextResponse.json({
      success: true,
      flag: featureFlags.getFlag(flag),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update feature flag', details: error.message },
      { status: 500 }
    );
  }
}
