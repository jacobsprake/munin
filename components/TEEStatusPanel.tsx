'use client';

import Card from '@/components/ui/Card';
import { Lock, Cpu } from 'lucide-react';
import Badge from '@/components/ui/Badge';

export default function TEEStatusPanel() {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Cpu className="w-5 h-5 text-safety-cobalt" />
          <Lock className="w-3 h-3 text-safety-emerald absolute -top-1 -right-1" />
        </div>
        <div>
          <div className="text-label mono text-text-primary">
            TRUSTED EXECUTION ENVIRONMENT
          </div>
          <div className="text-body-mono mono text-text-muted">
            Hardware-Rooted Trust
          </div>
        </div>
      </div>

      {/* SOFTWARE SIMULATION BANNER */}
      <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded flex items-center gap-2">
        <span className="text-yellow-400 font-bold text-xs mono px-2 py-0.5 bg-yellow-500/30 rounded">
          SOFTWARE SIMULATION
        </span>
        <span className="text-yellow-300 text-xs mono">
          No real TEE hardware connected. Values below are simulated for demonstration.
        </span>
      </div>

      <div className="p-4 bg-base-800 rounded border border-base-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-label mono text-text-primary">
            ROOT OF TRUST
          </div>
          <Badge status="ok">SIMULATED</Badge>
        </div>

        <div className="space-y-2 text-body-mono mono text-xs">
          <div>
            <span className="text-text-muted">Platform:</span>{' '}
            <span className="text-text-primary">Intel SGX Enclave #4401 (simulated)</span>
          </div>
          <div>
            <span className="text-text-muted">Measurement:</span>{' '}
            <span className="text-text-secondary font-mono">
              0x7a3f9b2c4d5e6f1a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f
            </span>
          </div>
          <div>
            <span className="text-text-muted">Quote:</span>{' '}
            <span className="text-text-secondary font-mono">
              Software-generated (no Intel Attestation Service connection)
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-safety-emerald/10 border border-safety-emerald/30 rounded">
        <div className="text-body-mono mono text-text-secondary text-xs">
          In production, cryptographic operations execute within a hardware-isolated enclave.
          This demo uses software-only simulation. See lib/tee.ts for implementation status.
        </div>
      </div>
    </Card>
  );
}
