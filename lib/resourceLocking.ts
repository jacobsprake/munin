/**
 * Federated Resource Locking System
 * 2026 Reality Feature: Cross-Sector Clearinghouse (The Institutional Moat)
 * 
 * Prevents "Double-Booking" of emergency assets during catastrophes.
 * Once Munin becomes the intermediary for how ministries share power,
 * water, and fuel during a crisis, it becomes the Central Nervous System.
 * 
 * This creates irreversible architectural lock-in: you cannot be replaced
 * without the entire state failing to coordinate.
 */

export type ResourceType = 'power' | 'water' | 'fuel' | 'generator' | 'bandwidth' | 'personnel';
export type Sector = 'power' | 'water' | 'telecom' | 'wastewater' | 'defense' | 'health';
export type LockStatus = 'pending' | 'locked' | 'released' | 'expired' | 'conflict';

export interface Resource {
  id: string;
  type: ResourceType;
  sector: Sector;
  name: string;
  capacity: number; // e.g., 50 MW, 1000 gallons/min
  unit: string; // e.g., 'MW', 'GPM', 'gallons'
  location?: {
    region: string;
    lat?: number;
    lon?: number;
  };
  metadata?: Record<string, any>;
}

export interface ResourceLock {
  id: string;
  resourceId: string;
  requestingSector: Sector;
  requestingPacketId?: string; // Link to handshake packet
  requestedCapacity: number;
  status: LockStatus;
  priority: number; // 1-10, higher = more critical
  startTime: string;
  endTime: string;
  lockDurationMinutes: number;
  reason: string;
  approvedBy?: string;
  approvedAt?: string;
  conflicts?: Array<{
    lockId: string;
    conflictingSector: Sector;
    conflictReason: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ResourceReservation {
  lock: ResourceLock;
  resource: Resource;
  availableCapacity: number;
  reservedCapacity: number;
}

/**
 * In-memory resource registry (in production, this would be in database)
 */
class ResourceRegistry {
  private resources: Map<string, Resource> = new Map();
  private locks: Map<string, ResourceLock> = new Map();
  private resourceLocks: Map<string, Set<string>> = new Map(); // resourceId -> lockIds

  registerResource(resource: Resource): void {
    this.resources.set(resource.id, resource);
    if (!this.resourceLocks.has(resource.id)) {
      this.resourceLocks.set(resource.id, new Set());
    }
  }

  getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  listResources(type?: ResourceType, sector?: Sector): Resource[] {
    let resources = Array.from(this.resources.values());
    if (type) {
      resources = resources.filter(r => r.type === type);
    }
    if (sector) {
      resources = resources.filter(r => r.sector === sector);
    }
    return resources;
  }

  createLock(lock: ResourceLock): {
    success: boolean;
    lock?: ResourceLock;
    conflict?: ResourceLock;
    error?: string;
  } {
    const resource = this.resources.get(lock.resourceId);
    if (!resource) {
      return { success: false, error: 'Resource not found' };
    }

    // Check for conflicts with existing locks
    const existingLocks = this.resourceLocks.get(lock.resourceId) || new Set();
    const lockStart = new Date(lock.startTime);
    const lockEnd = new Date(lock.endTime);

    for (const existingLockId of Array.from(existingLocks)) {
      const existingLock = this.locks.get(existingLockId);
      if (!existingLock || existingLock.status !== 'locked') {
        continue;
      }

      const existingStart = new Date(existingLock.startTime);
      const existingEnd = new Date(existingLock.endTime);

      // Check time overlap
      if (lockStart < existingEnd && lockEnd > existingStart) {
        // Check capacity conflict
        const totalRequested = this.getTotalLockedCapacity(lock.resourceId, lockStart, lockEnd);
        if (totalRequested + lock.requestedCapacity > resource.capacity) {
          // Conflict detected
          if (lock.priority > existingLock.priority) {
            // Higher priority: release existing lock
            existingLock.status = 'released';
            lock.status = 'locked';
            this.locks.set(lock.id, lock);
            this.resourceLocks.get(lock.resourceId)?.add(lock.id);
            
            // Add conflict note
            if (!lock.conflicts) {
              lock.conflicts = [];
            }
            lock.conflicts.push({
              lockId: existingLock.id,
              conflictingSector: existingLock.requestingSector,
              conflictReason: 'Higher priority lock preempted existing lock'
            });
            
            return { success: true, lock, conflict: existingLock };
          } else {
            // Lower priority: reject
            lock.status = 'conflict';
            this.locks.set(lock.id, lock);
            
            if (!lock.conflicts) {
              lock.conflicts = [];
            }
            lock.conflicts.push({
              lockId: existingLock.id,
              conflictingSector: existingLock.requestingSector,
              conflictReason: 'Existing higher-priority lock prevents reservation'
            });
            
            return { success: false, conflict: existingLock, error: 'Capacity conflict with existing lock' };
          }
        }
      }
    }

    // No conflict: create lock
    lock.status = 'locked';
    this.locks.set(lock.id, lock);
    this.resourceLocks.get(lock.resourceId)?.add(lock.id);
    
    return { success: true, lock };
  }

  getTotalLockedCapacity(resourceId: string, startTime: Date, endTime: Date): number {
    const locks = this.resourceLocks.get(resourceId) || new Set();
    let total = 0;

    for (const lockId of Array.from(locks)) {
      const lock = this.locks.get(lockId);
      if (!lock || lock.status !== 'locked') {
        continue;
      }

      const lockStart = new Date(lock.startTime);
      const lockEnd = new Date(lock.endTime);

      // Check overlap
      if (lockStart < endTime && lockEnd > startTime) {
        total += lock.requestedCapacity;
      }
    }

    return total;
  }

  getLock(lockId: string): ResourceLock | undefined {
    return this.locks.get(lockId);
  }

  listLocks(resourceId?: string, sector?: Sector, status?: LockStatus): ResourceLock[] {
    let locks = Array.from(this.locks.values());
    
    if (resourceId) {
      locks = locks.filter(l => l.resourceId === resourceId);
    }
    if (sector) {
      locks = locks.filter(l => l.requestingSector === sector);
    }
    if (status) {
      locks = locks.filter(l => l.status === status);
    }
    
    return locks;
  }

  releaseLock(lockId: string): boolean {
    const lock = this.locks.get(lockId);
    if (!lock) {
      return false;
    }

    lock.status = 'released';
    this.resourceLocks.get(lock.resourceId)?.delete(lockId);
    return true;
  }

  expireLocks(): number {
    const now = new Date();
    let expiredCount = 0;

    for (const lock of Array.from(this.locks.values())) {
      if (lock.status === 'locked' && new Date(lock.endTime) < now) {
        lock.status = 'expired';
        this.resourceLocks.get(lock.resourceId)?.delete(lock.id);
        expiredCount++;
      }
    }

    return expiredCount;
  }
}

// Global registry instance
const registry = new ResourceRegistry();

/**
 * Initialize with sample resources (in production, load from database)
 */
export function initializeResourceRegistry(): void {
  // Sample resources
  const sampleResources: Resource[] = [
    {
      id: 'gen_backup_01',
      type: 'generator',
      sector: 'power',
      name: 'Backup Generator Alpha',
      capacity: 50,
      unit: 'MW',
      location: { region: 'north' }
    },
    {
      id: 'gen_backup_02',
      type: 'generator',
      sector: 'power',
      name: 'Backup Generator Beta',
      capacity: 75,
      unit: 'MW',
      location: { region: 'south' }
    },
    {
      id: 'reservoir_emergency',
      type: 'water',
      sector: 'water',
      name: 'Emergency Reservoir',
      capacity: 1000000,
      unit: 'gallons',
      location: { region: 'central' }
    },
    {
      id: 'fuel_tank_01',
      type: 'fuel',
      sector: 'power',
      name: 'Emergency Fuel Reserve',
      capacity: 50000,
      unit: 'gallons',
      location: { region: 'north' }
    }
  ];

  for (const resource of sampleResources) {
    registry.registerResource(resource);
  }
}

/**
 * Request a resource lock
 */
export function requestResourceLock(
  resourceId: string,
  requestingSector: Sector,
  requestedCapacity: number,
  startTime: string,
  durationMinutes: number,
  priority: number,
  reason: string,
  packetId?: string
): {
  success: boolean;
  lock?: ResourceLock;
  conflict?: ResourceLock;
  error?: string;
} {
  const resource = registry.getResource(resourceId);
  if (!resource) {
    return { success: false, error: 'Resource not found' };
  }

  if (requestedCapacity > resource.capacity) {
    return { success: false, error: 'Requested capacity exceeds resource capacity' };
  }

  const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const lock: ResourceLock = {
    id: lockId,
    resourceId,
    requestingSector,
    requestingPacketId: packetId,
    requestedCapacity,
    status: 'pending',
    priority,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    lockDurationMinutes: durationMinutes,
    reason
  };

  return registry.createLock(lock);
}

/**
 * Get available resources
 */
export function getAvailableResources(
  type?: ResourceType,
  sector?: Sector,
  startTime?: string,
  endTime?: string
): ResourceReservation[] {
  const resources = registry.listResources(type, sector);
  const reservations: ResourceReservation[] = [];

  for (const resource of resources) {
    let availableCapacity = resource.capacity;
    let reservedCapacity = 0;

    if (startTime && endTime) {
      const locks = registry.listLocks(resource.id, undefined, 'locked');
      const start = new Date(startTime);
      const end = new Date(endTime);

      for (const lock of locks) {
        const lockStart = new Date(lock.startTime);
        const lockEnd = new Date(lock.endTime);

        if (lockStart < end && lockEnd > start) {
          reservedCapacity += lock.requestedCapacity;
        }
      }

      availableCapacity = resource.capacity - reservedCapacity;
    }

    // Get active lock for this resource
    const activeLocks = registry.listLocks(resource.id, undefined, 'locked');
    const relevantLock = activeLocks.find(l => {
      if (!startTime || !endTime) return true;
      const start = new Date(startTime);
      const end = new Date(endTime);
      const lockStart = new Date(l.startTime);
      const lockEnd = new Date(l.endTime);
      return lockStart < end && lockEnd > start;
    });

    if (relevantLock) {
      reservations.push({
        lock: relevantLock,
        resource,
        availableCapacity: Math.max(0, availableCapacity),
        reservedCapacity
      });
    } else {
      reservations.push({
        lock: {
          id: 'none',
          resourceId: resource.id,
          requestingSector: resource.sector,
          requestedCapacity: 0,
          status: 'pending',
          priority: 0,
          startTime: startTime || new Date().toISOString(),
          endTime: endTime || new Date().toISOString(),
          lockDurationMinutes: 0,
          reason: 'Available'
        },
        resource,
        availableCapacity,
        reservedCapacity
      });
    }
  }

  return reservations;
}

/**
 * Release a resource lock
 */
export function releaseResourceLock(lockId: string): boolean {
  return registry.releaseLock(lockId);
}

/**
 * Get locks for a handshake packet
 */
export function getLocksForPacket(packetId: string): ResourceLock[] {
  return registry.listLocks().filter(l => l.requestingPacketId === packetId);
}

// Initialize on module load
initializeResourceRegistry();


