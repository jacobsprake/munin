import { NextRequest, NextResponse } from 'next/server';

type QuorumState = 'PENDING' | 'PARTIAL' | 'AUTHORIZED' | 'REJECTED' | 'EXPIRED';

interface QuorumStatus {
  actionId: string;
  state: QuorumState;
  signaturesReceived: number;
  thresholdRequired: number;
  ministriesSigned: string[];
  ministriesMissing: string[];
  quorumType: string;
  requiresBiometricHandshake: boolean;
  handshakeDetails: Array<{
    ministry: string;
    signerId: string;
    timestamp: string;
    biometricVerified: boolean;
  }>;
  stateTransitions: Array<{
    from: QuorumState;
    to: QuorumState;
    timestamp: string;
    reason: string;
  }>;
  timestamp: string;
}

function determineQuorumState(
  signaturesReceived: number,
  thresholdRequired: number,
  ministriesSigned: string[],
  requiredMinistries: string[],
  emergencyLevel?: string
): QuorumState {
  // Emergency level affects quorum requirements
  const effectiveThreshold = emergencyLevel && ['war', 'national_emergency', 'critical'].includes(emergencyLevel)
    ? Math.max(1, Math.floor(thresholdRequired * 0.67)) // Reduce threshold by ~33% in emergency
    : thresholdRequired;
  
  if (signaturesReceived === 0) {
    return 'PENDING';
  }
  if (signaturesReceived >= effectiveThreshold && 
      ministriesSigned.length >= effectiveThreshold) {
    return 'AUTHORIZED';
  }
  if (signaturesReceived > 0 && signaturesReceived < effectiveThreshold) {
    return 'PARTIAL';
  }
  return 'PENDING';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get('actionId');

    if (actionId) {
      // Get quorum status for specific action with explicit state
      const requiredMinistries = ['water_authority', 'power_grid_operator', 'national_security'];
      const signaturesReceived = 0;
      const thresholdRequired = 3;
      const ministriesSigned: string[] = [];
      const ministriesMissing = requiredMinistries;
      
      const state = determineQuorumState(
        signaturesReceived,
        thresholdRequired,
        ministriesSigned,
        requiredMinistries
      );
      
      const status: QuorumStatus = {
        actionId,
        state,
        signaturesReceived,
        thresholdRequired,
        ministriesSigned,
        ministriesMissing,
        quorumType: `${thresholdRequired}-of-${requiredMinistries.length}`,
        requiresBiometricHandshake: true,
        handshakeDetails: [],
        stateTransitions: [
          {
            from: 'PENDING',
            to: state,
            timestamp: new Date().toISOString(),
            reason: 'Initial state'
          }
        ],
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json(status);
    }

    // Get pending actions requiring signatures
    return NextResponse.json({
      status: 'ok',
      pendingActions: [],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get quorum status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'create_quorum') {
      const {
        actionId,
        actionDescription,
        targetAssets,
        actionType,
        m,
        n
      } = params;

      if (!actionId || !actionDescription || !targetAssets) {
        return NextResponse.json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      // In production, would create quorum requirement
      return NextResponse.json({
        status: 'ok',
        actionId,
        quorumType: `${m || 3}-of-${n || 3}`,
        requiresBiometricHandshake: true,
        message: 'Quorum requirement created',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'add_signature_with_handshake') {
      const {
        actionId,
        ministry,
        signerId,
        publicKey,
        signature,
        location,
        ministrySeal,
        tabletId,
        tabletSerial,
        irisVerified,
        palmVerified,
        tokenVerified,
        airGapVerified = true
      } = params;

      if (!actionId || !ministry || !signerId || !tabletId) {
        return NextResponse.json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      // Verify biometric handshake
      if (!irisVerified || !palmVerified || !tokenVerified || !airGapVerified) {
        return NextResponse.json(
          { error: 'Biometric handshake verification failed - all factors must be verified' },
          { status: 400 }
        );
      }

      // In production, would add signature with handshake and update state
      const requiredMinistries = ['water_authority', 'power_grid_operator', 'national_security'];
      const signaturesReceived = 1; // After adding this signature
      const thresholdRequired = 3;
      const ministriesSigned = [ministry];
      
      const newState = determineQuorumState(
        signaturesReceived,
        thresholdRequired,
        ministriesSigned,
        requiredMinistries
      );
      
      return NextResponse.json({
        status: 'ok',
        actionId,
        ministry,
        state: newState,
        authorized: newState === 'AUTHORIZED',
        signaturesReceived,
        thresholdRequired,
        ministriesSigned,
        ministriesMissing: requiredMinistries.filter(m => m !== ministry),
        quorumType: `${thresholdRequired}-of-${requiredMinistries.length}`,
        stateTransition: {
          from: 'PENDING',
          to: newState,
          timestamp: new Date().toISOString(),
          reason: `Signature added from ${ministry}`
        },
        message: 'Signature with biometric handshake added',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'register_terminal') {
      const { terminalId, ministry, location, tabletSerial } = params;

      if (!terminalId || !ministry || !location || !tabletSerial) {
        return NextResponse.json(
          { error: 'Missing required parameters' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        status: 'ok',
        terminalId,
        ministry,
        isAirGapped: true,
        message: 'Air-gapped terminal registered',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process quorum request' },
      { status: 500 }
    );
  }
}


