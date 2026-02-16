/**
 * POST /api/notifications/read-all - Mark all notifications as read
 */
import { NextResponse } from 'next/server';
import { markAllNotificationsRead } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = body.user_id || undefined;

    markAllNotificationsRead(userId);

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
