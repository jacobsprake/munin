'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Shield, Lock, Key, Network, Database } from 'lucide-react';

interface SovereignHealthStatus {
  tee: {
    platform: string;
    status: 'active' | 'simulated' | 'unavailable';
    enclaveCount: number;
  };
  pqc: {
    algorithm: string;
    keyStatus: 'active' | 'rotating' | 'expired';
    daysUntilRotation: number;
  };
  eurostack: {
    sovereigntyLevel: string;
    certificationStatus: string;
    foreignDependencies: number;
  };
  mesh: {
    nodeCount: number;
    healthScore: number;
    status: 'online' | 'degraded' | 'offline';
  };
  vault: {
    vaultCount: number;
    lastSnapshot: string;
    status: 'sealed' | 'open';
  };
}

export default function SovereignHealthPanel() {
  const [health, setHealth] = useState<SovereignHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthStatus();
    const interval = setInterval(loadHealthStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadHealthStatus = async () => {
    try {
      // Load from multiple APIs
      const [teeRes, pqcRes, eurostackRes, meshRes, vaultRes] = await Promise.all([
        fetch('/api/tee/status'),
        fetch('/api/pqc/status'),
        fetch('/api/sovereign/eurostack'),
        fetch('/api/sovereign/mesh?action=status'),
        fetch('/api/sovereign/vault?action=list')
      ]);

      const healthStatus: SovereignHealthStatus = {
        tee: teeRes.ok ? await teeRes.json() : { platform: 'unknown', status: 'unavailable', enclaveCount: 0 },
        pqc: pqcRes.ok ? await pqcRes.json() : { algorithm: 'DILITHIUM-3', keyStatus: 'active', daysUntilRotation: 90 },
        eurostack: eurostackRes.ok ? await eurostackRes.json() : { sovereigntyLevel: 'unknown', certificationStatus: 'unknown', foreignDependencies: 0 },
        mesh: meshRes.ok ? await meshRes.json() : { nodeCount: 0, healthScore: 0, status: 'offline' },
        vault: vaultRes.ok ? await vaultRes.json() : { vaultCount: 0, lastSnapshot: '', status: 'sealed' }
      };

      setHealth(healthStatus);
    } catch (error) {
      console.error('Failed to load sovereign health:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground">Loading sovereign health...</div>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground">Failed to load health status</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="text-sm font-mono font-semibold text-text-primary mb-4">
          SOVEREIGN HEALTH STATUS
        </div>

        <div className="space-y-3">
          {/* TEE Status */}
          <div className="flex items-center justify-between p-2 bg-base-800 rounded">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-safety-cobalt" />
              <div>
                <div className="text-xs font-mono text-text-primary">TEE</div>
                <div className="text-xs font-mono text-text-muted">{health.tee.platform}</div>
              </div>
            </div>
            <Badge status={health.tee.status === 'active' ? 'ok' : 'warning'}>
              {health.tee.status}
            </Badge>
          </div>

          {/* PQC Status */}
          <div className="flex items-center justify-between p-2 bg-base-800 rounded">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-safety-emerald" />
              <div>
                <div className="text-xs font-mono text-text-primary">PQC</div>
                <div className="text-xs font-mono text-text-muted">{health.pqc.algorithm}</div>
              </div>
            </div>
            <Badge status={health.pqc.keyStatus === 'active' ? 'ok' : 'warning'}>
              {health.pqc.daysUntilRotation}d
            </Badge>
          </div>

          {/* EuroStack Status */}
          <div className="flex items-center justify-between p-2 bg-base-800 rounded">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-safety-amber" />
              <div>
                <div className="text-xs font-mono text-text-primary">EuroStack</div>
                <div className="text-xs font-mono text-text-muted">{health.eurostack.sovereigntyLevel}</div>
              </div>
            </div>
            <Badge status={health.eurostack.foreignDependencies === 0 ? 'ok' : 'warning'}>
              {health.eurostack.foreignDependencies} foreign
            </Badge>
          </div>

          {/* Mesh Status */}
          <div className="flex items-center justify-between p-2 bg-base-800 rounded">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-safety-cobalt" />
              <div>
                <div className="text-xs font-mono text-text-primary">Mesh Network</div>
                <div className="text-xs font-mono text-text-muted">{health.mesh.nodeCount} nodes</div>
              </div>
            </div>
            <Badge status={health.mesh.status === 'online' ? 'ok' : 'warning'}>
              {Math.round(health.mesh.healthScore * 100)}%
            </Badge>
          </div>

          {/* Vault Status */}
          <div className="flex items-center justify-between p-2 bg-base-800 rounded">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-safety-emerald" />
              <div>
                <div className="text-xs font-mono text-text-primary">Digital Vault</div>
                <div className="text-xs font-mono text-text-muted">{health.vault.vaultCount} vaults</div>
              </div>
            </div>
            <Badge status={health.vault.status === 'sealed' ? 'ok' : 'warning'}>
              {health.vault.status}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
