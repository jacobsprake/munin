// ⚠️ DEMO ENDPOINT — Returns simulated data for demonstration purposes.
// Production implementation requires physical air-gapped tablet hardware,
// real biometric enrollment (iris + palm), and FIPS 140-3 token issuance.

import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tabletId = searchParams.get('tabletId');
    const action = searchParams.get('action') || 'status';

    if (action === 'status' && tabletId) {
      // Get tablet status
      const tabletPath = join(process.cwd(), 'engine', 'out', 'tablets', `${tabletId}.json`);
      
      try {
        const tabletData = await readFile(tabletPath, 'utf-8');
        const tablet = JSON.parse(tabletData);
        return NextResponse.json({
          status: 'ok',
          tablet: tablet.status || {}
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return NextResponse.json({ error: 'Tablet not found' }, { status: 404 });
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get tablet status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'enroll_biometric') {
      // Enroll biometric
      const { operatorId, biometricType, biometricData } = params;
      
      if (!operatorId || !biometricType || !biometricData) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // DEMO ENDPOINT — No real biometric enrollment is performed.
      // Production requires hardware biometric module.
      return NextResponse.json({
        status: 'ok',
        enrolled: true,
        mode: 'DEMO — no real biometric enrollment',
        warning: 'Production requires hardware biometric module',
        operatorId,
        biometricType,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'issue_token') {
      // Issue security token
      const { operatorId, serialNumber, pin } = params;
      
      if (!operatorId || !serialNumber || !pin) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // DEMO ENDPOINT — No real FIPS 140-3 token is issued.
      // Production requires physical token hardware and HSM.
      return NextResponse.json({
        status: 'ok',
        tokenId: `demo_token_${Date.now()}`,
        operatorId,
        serialNumber,
        issued: true,
        mode: 'DEMO — no real token issuance',
        warning: 'Production requires FIPS 140-3 hardware token',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'authorize_handshake') {
      // Authorize handshake with multi-factor authentication
      const {
        packetId,
        operatorId,
        irisData,
        palmData,
        tokenId,
        tokenPin
      } = params;
      
      if (!packetId || !operatorId || !irisData || !palmData || !tokenId || !tokenPin) {
        return NextResponse.json(
          { error: 'Missing required authentication factors' },
          { status: 400 }
        );
      }

      // DEMO ENDPOINT — No real biometric verification is performed.
      // Production requires hardware biometric module (iris scanner + palm reader)
      // and FIPS 140-3 token validation against enrolled templates.
      const authorization = {
        authorized: true,
        mode: 'DEMO — no real biometric verification',
        warning: 'Production requires hardware biometric module',
        packetId,
        operatorId,
        authorizedAt: new Date().toISOString(),
        authenticationFactors: {
          iris: { verified: true, confidence: 0.99, simulated: true },
          palm: { verified: true, confidence: 0.99, simulated: true },
          token: { verified: true, tokenId, simulated: true }
        },
        signature: `demo_auth_sig_${Date.now()}`
      };

      return NextResponse.json({
        status: 'ok',
        authorization
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process tablet request' },
      { status: 500 }
    );
  }
}


