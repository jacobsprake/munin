import { createNotification, getNotifications, markNotificationRead } from '../notifications';

describe('Notifications System', () => {
  it('creates a notification', () => {
    const notif = createNotification(
      'incident_detected',
      'critical',
      'Test Incident',
      'A test incident was detected'
    );
    expect(notif).toBeDefined();
    expect(notif.id).toBeTruthy();
    expect(notif.type).toBe('incident_detected');
    expect(notif.severity).toBe('critical');
  });

  it('getNotifications returns array', () => {
    const notifs = getNotifications();
    expect(Array.isArray(notifs)).toBe(true);
  });

  it('markNotificationRead does not throw', () => {
    const notif = createNotification(
      'packet_pending',
      'warning',
      'Test',
      'Test message'
    );
    expect(() => markNotificationRead(notif.id)).not.toThrow();
  });
});
