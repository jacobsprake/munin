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

  const currentTimelineEntry = incident.timeline
    .filter((t) => parseISO(t.ts).getTime() <= currentTime)
    .slice(-1)[0];

  const currentImpactedNodes = incident.timeline
    .filter((t) => parseISO(t.ts).getTime() <= currentTime)
    .flatMap((t) => t.impactedNodeIds);

  const upcomingEntries = incident.timeline
    .filter((t) => parseISO(t.ts).getTime() > currentTime)
    .slice(0, 3);

  const getTimeToImpact = (targetTime: number) => {
    const diff = targetTime - currentTime;
    if (diff < 0) return null;
    return diff;
  };

  return (
    <div className="bg-base-900 border-t border-base-700 p-4">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-label mono text-text-muted">SIMULATION TIMELINE</span>
          <span className="text-body-mono mono text-text-primary">
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
            className="w-full h-2 bg-base-800 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                ((currentTime - minTime) / (maxTime - minTime)) * 100
              }%, #162232 ${
                ((currentTime - minTime) / (maxTime - minTime)) * 100
              }%, #162232 100%)`,
            }}
          />
          {incident.timeline.map((t, idx) => {
            const time = parseISO(t.ts).getTime();
            const position = ((time - minTime) / (maxTime - minTime)) * 100;
            return (
              <div
                key={idx}
                className="absolute top-0 w-1 h-2 bg-safety-amber"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                title={format(new Date(time), 'HH:mm:ss')}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-6 text-body-mono mono mb-3">
        <div className="flex items-center gap-2">
          <span className="text-text-muted">IMPACTED NODES:</span>
          <span className="text-safety-amber">{currentImpactedNodes.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">EVENT:</span>
          <span className="text-text-primary uppercase">{incident.type}</span>
        </div>
        {currentTimelineEntry && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">CONFIDENCE:</span>
            <span className="text-text-primary">
              {Math.round(currentTimelineEntry.confidence * 100)}%
            </span>
            {currentTimelineEntry.confidenceBand && (
              <span className="text-text-muted text-xs">
                ({Math.round(currentTimelineEntry.confidenceBand.lower * 100)}% -{' '}
                {Math.round(currentTimelineEntry.confidenceBand.upper * 100)}%)
              </span>
            )}
          </div>
        )}
      </div>
      {upcomingEntries.length > 0 && (
        <div className="pt-3 border-t border-base-700">
          <div className="text-xs font-mono text-text-muted mb-2">TIME TO IMPACT</div>
          <div className="space-y-2">
            {upcomingEntries.map((entry, idx) => {
              const timeToImpact = getTimeToImpact(parseISO(entry.ts).getTime());
              if (!timeToImpact) return null;
              const minutes = Math.floor(timeToImpact / 60000);
              const seconds = Math.floor((timeToImpact % 60000) / 1000);
              return (
                <div
                  key={idx}
                  className="p-2 bg-base-800 rounded border border-base-700 flex items-center justify-between"
                >
                  <div className="text-xs font-mono text-text-secondary">
                    {entry.impactedNodeIds.length} nodes
                  </div>
                  <div className="text-xs font-mono text-safety-amber">
                    {minutes > 0 ? `${minutes}m ` : ''}
                    {seconds}s
                  </div>
                  {entry.confidenceBand && (
                    <div className="text-xs font-mono text-text-muted">
                      {Math.round(entry.confidenceBand.lower * 100)}-{Math.round(entry.confidenceBand.upper * 100)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

