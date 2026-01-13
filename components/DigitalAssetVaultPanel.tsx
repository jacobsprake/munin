'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Lock, Unlock, Archive, Shield, AlertTriangle } from 'lucide-react';

interface VaultStatus {
  vaultId: string;
  status: string;
  location: any;
  lastSealed: string;
  lastOpened?: string;
  snapshotCount: number;
  integrity: string;
}

export default function DigitalAssetVaultPanel() {
  const [vaults, setVaults] = useState<VaultStatus[]>([]);
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [physicalKey, setPhysicalKey] = useState('');

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = async () => {
    try {
      const response = await fetch('/api/sovereign/vault?action=list');
      const data = await response.json();
      setVaults(data.vaults || []);
    } catch (error) {
      console.error('Failed to load vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVault = async (vaultId: string) => {
    if (!physicalKey) {
      alert('Please enter physical key');
      return;
    }

    try {
      const response = await fetch('/api/sovereign/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          vaultId,
          physicalKey
        })
      });

      if (response.ok) {
        loadVaults();
        setPhysicalKey('');
      }
    } catch (error) {
      console.error('Failed to open vault:', error);
    }
  };

  const handleSealVault = async (vaultId: string) => {
    if (!physicalKey) {
      alert('Please enter physical key');
      return;
    }

    try {
      const response = await fetch('/api/sovereign/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'seal',
          vaultId,
          physicalKey
        })
      });

      if (response.ok) {
        loadVaults();
        setPhysicalKey('');
      }
    } catch (error) {
      console.error('Failed to seal vault:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sealed':
        return 'ok';
      case 'open':
        return 'warning';
      case 'corrupted':
        return 'error';
      default:
        return 'unknown';
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-text-muted">Loading vault status...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-safety-amber" />
        <h3 className="text-panel-title mono font-semibold text-text-primary">
          DIGITAL ASSET VAULT (BLACK-BOX)
        </h3>
      </div>

      <div className="text-body mono text-text-secondary">
        Physical, EMP-shielded vaults that store immutable snapshots of the system's
        clean logic and Asset-Dependency Graph. When servers are wiped, restore from
        the Black-Box.
      </div>

      {vaults.length === 0 ? (
        <div className="p-4 bg-base-800 rounded border border-base-700">
          <div className="text-sm font-mono text-text-muted mb-2">
            No vaults configured. Create a vault at a major substation.
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              const response = await fetch('/api/sovereign/vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'create',
                  location: {
                    name: 'Substation North 01',
                    facilityType: 'substation'
                  }
                })
              });
              if (response.ok) {
                loadVaults();
              }
            }}
          >
            Create Vault
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {vaults.map((vault) => (
            <div
              key={vault.vaultId}
              className="p-4 bg-base-800 rounded border border-base-700 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-mono text-text-primary font-semibold">
                    {vault.vaultId}
                  </div>
                  <div className="text-xs font-mono text-text-muted mt-1">
                    {vault.location?.name || 'Unknown Location'}
                  </div>
                </div>
                <Badge status={getStatusColor(vault.status)}>
                  {vault.status.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <div className="text-text-muted">Snapshots:</div>
                  <div className="text-text-primary">{vault.snapshotCount}</div>
                </div>
                <div>
                  <div className="text-text-muted">Integrity:</div>
                  <div className={vault.integrity === 'verified' ? 'text-safety-emerald' : 'text-safety-amber'}>
                    {vault.integrity.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={physicalKey}
                  onChange={(e) => setPhysicalKey(e.target.value)}
                  placeholder="Physical Key"
                  className="flex-1 px-3 py-2 bg-base-900 border border-base-700 text-text-primary font-mono text-sm rounded"
                />
                {vault.status === 'sealed' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenVault(vault.vaultId)}
                  >
                    <Unlock className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSealVault(vault.vaultId)}
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Seal
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-base-800 rounded border border-safety-amber/30">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-safety-amber" />
          <div className="text-label mono text-safety-amber">CIVILIZATION-LEVEL DISASTER RECOVERY</div>
        </div>
        <div className="text-xs font-mono text-text-secondary">
          When the sirens go off and the servers are wiped, you don't call IT.
          You go to the Black-Box, turn the physical key, and Munin restores
          the state's brain from a physical master-record.
        </div>
      </div>
    </Card>
  );
}


