/**
 * Lib test: resourceLocking – conflict resolution and lock lifecycle
 */
import {
  requestResourceLock,
  releaseResourceLock,
  getAvailableResources,
  getLocksForPacket,
  initializeResourceRegistry,
} from '../resourceLocking';

describe('resourceLocking', () => {
  const baseTime = new Date();
  const oneHourLater = new Date(baseTime.getTime() + 60 * 60 * 1000);

  beforeEach(() => {
    initializeResourceRegistry();
  });

  describe('requestResourceLock', () => {
    it('succeeds for available resource', () => {
      const result = requestResourceLock(
        'gen_backup_01',
        'power',
        10,
        baseTime.toISOString(),
        60,
        5,
        'Test',
        'packet_1'
      );
      expect(result.success).toBe(true);
      expect(result.lock).toBeDefined();
      expect(result.lock!.resourceId).toBe('gen_backup_01');
      expect(result.lock!.status).toBe('locked');
    });

    it('fails when resource not found', () => {
      const result = requestResourceLock(
        'nonexistent_resource',
        'power',
        10,
        baseTime.toISOString(),
        60,
        5,
        'Test'
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it('fails when requested capacity exceeds resource capacity', () => {
      const result = requestResourceLock(
        'gen_backup_01',
        'power',
        99999,
        baseTime.toISOString(),
        60,
        5,
        'Test'
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/exceeds|capacity/i);
    });
  });

  describe('conflict resolution', () => {
    it('second lock on same resource in overlapping window can conflict or preempt by priority', () => {
      const r1 = requestResourceLock(
        'gen_backup_01',
        'power',
        40,
        baseTime.toISOString(),
        60,
        5,
        'First',
        'p1'
      );
      expect(r1.success).toBe(true);

      const r2 = requestResourceLock(
        'gen_backup_01',
        'water',
        40,
        baseTime.toISOString(),
        60,
        8,
        'Second higher priority',
        'p2'
      );
      expect(r2.success).toBe(true);
      expect(r2.lock).toBeDefined();
      expect(r2.conflict).toBeDefined();
    });
  });

  describe('releaseResourceLock', () => {
    it('returns true when lock exists and is released', () => {
      const { lock } = requestResourceLock(
        'gen_backup_02',
        'power',
        20,
        baseTime.toISOString(),
        60,
        5,
        'To release'
      ) as { lock: { id: string } };
      expect(lock).toBeDefined();
      const released = releaseResourceLock(lock.id);
      expect(released).toBe(true);
    });

    it('returns false for unknown lock id', () => {
      expect(releaseResourceLock('unknown_lock_id')).toBe(false);
    });
  });

  describe('getAvailableResources / getLocksForPacket', () => {
    it('getAvailableResources returns array', () => {
      const reservations = getAvailableResources();
      expect(Array.isArray(reservations)).toBe(true);
    });

    it('getLocksForPacket returns locks for packet', () => {
      requestResourceLock('gen_backup_01', 'power', 10, baseTime.toISOString(), 60, 5, 'Test', 'packet_abc');
      const locks = getLocksForPacket('packet_abc');
      expect(Array.isArray(locks)).toBe(true);
      expect(locks.some(l => l.requestingPacketId === 'packet_abc')).toBe(true);
    });
  });
});
