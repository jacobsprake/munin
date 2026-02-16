'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface Notification {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  created_at: string;
  read_at?: string;
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchNotifications();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications?count_only=true');
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?unread_only=true&limit=10');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'PUT' });
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400';
      case 'warning':
        return 'text-safety-amber';
      default:
        return 'text-text-secondary';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-base-900 border border-base-700 rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-base-700 flex items-center justify-between">
            <span className="text-label mono text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="divide-y divide-base-700">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-body">
                No unread notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 hover:bg-base-800 cursor-pointer"
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`flex-1 ${getSeverityColor(notification.severity)}`}>
                      <div className="text-body mono font-medium">{notification.title}</div>
                      <div className="text-body-mono mono text-text-secondary text-xs mt-1">
                        {notification.message}
                      </div>
                    </div>
                    <Badge status={notification.severity === 'critical' ? 'warning' : notification.severity === 'warning' ? 'active' : 'ok'}>
                      {notification.severity}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
