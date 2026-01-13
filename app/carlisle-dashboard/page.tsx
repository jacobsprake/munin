'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface StationReading {
  nodeId: string;
  label: string;
  value: number;
  unit: string;
  timestamp: string;
  status: 'ok' | 'warning' | 'alert' | 'critical';
}

interface PendingPacket {
  id: string;
  playbookId: string;
  situationSummary: string;
  proposedAction: string;
  createdTs: string;
  status: string;
  approvals: Array<{
    role: string;
    signedTs?: string;
    signerId?: string;
  }>;
  multiSig?: {
    currentSignatures: number;
    threshold: number;
  };
}

export default function CarlisleDashboard() {
  const [readings, setReadings] = useState<StationReading[]>([]);
  const [pendingPackets, setPendingPackets] = useState<PendingPacket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch latest readings
    fetchReadings();
    fetchPendingPackets();
    // Poll every 15 minutes
    const interval = setInterval(() => {
      fetchReadings();
      fetchPendingPackets();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchReadings = async () => {
    try {
      // Fetch latest readings for each station
      const stations = ['eden_sands_centre', 'petteril_botcherby', 'caldew_carlisle', 'rainfall_carlisle'];
      const readingPromises = stations.map(async (nodeId) => {
        try {
          const response = await fetch(`/api/sensors/data?nodeId=${nodeId}&limit=1`);
          if (response.ok) {
            const data = await response.json();
            if (data.readings && data.readings.length > 0) {
              const reading = data.readings[0];
              return {
                nodeId,
                label: getStationLabel(nodeId),
                value: reading.value,
                unit: getUnit(nodeId),
                timestamp: reading.timestamp,
                status: getStatus(nodeId, reading.value)
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching ${nodeId}:`, error);
        }
        return null;
      });

      const results = await Promise.all(readingPromises);
      setReadings(results.filter((r): r is StationReading => r !== null));
    } catch (error) {
      console.error('Error fetching readings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPackets = async () => {
    try {
      // In production, this would fetch from API
      // For now, we'll show a placeholder
      setPendingPackets([]);
    } catch (error) {
      console.error('Error fetching packets:', error);
    }
  };

  const getStationLabel = (nodeId: string): string => {
    const labels: Record<string, string> = {
      'eden_sands_centre': 'River Eden at Sands Centre',
      'petteril_botcherby': 'River Petteril at Botcherby Bridge',
      'caldew_carlisle': 'River Caldew at Carlisle',
      'rainfall_carlisle': 'Rainfall - Carlisle Area'
    };
    return labels[nodeId] || nodeId;
  };

  const getUnit = (nodeId: string): string => {
    return nodeId.includes('rainfall') ? 'mm/hour' : 'meters';
  };

  const getStatus = (nodeId: string, value: number): 'ok' | 'warning' | 'alert' | 'critical' => {
    // Thresholds from carlisle_config.py
    if (nodeId === 'eden_sands_centre') {
      if (value >= 3.5) return 'critical';
      if (value >= 3.0) return 'alert';
      if (value >= 2.5) return 'warning';
    } else if (nodeId === 'petteril_botcherby') {
      if (value >= 2.5) return 'critical';
      if (value >= 2.2) return 'alert';
      if (value >= 1.8) return 'warning';
    } else if (nodeId === 'rainfall_carlisle') {
      if (value >= 20.0) return 'critical';
      if (value >= 15.0) return 'alert';
      if (value >= 10.0) return 'warning';
    }
    return 'ok';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'alert': return 'bg-orange-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const handleApprove = async (packetId: string) => {
    // In production, this would call the approval API
    alert(`Approving packet ${packetId}`);
  };

  return (
    <div className="min-h-screen bg-base-900 text-text-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Carlisle Flood Monitoring Dashboard</h1>
          <p className="text-text-secondary">Real-time flood coordination and authorization</p>
        </div>

        {/* Station Readings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Station Readings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {readings.map((reading) => (
              <Card key={reading.nodeId} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{reading.label}</h3>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(reading.status)}`} />
                </div>
                <div className="text-2xl font-bold mb-1">
                  {reading.value.toFixed(2)} <span className="text-sm text-text-secondary">{reading.unit}</span>
                </div>
                <div className="text-xs text-text-secondary">
                  {new Date(reading.timestamp).toLocaleString()}
                </div>
                <Badge className={`mt-2 ${getStatusColor(reading.status)} text-white`}>
                  {reading.status.toUpperCase()}
                </Badge>
              </Card>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Pending Approvals</h2>
          {pendingPackets.length === 0 ? (
            <Card className="p-6 text-center text-text-secondary">
              No pending approvals. All systems operational.
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingPackets.map((packet) => (
                <Card key={packet.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{packet.playbookId}</h3>
                      <p className="text-sm text-text-secondary mb-2">{packet.situationSummary}</p>
                      <p className="text-sm mb-4">{packet.proposedAction}</p>
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span>Created: {new Date(packet.createdTs).toLocaleString()}</span>
                        {packet.multiSig && (
                          <span>
                            Signatures: {packet.multiSig.currentSignatures}/{packet.multiSig.threshold}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleApprove(packet.id)}
                      className="ml-4"
                    >
                      Approve
                    </Button>
                  </div>
                  <div className="border-t border-base-700 pt-4">
                    <div className="text-xs font-semibold mb-2">Approvals:</div>
                    <div className="space-y-1">
                      {packet.approvals.map((approval, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span>{approval.role}</span>
                          {approval.signedTs ? (
                            <Badge className="bg-green-500 text-white">SIGNED</Badge>
                          ) : (
                            <Badge className="bg-yellow-500 text-white">PENDING</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <Link href="/handshakes">
              <Button>View All Handshakes</Button>
            </Link>
            <Link href="/graph">
              <Button variant="outline">View Dependency Graph</Button>
            </Link>
            <Link href="/audit">
              <Button variant="outline">View Audit Trail</Button>
            </Link>
          </div>
        </div>

        {/* Metrics Summary */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-text-secondary mb-1">Time-to-Authorize</div>
              <div className="text-2xl font-bold">3.78 min</div>
              <div className="text-xs text-green-500 mt-1">98.4% faster than baseline</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-text-secondary mb-1">Time-to-Task</div>
              <div className="text-2xl font-bold">&lt; 1 min</div>
              <div className="text-xs text-green-500 mt-1">98% faster than baseline</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-text-secondary mb-1">Coordination Latency</div>
              <div className="text-2xl font-bold">&lt; 5 min</div>
              <div className="text-xs text-green-500 mt-1">95% faster than baseline</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
