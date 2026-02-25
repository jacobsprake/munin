'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { format } from 'date-fns';
import { Lock, Unlock, Zap, Droplets, Fuel, Users, AlertTriangle } from 'lucide-react';

interface ResourceReservation {
  lock: {
    id: string;
    resourceId: string;
    requestingSector: string;
    requestedCapacity: number;
    status: string;
    priority: number;
    startTime: string;
    endTime: string;
    reason: string;
    conflicts?: Array<{
      lockId: string;
      conflictingSector: string;
      conflictReason: string;
    }>;
  };
  resource: {
    id: string;
    type: string;
    sector: string;
    name: string;
    capacity: number;
    unit: string;
  };
  availableCapacity: number;
  reservedCapacity: number;
}

export default function ResourcesPage() {
  const [reservations, setReservations] = useState<ResourceReservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<ResourceReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSector, setFilterSector] = useState<string>('all');

  useEffect(() => {
    fetchResources();
    const interval = setInterval(fetchResources, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterSector]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'all') params.set('type', filterType);
      if (filterSector !== 'all') params.set('sector', filterSector);
      const res = await fetch(`/api/resources?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReservations(data.reservations || []);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseLock = async (lockId: string) => {
    try {
      const res = await fetch(`/api/resources?lockId=${lockId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchResources();
        if (selectedReservation?.lock.id === lockId) {
          setSelectedReservation(null);
        }
      }
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'power':
      case 'generator':
        return <Zap className="w-4 h-4" />;
      case 'water':
        return <Droplets className="w-4 h-4" />;
      case 'fuel':
        return <Fuel className="w-4 h-4" />;
      case 'personnel':
        return <Users className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'ok' | 'active' | 'warning' | 'authorized'> = {
      locked: 'active',
      pending: 'warning',
      released: 'ok',
      expired: 'warning',
      conflict: 'warning',
    };
    return statusMap[status] || 'warning';
  };

  const tableRows = reservations.map((reservation) => [
    <div key="resource" className="flex items-center gap-2">
      {getResourceIcon(reservation.resource.type)}
      <span className="text-body-mono mono text-text-primary">{reservation.resource.name}</span>
    </div>,
    <Badge key="status" status={getStatusBadge(reservation.lock.status)}>
      {reservation.lock.status.toUpperCase()}
    </Badge>,
    <span key="sector" className="text-body mono text-text-secondary capitalize">{reservation.lock.requestingSector}</span>,
    <span key="capacity" className="text-body-mono mono text-text-primary">
      {reservation.reservedCapacity.toFixed(1)} / {reservation.resource.capacity} {reservation.resource.unit}
    </span>,
    <span key="priority" className="text-body-mono mono text-text-secondary">{reservation.lock.priority}/10</span>,
    <span key="time" className="text-body-mono mono text-text-secondary">
      {format(new Date(reservation.lock.startTime), 'MM/dd HH:mm')}
    </span>,
  ]);

  const rightPanelContent = selectedReservation ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">RESOURCE</div>
        <div className="text-body-mono mono text-text-primary">{selectedReservation.resource.name}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">TYPE</div>
        <div className="flex items-center gap-2">
          {getResourceIcon(selectedReservation.resource.type)}
          <span className="text-body mono text-text-primary capitalize">{selectedReservation.resource.type}</span>
        </div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">STATUS</div>
        <Badge status={getStatusBadge(selectedReservation.lock.status)}>
          {selectedReservation.lock.status.toUpperCase()}
        </Badge>
      </div>
      <Card>
        <div className="text-label mono text-text-muted mb-2">CAPACITY</div>
        <div className="space-y-2">
          <div className="flex justify-between text-body-mono mono">
            <span className="text-text-secondary">Reserved:</span>
            <span className="text-text-primary">{selectedReservation.reservedCapacity.toFixed(1)} {selectedReservation.resource.unit}</span>
          </div>
          <div className="flex justify-between text-body-mono mono">
            <span className="text-text-secondary">Available:</span>
            <span className="text-text-primary">{selectedReservation.availableCapacity.toFixed(1)} {selectedReservation.resource.unit}</span>
          </div>
          <div className="flex justify-between text-body-mono mono">
            <span className="text-text-secondary">Total:</span>
            <span className="text-text-primary">{selectedReservation.resource.capacity} {selectedReservation.resource.unit}</span>
          </div>
          <div className="w-full bg-base-800 rounded h-2 mt-2">
            <div
              className="bg-safety-emerald h-2 rounded"
              style={{
                width: `${(selectedReservation.availableCapacity / selectedReservation.resource.capacity) * 100}%`
              }}
            />
          </div>
        </div>
      </Card>
      <div>
        <div className="text-label mono text-text-muted mb-1">REQUESTING SECTOR</div>
        <div className="text-body mono text-text-primary capitalize">{selectedReservation.lock.requestingSector}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">PRIORITY</div>
        <div className="text-body-mono mono text-text-primary">{selectedReservation.lock.priority}/10</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">REASON</div>
        <div className="text-body mono text-text-primary">{selectedReservation.lock.reason}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">TIME WINDOW</div>
        <div className="text-body-mono mono text-text-primary">
          {format(new Date(selectedReservation.lock.startTime), 'yyyy-MM-dd HH:mm')} - {format(new Date(selectedReservation.lock.endTime), 'HH:mm')}
        </div>
      </div>
      {selectedReservation.lock.conflicts && selectedReservation.lock.conflicts.length > 0 && (
        <Card>
          <div className="text-label mono text-text-muted mb-2">CONFLICTS</div>
          <div className="space-y-2">
            {selectedReservation.lock.conflicts.map((conflict, i) => (
              <div key={i} className="text-body-mono mono text-red-400">
                {conflict.conflictingSector}: {conflict.conflictReason}
              </div>
            ))}
          </div>
        </Card>
      )}
      {selectedReservation.lock.status === 'locked' && (
        <Button
          variant="secondary"
          onClick={() => handleReleaseLock(selectedReservation.lock.id)}
          className="w-full"
        >
          <Unlock className="w-4 h-4 mr-2" />
          Release Lock
        </Button>
      )}
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select a resource to view details
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Resource Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-base-700 flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
          >
            <option value="all">All Types</option>
            <option value="power">Power</option>
            <option value="water">Water</option>
            <option value="fuel">Fuel</option>
            <option value="generator">Generator</option>
            <option value="personnel">Personnel</option>
          </select>
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
          >
            <option value="all">All Sectors</option>
            <option value="power">Power</option>
            <option value="water">Water</option>
            <option value="telecom">Telecom</option>
            <option value="defense">Defense</option>
            <option value="health">Health</option>
          </select>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading resources...</div>
          ) : reservations.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No resources found</div>
          ) : (
            <Table
              headers={['Resource', 'Status', 'Sector', 'Capacity', 'Priority', 'Start Time']}
              rows={tableRows}
              onRowClick={(index) => {
                const reservation = reservations[index];
                setSelectedReservation(reservation);
              }}
              selectedRowIndex={selectedReservation ? reservations.findIndex((r) => r.lock.id === selectedReservation.lock.id) : undefined}
            />
          )}
        </div>
      </div>
    </CommandShell>
  );
}
