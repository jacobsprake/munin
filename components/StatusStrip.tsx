'use client';

import { format } from 'date-fns';

interface StatusStripProps {
  lastUpdate?: Date;
  ingestStatus?: 'active' | 'degraded' | 'offline';
  sensorWarnings?: number;
}

export default function StatusStrip({
  lastUpdate,
  ingestStatus = 'active',
  sensorWarnings = 0,
}: StatusStripProps) {
  return (
    <div className="flex items-center justify-between px-6 py-2 bg-charcoal-100 border-t border-slate-800 text-xs font-mono">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">INGEST:</span>
          <span
            className={
              ingestStatus === 'active'
                ? 'text-emerald-400'
                : ingestStatus === 'degraded'
                ? 'text-amber-400'
                : 'text-slate-500'
            }
          >
            {ingestStatus.toUpperCase()}
          </span>
        </div>
        {lastUpdate && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">LAST UPDATE:</span>
            <span className="text-foreground">{format(lastUpdate, 'HH:mm:ss')}</span>
          </div>
        )}
      </div>
      {sensorWarnings > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-amber-400">⚠</span>
          <span className="text-amber-400">{sensorWarnings} SENSOR WARNINGS</span>
        </div>
      )}
    </div>
  );
}

