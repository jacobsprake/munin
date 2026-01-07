'use client';

import { HandshakePacket } from '@/lib/types';
import { format } from 'date-fns';

interface PacketTableProps {
  packets: HandshakePacket[];
  onSelectPacket: (packet: HandshakePacket) => void;
}

export default function PacketTable({ packets, onSelectPacket }: PacketTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'executed':
      case 'verified':
        return 'text-emerald-400 border-emerald-700 bg-emerald-900/30';
      case 'ready':
        return 'text-cobalt-400 border-cobalt-700 bg-cobalt-900/30';
      case 'draft':
      case 'closed':
        return 'text-slate-400 border-slate-700 bg-slate-900/30';
      default:
        return 'text-amber-400 border-amber-700 bg-amber-900/30';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="bg-charcoal-50 sticky top-0">
          <tr className="border-b border-slate-800">
            <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">
              ID
            </th>
            <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">
              Created
            </th>
            <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">
              Action
            </th>
            <th className="text-left px-4 py-3 text-xs font-mono text-slate-500 uppercase">
              Regions
            </th>
          </tr>
        </thead>
        <tbody>
          {packets.map((packet) => (
            <tr
              key={packet.id}
              onClick={() => onSelectPacket(packet)}
              className="border-b border-slate-800 hover:bg-charcoal-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-xs font-mono text-foreground">{packet.id}</td>
              <td className="px-4 py-3 text-xs font-mono text-slate-400">
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
              <td className="px-4 py-3 text-xs font-mono text-slate-400 max-w-md truncate">
                {packet.proposedAction}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-slate-400">
                {packet.scope.regions.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {packets.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500 font-mono text-sm">No packets found</div>
        </div>
      )}
    </div>
  );
}

