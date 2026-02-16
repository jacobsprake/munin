/**
 * PUT /api/notifications/[id] - Mark notification as read
 */
import { NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/notifications';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || undefined;

    markNotificationRead(notificationId, userId);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
