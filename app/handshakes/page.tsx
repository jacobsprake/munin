'use client';

import { useEffect, useState } from 'react';
import PacketTable from '@/components/PacketTable';
import HandshakePanel from '@/components/HandshakePanel';
import StatusStrip from '@/components/StatusStrip';
import { loadPackets } from '@/lib/loadData';
import { HandshakePacket } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { useSearchParams } from 'next/navigation';

export default function HandshakesPage() {
  const [packets, setPackets] = useState<HandshakePacket[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<HandshakePacket | null>(null);
  const { setSelectedPacket: setStorePacket } = useAppStore();
  const searchParams = useSearchParams();

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
          }
        }
      } catch (error) {
        console.error('Failed to load packets:', error);
      }
    }
    fetchPackets();
    const interval = setInterval(fetchPackets, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [searchParams]);

  const handleAuthorize = async (packetId: string, operatorId: string, passphrase: string) => {
    try {
      const response = await fetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packetId, operatorId, passphrase }),
      });
      if (response.ok) {
        const updated = await loadPackets();
        setPackets(updated);
        const updatedPacket = updated.find((p) => p.id === packetId);
        if (updatedPacket) {
          setSelectedPacket(updatedPacket);
        }
      }
    } catch (error) {
      console.error('Failed to authorize:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-mono font-semibold text-foreground uppercase">
              Authoritative Handshake Log
            </h2>
          </div>
          <PacketTable
            packets={packets}
            onSelectPacket={(packet) => {
              setSelectedPacket(packet);
              setStorePacket(packet.id);
            }}
          />
        </div>
        {selectedPacket && (
          <HandshakePanel packet={selectedPacket} onAuthorize={handleAuthorize} />
        )}
      </div>
      <StatusStrip ingestStatus="active" />
    </div>
  );
}

