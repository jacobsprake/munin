'use client';

import { Incident } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface SimulationScrubberProps {
  incident: Incident;
  currentTime: number;
  onTimeChange: (time: number) => void;
}

export default function SimulationScrubber({
  incident,
  currentTime,
  onTimeChange,
}: SimulationScrubberProps) {
  const startTime = parseISO(incident.startTs).getTime();
  const timeline = incident.timeline.map((t) => parseISO(t.ts).getTime());
  const minTime = startTime;
  const maxTime = Math.max(...timeline, startTime + 3600000); // At least 1 hour range

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value);
    onTimeChange(newTime);
  };

  const currentImpactedNodes = incident.timeline
    .filter((t) => parseISO(t.ts).getTime() <= currentTime)
    .flatMap((t) => t.impactedNodeIds);

  return (
    <div className="bg-charcoal-100 border-t border-slate-800 p-4">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-400">SIMULATION TIMELINE</span>
          <span className="text-xs font-mono text-foreground">
            {format(new Date(currentTime), 'HH:mm:ss')}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min={minTime}
            max={maxTime}
            value={currentTime}
            onChange={handleChange}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cobalt-500"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                ((currentTime - minTime) / (maxTime - minTime)) * 100
              }%, #1e293b ${
                ((currentTime - minTime) / (maxTime - minTime)) * 100
              }%, #1e293b 100%)`,
            }}
          />
          {incident.timeline.map((t, idx) => {
            const time = parseISO(t.ts).getTime();
            const position = ((time - minTime) / (maxTime - minTime)) * 100;
            return (
              <div
                key={idx}
                className="absolute top-0 w-1 h-2 bg-amber-400"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                title={format(new Date(time), 'HH:mm:ss')}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">IMPACTED NODES:</span>
          <span className="text-amber-400">{currentImpactedNodes.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">EVENT:</span>
          <span className="text-foreground uppercase">{incident.type}</span>
        </div>
      </div>
    </div>
  );
}

