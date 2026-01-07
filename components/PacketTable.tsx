'use client';

import { useState } from 'react';
import { HandshakePacket } from '@/lib/types';
import { format } from 'date-fns';
import { Download, Filter, X } from 'lucide-react';

interface PacketTableProps {
  packets: HandshakePacket[];
  onSelectPacket: (packet: HandshakePacket) => void;
}

export default function PacketTable({ packets, onSelectPacket }: PacketTableProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'executed':
      case 'verified':
        return 'text-safety-emerald border-safety-emerald bg-safety-emerald/20';
      case 'ready':
        return 'text-safety-cobalt border-safety-cobalt bg-safety-cobalt/20';
      case 'draft':
      case 'closed':
        return 'text-text-muted border-base-700 bg-base-800';
      default:
        return 'text-safety-amber border-safety-amber bg-safety-amber/20';
    }
  };

  const handleExport = (packet: HandshakePacket) => {
    const blob = new Blob([JSON.stringify(packet, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handshake_${packet.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uniqueStatuses = Array.from(new Set(packets.map((p) => p.status)));
  const uniqueRegions = Array.from(
    new Set(packets.flatMap((p) => p.scope.regions))
  );

  const filteredPackets = packets.filter((packet) => {
    if (statusFilter && packet.status !== statusFilter) return false;
    if (regionFilter && !packet.scope.regions.includes(regionFilter)) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-base-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded border transition-colors ${
              showFilters
                ? 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt'
                : 'bg-base-800 border-base-700 text-text-secondary hover:bg-base-750'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          {(statusFilter || regionFilter) && (
            <button
              onClick={() => {
                setStatusFilter(null);
                setRegionFilter(null);
              }}
              className="p-2 rounded border bg-base-800 border-base-700 text-text-secondary hover:bg-base-750"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-xs font-mono text-text-muted">
          {filteredPackets.length} / {packets.length} packets
        </div>
      </div>

      {showFilters && (
        <div className="p-4 border-b border-base-700 bg-base-900 space-y-3">
          <div>
            <div className="text-xs font-mono text-text-muted mb-2">Status</div>
            <div className="flex flex-wrap gap-2">
              {uniqueStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                  className={`px-3 py-1 rounded border text-xs font-mono transition-colors ${
                    statusFilter === status
                      ? 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt'
                      : 'bg-base-800 border-base-700 text-text-secondary hover:bg-base-750'
                  }`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-text-muted mb-2">Region</div>
            <div className="flex flex-wrap gap-2">
              {uniqueRegions.map((region) => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(regionFilter === region ? null : region)}
                  className={`px-3 py-1 rounded border text-xs font-mono transition-colors ${
                    regionFilter === region
                      ? 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt'
                      : 'bg-base-800 border-base-700 text-text-secondary hover:bg-base-750'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-base-900 sticky top-0">
            <tr className="border-b border-base-700">
              <th className="text-left px-4 py-3 text-xs font-mono text-text-muted uppercase">
                ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-muted uppercase">
                Created
              </th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-muted uppercase">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-muted uppercase">
                Action
              </th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-muted uppercase">
                Regions
              </th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-muted uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPackets.map((packet) => (
              <tr
                key={packet.id}
                onClick={() => onSelectPacket(packet)}
                className="border-b border-base-700 hover:bg-base-900 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-xs font-mono text-text-primary">{packet.id}</td>
                <td className="px-4 py-3 text-xs font-mono text-text-secondary">
                  {format(new Date(packet.createdTs), 'yyyy-MM-dd HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-mono border ${getStatusColor(
                      packet.status
                    )}`}
                  >
                    {packet.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-text-secondary max-w-md truncate">
                  {packet.proposedAction}
                </td>
                <td className="px-4 py-3 text-xs font-mono text-text-secondary">
                  {packet.scope.regions.join(', ')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(packet);
                    }}
                    className="p-1 hover:bg-base-800 rounded transition-colors"
                    title="Export JSON"
                  >
                    <Download className="w-4 h-4 text-text-secondary" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPackets.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-text-muted font-mono text-sm">No packets found</div>
          </div>
        )}
      </div>
    </div>
  );
}

