'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Radio, Wifi, Satellite, AlertTriangle } from 'lucide-react';

interface MeshNode {
  id: string;
  type: string;
  location: { lat: number; lon: number };
  status: string;
  signalStrength: number;
  batteryLevel: number;
  neighbors: string[];
}

interface MeshNetworkStatus {
  healthScore: number;
  totalNodes: number;
  onlineNodes: number;
  gatewayNodes: number;
  totalMessages: number;
}

export default function SovereignMeshPanel() {
  const [networkStatus, setNetworkStatus] = useState<MeshNetworkStatus | null>(null);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeshStatus();
  }, []);

  const loadMeshStatus = async () => {
    try {
      const response = await fetch('/api/sovereign/mesh?action=status');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setNetworkStatus(data.mesh);
        setNodes(data.nodes || []);
      }
    } catch (error) {
      console.error('Failed to load mesh status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'ok';
      case 'degraded':
        return 'warning';
      case 'offline':
      case 'isolated':
        return 'error';
      default:
        return 'unknown';
    }
  };

  const getNodeTypeIcon = (type: string) => {
    if (type.includes('satellite')) return Satellite;
    if (type.includes('base') || type.includes('gateway')) return Radio;
    return Wifi;
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-text-muted">Loading mesh network status...</div>
      </Card>
    );
  }

  if (!networkStatus) {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-safety-amber" />
          <h3 className="text-panel-title mono font-semibold text-text-primary">
            SOVEREIGN MESH NETWORK
          </h3>
        </div>
        <div className="text-body mono text-text-secondary">
          Mesh network not initialized. This creates a private, parallel network
          that survives grid-down events.
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            const response = await fetch('/api/sovereign/mesh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'initialize' })
            });
            if (response.ok) {
              loadMeshStatus();
            }
          }}
        >
          Initialize Mesh Network
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-safety-amber" />
          <h3 className="text-panel-title mono font-semibold text-text-primary">
            SOVEREIGN MESH NETWORK
          </h3>
        </div>
        <Badge status={networkStatus.healthScore > 0.8 ? 'ok' : 'warning'}>
          {Math.round(networkStatus.healthScore * 100)}% HEALTH
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">TOTAL NODES</div>
          <div className="text-lg font-mono text-text-primary">{networkStatus.totalNodes}</div>
        </div>
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">ONLINE NODES</div>
          <div className="text-lg font-mono text-safety-emerald">{networkStatus.onlineNodes}</div>
        </div>
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">GATEWAY NODES</div>
          <div className="text-lg font-mono text-safety-cobalt">{networkStatus.gatewayNodes}</div>
        </div>
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">MESSAGES</div>
          <div className="text-lg font-mono text-text-primary">{networkStatus.totalMessages}</div>
        </div>
      </div>

      <div>
        <div className="text-label mono text-text-muted mb-2">MESH NODES:</div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {nodes.slice(0, 10).map((node) => {
            const Icon = getNodeTypeIcon(node.type);
            return (
              <div
                key={node.id}
                className="p-3 bg-base-800 rounded border border-base-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-safety-amber" />
                  <div>
                    <div className="text-xs font-mono text-text-primary">{node.id}</div>
                    <div className="text-[10px] font-mono text-text-muted">{node.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={getStatusColor(node.status)} className="text-[10px]">
                    {node.status.toUpperCase()}
                  </Badge>
                  <div className="text-xs font-mono text-text-secondary">
                    {Math.round(node.signalStrength)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-base-800 rounded border border-safety-amber/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-safety-amber" />
          <div className="text-label mono text-safety-amber">COMMUNICATION SOVEREIGNTY</div>
        </div>
        <div className="text-xs font-mono text-text-secondary">
          This private mesh network operates independently of the internet.
          Even if the nation&apos;s internet is cut, Munin&apos;s nervous system stays alive.
        </div>
      </div>
    </Card>
  );
}


