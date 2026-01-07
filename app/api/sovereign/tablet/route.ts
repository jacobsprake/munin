import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';

const execAsync = promisify(exec);

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

      // In production, this would enroll biometric on the tablet
      return NextResponse.json({
        status: 'ok',
        enrolled: true,
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

      // In production, this would issue a FIPS 140-3 token
      return NextResponse.json({
        status: 'ok',
        tokenId: `token_${Date.now()}`,
        operatorId,
        serialNumber,
        issued: true,
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

      // In production, this would verify all factors on the tablet
      // For demo, we'll simulate verification
      const authorization = {
        authorized: true,
        packetId,
        operatorId,
        authorizedAt: new Date().toISOString(),
        authenticationFactors: {
          iris: { verified: true, confidence: 0.99 },
          palm: { verified: true, confidence: 0.99 },
          token: { verified: true, tokenId }
        },
        signature: `auth_sig_${Date.now()}`
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

