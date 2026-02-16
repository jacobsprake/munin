/**
 * GET /api/notifications - List notifications
 * POST /api/notifications - Create notification (internal use)
 */
import { NextResponse } from 'next/server';
import { getNotifications, createNotification, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '@/lib/notifications';
import type { NotificationType, NotificationSeverity } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || undefined;
    const type = searchParams.get('type') as NotificationType | null;
    const severity = searchParams.get('severity') as NotificationSeverity | null;
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const countOnly = searchParams.get('count_only') === 'true';

    if (countOnly) {
      const count = getUnreadCount(userId);
      return NextResponse.json({ success: true, count });
    }

    const notifications = getNotifications({
      userId,
      type: type || undefined,
      severity: severity || undefined,
      unreadOnly,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      notifications: notifications.map(n => ({
        ...n,
        created_at: n.created_at.toISOString(),
        read_at: n.read_at?.toISOString()
      })),
      count: notifications.length
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, severity, title, message, resource_id, resource_type, user_id } = body;

    if (!type || !severity || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, severity, title, message' },
        { status: 400 }
      );
    }

    const notification = createNotification(
      type as NotificationType,
      severity as NotificationSeverity,
      title,
      message,
      resource_id,
      resource_type,
      user_id
    );

    return NextResponse.json({
      success: true,
      notification: {
        ...notification,
        created_at: notification.created_at.toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}
