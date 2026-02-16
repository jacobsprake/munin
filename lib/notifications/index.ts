/**
 * Internal Notification System
 * Air-gapped compliant: no external dependencies, all notifications internal-only
 */

import { getDb } from '../db';
import { randomBytes } from 'crypto';

export type NotificationType = 
  | 'incident_created'
  | 'incident_updated'
  | 'decision_created'
  | 'decision_authorized'
  | 'decision_rejected'
  | 'packet_created'
  | 'packet_authorized'
  | 'threshold_breach'
  | 'sensor_alert'
  | 'system_alert';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  resource_id?: string; // e.g., incident_id, decision_id, packet_id
  resource_type?: string;
  created_at: Date;
  read_at?: Date;
  user_id?: string; // If notification is user-specific
}

/**
 * Create a notification
 */
export function createNotification(
  type: NotificationType,
  severity: NotificationSeverity,
  title: string,
  message: string,
  resourceId?: string,
  resourceType?: string,
  userId?: string
): Notification {
  const db = getDb();
  const id = randomBytes(16).toString('hex');
  const createdAt = new Date();

  db.prepare(`
    INSERT INTO notifications (
      id, type, severity, title, message, resource_id, resource_type, user_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    type,
    severity,
    title,
    message,
    resourceId || null,
    resourceType || null,
    userId || null,
    createdAt.toISOString()
  );

  return {
    id,
    type,
    severity,
    title,
    message,
    resource_id: resourceId,
    resource_type: resourceType,
    created_at: createdAt,
    user_id: userId
  };
}

/**
 * Get notifications (optionally filtered)
 */
export function getNotifications(filters?: {
  userId?: string;
  type?: NotificationType;
  severity?: NotificationSeverity;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}): Notification[] {
  const db = getDb();
  const { userId, type, severity, unreadOnly = false, limit = 100, offset = 0 } = filters || {};

  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params: any[] = [];

  if (userId) {
    query += ' AND (user_id IS NULL OR user_id = ?)';
    params.push(userId);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }
  if (unreadOnly) {
    query += ' AND read_at IS NULL';
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params) as any[];

  return rows.map(row => ({
    id: row.id,
    type: row.type as NotificationType,
    severity: row.severity as NotificationSeverity,
    title: row.title,
    message: row.message,
    resource_id: row.resource_id,
    resource_type: row.resource_type,
    created_at: new Date(row.created_at),
    read_at: row.read_at ? new Date(row.read_at) : undefined,
    user_id: row.user_id
  }));
}

/**
 * Mark notification as read
 */
export function markNotificationRead(notificationId: string, userId?: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE notifications 
    SET read_at = ? 
    WHERE id = ? AND (user_id IS NULL OR user_id = ?)
  `).run(new Date().toISOString(), notificationId, userId || null);
}

/**
 * Mark all notifications as read for a user
 */
export function markAllNotificationsRead(userId?: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE notifications 
    SET read_at = ? 
    WHERE read_at IS NULL AND (user_id IS NULL OR user_id = ?)
  `).run(new Date().toISOString(), userId || null);
}

/**
 * Get unread notification count
 */
export function getUnreadCount(userId?: string): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE read_at IS NULL AND (user_id IS NULL OR user_id = ?)
  `).get(userId || null) as { count: number };
  return result.count;
}
