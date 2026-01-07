'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { loadPackets } from '@/lib/loadData';
import { HandshakePacket } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Search, Filter, Download } from 'lucide-react';

export default function HandshakesPage() {
  const [packets, setPackets] = useState<HandshakePacket[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<HandshakePacket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const { setSelectedPacket: setStorePacket, warRoomMode } = useAppStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function fetchPackets() {
      try {
        const data = await loadPackets();
        setPackets(data);
        const generateId = searchParams.get('generate');
        if (generateId) {
          const packet = data.find((p) => p.id === generateId);
          if (packet) {
            setSelectedPacket(packet);
            setStorePacket(packet.id);
            router.push('/handshakes');
          }
        }
      } catch (error) {
        console.error('Failed to load packets:', error);
      }
    }
    fetchPackets();
    const interval = setInterval(fetchPackets, 10000);
    return () => clearInterval(interval);
  }, [searchParams]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'ok' | 'active' | 'warning' | 'authorized'> = {
      authorized: 'authorized',
      executed: 'authorized',
      verified: 'authorized',
      ready: 'active',
      draft: 'warning',
      closed: 'warning',
    };
    return statusMap[status] || 'warning';
  };

  const filteredPackets = packets.filter((p) => {
    if (searchQuery && !p.id.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !p.proposedAction.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (regionFilter !== 'all' && !p.scope.regions.includes(regionFilter)) return false;
    return true;
  });

  const tableRows = filteredPackets.map((packet) => [
    <span key="id" className="text-body-mono mono text-text-primary">{packet.id}</span>,
    <span key="incident" className="text-body mono text-text-secondary">FLOOD EVENT</span>,
    <span key="region" className="text-body mono text-text-secondary">{packet.scope.regions[0] || 'N/A'}</span>,
    <Badge key="status" status={getStatusBadge(packet.status)}>{packet.status.toUpperCase()}</Badge>,
    <span key="signed" className="text-body-mono mono text-text-secondary">
      {packet.approvals.find((a) => a.signerId)?.signerId || '—'}
    </span>,
    <span key="timestamp" className="text-body-mono mono text-text-secondary">
      {format(new Date(packet.createdTs), 'yyyy-MM-dd HH:mm')}
    </span>,
  ]);

  const rightPanelContent = selectedPacket ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">PACKET ID</div>
        <div className="text-body-mono mono text-text-primary">{selectedPacket.id}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">SITUATION SUMMARY</div>
        <div className="text-body mono text-text-primary">{selectedPacket.situationSummary}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">PROPOSED ACTION</div>
        <div className="text-body mono text-text-primary">{selectedPacket.proposedAction}</div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => router.push(`/handshakes/${selectedPacket.id}`)}>
          Open Packet
        </Button>
        <Button variant="ghost">
          <Download className="w-4 h-4" />
        </Button>
      </div>
      <Card>
        <div className="text-label mono text-text-muted mb-2">AUDIT INTEGRITY</div>
        <div className="flex items-center gap-2 mb-2">
          <Badge status="ok">VERIFIED</Badge>
        </div>
        {selectedPacket.audit && (
          <div className="text-body-mono mono text-text-secondary">
            Last audit hash: {selectedPacket.audit.lastAuditHash.substring(0, 16)}...
          </div>
        )}
      </Card>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select a packet to view details
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Packet Preview"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-base-700 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-base-800 border border-base-700 rounded px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search packets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-body text-text-primary placeholder:text-text-muted focus:outline-none mono"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="authorized">Authorized</option>
            <option value="executed">Executed</option>
          </select>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
          >
            <option value="all">All Regions</option>
            <option value="Region 07">Region 07</option>
            <option value="Region 01">Region 01</option>
          </select>
          <button className="bg-base-800 border border-base-700 rounded px-3 py-2 hover:bg-base-750">
            <Filter className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table
            headers={['Packet ID', 'Incident', 'Region', 'Status', 'Signed By', 'Timestamp']}
            rows={tableRows}
            onRowClick={(index) => {
              const packet = filteredPackets[index];
              setSelectedPacket(packet);
              setStorePacket(packet.id);
            }}
            selectedRowIndex={selectedPacket ? filteredPackets.findIndex((p) => p.id === selectedPacket.id) : undefined}
          />
        </div>
      </div>
    </CommandShell>
  );
}
