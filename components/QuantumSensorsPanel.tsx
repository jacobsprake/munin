'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Radio, Shield, Lock, AlertTriangle } from 'lucide-react';

interface SensorStatus {
  sensorId: string;
  sensorType: string;
  status: string;
  pqcAlgorithm: string;
  hardwarePQC: boolean;
  readingCount: number;
}

interface NetworkStatus {
  totalSensors: number;
  activeSensors: number;
  totalReadings: number;
  pqcStatus: string;
  pqcAlgorithms: string[];
}

export default function QuantumSensorsPanel() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [sensors, setSensors] = useState<SensorStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSensorStatus();
  }, []);

  const loadSensorStatus = async () => {
    try {
      const response = await fetch('/api/sovereign/quantum-sensors?action=status');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setNetworkStatus(data.network);
        setSensors(data.sensors || []);
      }
    } catch (error) {
      console.error('Failed to load sensor status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'ok';
      case 'degraded':
        return 'warning';
      case 'offline':
      case 'pqc_failure':
        return 'error';
      default:
        return 'unknown';
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-text-muted">Loading quantum sensor status...</div>
      </Card>
    );
  }

  if (!networkStatus) {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-safety-amber" />
          <h3 className="text-panel-title mono font-semibold text-text-primary">
            MUNIN-Q QUANTUM SENSORS
          </h3>
        </div>
        <div className="text-body mono text-text-secondary">
          Quantum-resistant edge sensors with hardware-level PQC encryption.
          Protects national secrets against quantum decryption threats.
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            const response = await fetch('/api/sovereign/quantum-sensors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'initialize_network' })
            });
            if (response.ok) {
              loadSensorStatus();
            }
          }}
        >
          Initialize Sensor Network
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
            MUNIN-Q QUANTUM SENSORS
          </h3>
        </div>
        <Badge status="ok" className="text-[10px]">
          {networkStatus.pqcStatus.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">TOTAL SENSORS</div>
          <div className="text-lg font-mono text-text-primary">{networkStatus.totalSensors}</div>
        </div>
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">ACTIVE SENSORS</div>
          <div className="text-lg font-mono text-safety-emerald">{networkStatus.activeSensors}</div>
        </div>
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">ENCRYPTED READINGS</div>
          <div className="text-lg font-mono text-safety-cobalt">{networkStatus.totalReadings}</div>
        </div>
        <div className="p-3 bg-base-800 rounded border border-base-700">
          <div className="text-xs font-mono text-text-muted mb-1">PQC ALGORITHMS</div>
          <div className="text-sm font-mono text-text-primary">
            {networkStatus.pqcAlgorithms.join(', ')}
          </div>
        </div>
      </div>

      <div>
        <div className="text-label mono text-text-muted mb-2">SENSORS:</div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sensors.slice(0, 10).map((sensor) => (
            <div
              key={sensor.sensorId}
              className="p-3 bg-base-800 rounded border border-base-700 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-mono text-text-primary">{sensor.sensorId}</div>
                <div className="text-[10px] font-mono text-text-muted flex items-center gap-2 mt-1">
                  <span>{sensor.sensorType}</span>
                  {sensor.hardwarePQC && (
                    <Badge status="ok" className="text-[8px]">
                      HARDWARE PQC
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={getStatusColor(sensor.status)} className="text-[10px]">
                  {sensor.status.toUpperCase()}
                </Badge>
                <div className="text-xs font-mono text-text-secondary">
                  {sensor.pqcAlgorithm}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 bg-base-800 rounded border border-safety-amber/30">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-safety-amber" />
          <div className="text-label mono text-safety-amber">FUTURE-PROOF SOVEREIGNTY</div>
        </div>
        <div className="text-xs font-mono text-text-secondary">
          Data is encrypted using Post-Quantum Cryptography (NIST FIPS 203/204)
          at the hardware level before it ever leaves the sensor. Protects against
          "Store Now, Decrypt Later" attacks from quantum computers.
        </div>
        <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-safety-emerald">
          <Lock className="w-3 h-3" />
          <span>KYBER-768 / DILITHIUM-3</span>
        </div>
      </div>
    </Card>
  );
}


