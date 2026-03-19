'use client';

import { Clock } from 'lucide-react';
import { HandshakePacket } from '@/lib/types';

interface CoordinationLatencyCardProps {
  packets: HandshakePacket[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function CoordinationLatencyCard({ packets }: CoordinationLatencyCardProps) {
  const authorizedPackets = packets.filter(
    (p) => (p.status === 'authorized' || p.status === 'executed') && p.approvals?.length
  );

  const latencies: number[] = [];
  for (const p of authorizedPackets) {
    const created = new Date(p.createdTs).getTime();
    const signedTimestamps = (p.approvals || [])
      .filter((a) => a.signedTs)
      .map((a) => new Date(a.signedTs).getTime());
    if (signedTimestamps.length > 0) {
      const lastSigned = Math.max(...signedTimestamps);
      latencies.push((lastSigned - created) / 1000);
    }
  }

  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : null;

  if (latencies.length === 0) {
    return (
      <div className="bg-base-900 border border-base-700 rounded p-4">
        <div className="text-xs font-mono text-text-secondary uppercase mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Coordination Latency
        </div>
        <div className="text-sm text-text-muted">
          No authorized packets yet. Latency = time from packet creation to last signature.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-900 border border-base-700 rounded p-4">
      <div className="text-xs font-mono text-text-secondary uppercase mb-2 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Coordination Latency
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Avg (creation → last signature)</span>
          <span className="font-mono text-safety-cobalt">{formatDuration(avgLatency!)}</span>
        </div>
        <div className="text-xs text-text-muted">
          {latencies.length} packet{latencies.length !== 1 ? 's' : ''} • Thesis target: 20–30 min
        </div>
      </div>
    </div>
  );
}
