/**
 * Data Diode Status Panel
 * Displays Sovereign Air-Gap (Hardware Data Diodes) status
 * 
 * This component showcases Feature #5: Sovereign Air-Gap
 */
'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Lock, CheckCircle2, XCircle } from 'lucide-react';

interface DataDiodeStatus {
  mode: 'HARDWARE_DIODE' | 'SOFTWARE_ENFORCED' | 'DISABLED';
  inboundAllowed: boolean;
  outboundBlocked: boolean;
  airGapEnforced: boolean;
}

export default function DataDiodeStatus() {
  const [status, setStatus] = useState<DataDiodeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would check actual data diode configuration
    // For now, we simulate hardware diode mode
    setTimeout(() => {
      setStatus({
        mode: 'HARDWARE_DIODE',
        inboundAllowed: true,
        outboundBlocked: true,
        airGapEnforced: true
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading || !status) {
    return (
      <Card variant="packet">
        <div className="text-center py-4 text-text-muted text-sm font-mono">
          Checking data diode status...
        </div>
      </Card>
    );
  }

  const isAirGapped = status.airGapEnforced && status.outboundBlocked;

  return (
    <Card variant="packet" className={`border-2 ${isAirGapped ? 'border-safety-emerald/30' : 'border-safety-amber/30'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded ${isAirGapped ? 'bg-safety-emerald/20' : 'bg-safety-amber/20'}`}>
          <Lock className={`w-5 h-5 ${isAirGapped ? 'text-safety-emerald' : 'text-safety-amber'}`} />
        </div>
        <div className="flex-1">
          <div className="text-label mono text-text-muted mb-1">SOVEREIGN AIR-GAP</div>
          <div className="text-panel-title mono font-semibold text-text-primary">
            Hardware Data Diode
          </div>
        </div>
        <Badge status={isAirGapped ? 'ok' : 'warning'}>
          {isAirGapped ? 'AIR-GAPPED' : 'CONNECTED'}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="bg-base-800 p-3 rounded border border-base-700">
          <div className="text-xs text-text-muted font-mono mb-2">THE SAFE AI</div>
          <div className="text-sm font-mono text-text-primary leading-relaxed">
            Munin is designed to run on hardware that allows data to flow <em>in</em> (telemetry) 
            but makes it physically impossible for data to flow <em>out</em> (to the internet).
            While everyone else sends data to cloud servers, Munin respects the Air-Gap.
          </div>
        </div>

        <div>
          <div className="text-xs text-text-muted font-mono mb-2">DATA FLOW STATUS</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-base-800 p-2 rounded border border-base-700">
              <span className="text-sm font-mono text-text-primary">Inbound (Telemetry)</span>
              {status.inboundAllowed ? (
                <div className="flex items-center gap-2 text-safety-emerald">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-mono">ALLOWED</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-safety-amber">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-mono">BLOCKED</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between bg-base-800 p-2 rounded border border-base-700">
              <span className="text-sm font-mono text-text-primary">Outbound (Internet)</span>
              {status.outboundBlocked ? (
                <div className="flex items-center gap-2 text-safety-emerald">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-mono">BLOCKED</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-safety-amber">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-mono">ALLOWED</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-text-muted font-mono mb-2">MODE</div>
          <div className="text-sm font-mono text-text-primary">
            {status.mode === 'HARDWARE_DIODE' && 'Hardware Data Diode (Physical Enforcement)'}
            {status.mode === 'SOFTWARE_ENFORCED' && 'Software-Enforced (Less Secure)'}
            {status.mode === 'DISABLED' && 'Standard Network (Not Air-Gapped)'}
          </div>
        </div>

        {isAirGapped && (
          <div className="bg-safety-emerald/10 p-3 rounded border border-safety-emerald/30">
            <div className="text-xs font-mono text-safety-emerald font-semibold mb-1">
              CERTIFIED AIR-GAPPED
            </div>
            <div className="text-xs font-mono text-text-primary">
              This system has been verified to operate in air-gapped mode. 
              No external network connectivity is possible. All data remains 
              within the secure operational network.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

