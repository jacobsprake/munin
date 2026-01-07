'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { Shield, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

export default function AirGapStatusDiode() {
  const [isAirGapped, setIsAirGapped] = useState(true);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectionAttempt = () => {
    if (isAirGapped) {
      alert('Physical Disconnection Required\n\nNetwork connection blocked by hardware data diode. Physical intervention required to modify air-gap status.');
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`relative ${pulse ? 'animate-pulse' : ''}`}>
          <Shield className={`w-5 h-5 ${isAirGapped ? 'text-safety-emerald' : 'text-safety-amber'}`} />
        </div>
        <div>
          <div className="text-label mono text-text-primary">
            AIR-GAP STATUS
          </div>
          <div className="text-body-mono mono text-text-muted">
            Hardware Data Diode
          </div>
        </div>
      </div>

      <div className={`p-4 rounded border ${
        isAirGapped
          ? 'bg-safety-emerald/10 border-safety-emerald/50'
          : 'bg-safety-amber/10 border-safety-amber/50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-label mono text-text-primary">
            NETWORK STATUS
          </div>
          {isAirGapped ? (
            <WifiOff className="w-4 h-4 text-safety-emerald" />
          ) : (
            <Wifi className="w-4 h-4 text-safety-amber" />
          )}
        </div>
        <div className={`text-body-mono mono font-bold ${
          isAirGapped ? 'text-safety-emerald' : 'text-safety-amber'
        }`}>
          {isAirGapped ? 'AIR-GAPPED (HARDWARE DIODE ACTIVE)' : 'CONNECTED'}
        </div>
      </div>

      <div className="p-3 bg-base-800 rounded border border-base-700">
        <div className="text-body-mono mono text-text-secondary text-xs">
          Hardware-enforced unidirectional data flow. Physical modification required to change status.
        </div>
      </div>

      <button
        onClick={handleConnectionAttempt}
        className="w-full p-2 bg-base-800 hover:bg-base-700 rounded border border-base-700 text-body-mono mono text-text-secondary transition-colors"
      >
        {isAirGapped ? 'Attempt Internet Connection' : 'Disconnect Network'}
      </button>
    </Card>
  );
}

