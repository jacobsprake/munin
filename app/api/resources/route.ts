import { NextResponse } from 'next/server';
import {
  requestResourceLock,
  getAvailableResources,
  releaseResourceLock,
  getLocksForPacket,
  ResourceType,
  Sector
} from '@/lib/resourceLocking';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ResourceType | null;
    const sector = searchParams.get('sector') as Sector | null;
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const packetId = searchParams.get('packetId');

    if (packetId) {
      // Get locks for a specific packet
      const locks = getLocksForPacket(packetId);
      return NextResponse.json({ success: true, locks });
    }

    // Get available resources
    const reservations = getAvailableResources(type ?? undefined, sector ?? undefined, startTime || undefined, endTime || undefined);
    return NextResponse.json({ success: true, reservations });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      resourceId,
      requestingSector,
      requestedCapacity,
      startTime,
      durationMinutes,
      priority,
      reason,
      packetId
    } = body;

    if (!resourceId || !requestingSector || !requestedCapacity || !startTime || !durationMinutes || !priority || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = requestResourceLock(
      resourceId,
      requestingSector,
      requestedCapacity,
      startTime,
      durationMinutes,
      priority,
      reason,
      packetId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, conflict: result.conflict },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json({ success: true, lock: result.lock });
  } catch (error) {
    console.error('Error requesting resource lock:', error);
    return NextResponse.json(
      { error: 'Failed to request resource lock' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lockId = searchParams.get('lockId');

    if (!lockId) {
      return NextResponse.json(
        { error: 'Missing lockId parameter' },
        { status: 400 }
      );
    }

    const success = releaseResourceLock(lockId);
    if (!success) {
      return NextResponse.json(
        { error: 'Lock not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error releasing resource lock:', error);
    return NextResponse.json(
      { error: 'Failed to release resource lock' },
      { status: 500 }
    );
  }
}


