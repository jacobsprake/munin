'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import { Incident } from '@/lib/types';
import { parseISO, format } from 'date-fns';

interface IncidentReplayProps {
  incident: Incident;
  onTimeChange?: (time: number) => void;
}

/**
 * Incident Replay Component
 * 
 * Allows "scrubbing" through a past cascade with synchronized graph and telemetry views.
 */
export default function IncidentReplay({ incident, onTimeChange }: IncidentReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 1x, 2x, 4x, etc.

  const timeline = incident.timeline || [];
  const startTime = parseISO(incident.startTs);

  useEffect(() => {
    if (!isPlaying || timeline.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTimeIndex((prev) => {
        if (prev >= timeline.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed); // Adjust interval based on playback speed

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, timeline.length]);

  useEffect(() => {
    if (timeline[currentTimeIndex]) {
      const currentEntry = timeline[currentTimeIndex];
      const currentTime = parseISO(currentEntry.ts).getTime();
      onTimeChange?.(currentTime);
    }
  }, [currentTimeIndex, timeline, onTimeChange]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTimeIndex(0);
  };

  const handleStepForward = () => {
    if (currentTimeIndex < timeline.length - 1) {
      setCurrentTimeIndex(currentTimeIndex + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentTimeIndex > 0) {
      setCurrentTimeIndex(currentTimeIndex - 1);
    }
  };

  const currentEntry = timeline[currentTimeIndex];
  const currentTime = currentEntry ? parseISO(currentEntry.ts) : startTime;
  const timeOffset = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000 / 60);

  return (
    <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-mono font-semibold text-text-primary">
              INCIDENT REPLAY
            </div>
            <div className="text-xs font-mono text-text-muted">
              {incident.title} - {format(currentTime, 'HH:mm:ss')}
            </div>
          </div>
          <Badge status={isPlaying ? 'ok' : 'warning'}>
            {isPlaying ? 'PLAYING' : 'PAUSED'}
          </Badge>
        </div>

        {/* Timeline Scrubber */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={timeline.length - 1}
            value={currentTimeIndex}
            onChange={(e) => setCurrentTimeIndex(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs font-mono text-text-muted mt-1">
            <span>T+0m</span>
            <span>T+{timeOffset}m</span>
            <span>
              T+
              {timeline.length > 0
                ? Math.floor(
                    (parseISO(timeline[timeline.length - 1].ts).getTime() - startTime.getTime()) /
                      1000 /
                      60
                  )
                : 0}
              m
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button variant="secondary" size="sm" onClick={handleStepBackward} disabled={currentTimeIndex === 0}>
            <SkipBack className="w-3 h-3" />
          </Button>
          {isPlaying ? (
            <Button variant="primary" size="sm" onClick={handlePause}>
              <Pause className="w-3 h-3" />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handlePlay} disabled={currentTimeIndex >= timeline.length - 1}>
              <Play className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStepForward}
            disabled={currentTimeIndex >= timeline.length - 1}
          >
            <SkipForward className="w-3 h-3" />
          </Button>

          {/* Playback Speed */}
          <div className="flex-1 flex items-center justify-end gap-2">
            <span className="text-xs font-mono text-text-muted">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="text-xs font-mono bg-base-800 border border-base-700 rounded px-2 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1x</option>
              <option value={2.0}>2x</option>
              <option value={4.0}>4x</option>
            </select>
          </div>
        </div>

        {/* Current State Info */}
        {currentEntry && (
          <div className="mt-4 p-2 bg-base-800 rounded">
            <div className="text-xs font-mono text-text-muted mb-1">Current State:</div>
            <div className="text-xs font-mono text-text-primary">
              {currentEntry.impactedNodeIds.length} nodes impacted | Confidence: {(currentEntry.confidence * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
