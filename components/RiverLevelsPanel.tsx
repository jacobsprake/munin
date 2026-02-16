'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface SensorReading {
  nodeId: string;
  timestamp: string;
  value: number;
}

interface RiverLevelsPanelProps {
  stationNodeId: string;
  label?: string;
}

export default function RiverLevelsPanel({
  stationNodeId,
  label = 'River Level',
}: RiverLevelsPanelProps) {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReadings() {
      try {
        setLoading(true);
        setError(null);
        const now = new Date();
        const start = new Date(now.getTime() - 6 * 60 * 60 * 1000); // last 6 hours
        const params = new URLSearchParams({
          nodeId: stationNodeId,
          start: start.toISOString(),
          end: now.toISOString(),
          limit: '200',
        });
        const res = await fetch(`/api/sensors/data?${params.toString()}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setReadings(data.readings || []);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load sensor data');
      } finally {
        setLoading(false);
      }
    }

    fetchReadings();
    const interval = setInterval(fetchReadings, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [stationNodeId]);

  const latest = readings[0];

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="text-label mono text-text-muted">{label.toUpperCase()}</div>
        <Badge status="active">LIVE</Badge>
      </div>
      {loading ? (
        <div className="text-body-mono mono text-text-muted text-sm">Loading live river levels...</div>
      ) : error ? (
        <div className="text-body-mono mono text-red-400 text-xs">{error}</div>
      ) : !latest ? (
        <div className="text-body-mono mono text-text-muted text-sm">No recent readings</div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-mono text-text-primary">
              {latest.value.toFixed(2)}
            </div>
            <div className="text-body-mono mono text-text-secondary">m AOD</div>
          </div>
          <div className="h-1.5 w-full bg-base-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-safety-emerald"
              style={{
                width: `${Math.min(100, latest.value * 5)}%`,
              }}
            />
          </div>
          <div className="text-body-mono mono text-text-muted text-xs">
            Latest reading from sensor <span className="text-text-primary">{stationNodeId}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

