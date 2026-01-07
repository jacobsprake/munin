'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import { Play, Pause, SkipForward } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function CausalInferenceSimulator() {
  const [timeOffset, setTimeOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleTimeChange = (value: number) => {
    setTimeOffset(value);
  };

  const handleNodeFailure = (nodeId: string) => {
    setSelectedNode(nodeId);
    // In production, this would trigger cascade simulation
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Play className="w-5 h-5 text-safety-cobalt" />
        <div>
          <div className="text-label mono text-text-primary">
            CAUSAL INFERENCE SIMULATOR
          </div>
          <div className="text-body-mono mono text-text-muted">
            "What-If" Mode
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-label mono text-text-muted text-xs">
              TIME OFFSET
            </div>
            <div className="text-body-mono mono text-text-primary">
              {timeOffset > 0 ? `+${timeOffset}h` : timeOffset === 0 ? 'NOW' : `${timeOffset}h`}
            </div>
          </div>
          <input
            type="range"
            min="-24"
            max="72"
            value={timeOffset}
            onChange={(e) => handleTimeChange(Number(e.target.value))}
            className="w-full h-2 bg-base-800 rounded-lg appearance-none cursor-pointer accent-safety-cobalt"
          />
          <div className="flex justify-between text-body-mono mono text-text-muted text-xs mt-1">
            <span>-24h</span>
            <span>0h</span>
            <span>+72h</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            variant="secondary"
            className="flex-1"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                PAUSE
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                PLAY
              </>
            )}
          </Button>
          <Button
            onClick={() => setTimeOffset(0)}
            variant="ghost"
          >
            <SkipForward className="w-4 h-4" />
            RESET
          </Button>
        </div>
      </div>

      {timeOffset !== 0 && (
        <div className="p-3 bg-safety-amber/10 border border-safety-amber/30 rounded">
          <div className="text-body-mono mono text-text-secondary text-xs">
            <span className="text-safety-amber">Ghost Nodes:</span> Future state visualization active.
            Drag slider to see cascade effects from node failures.
          </div>
        </div>
      )}

      <div className="p-3 bg-base-800 rounded border border-base-700">
        <div className="text-body-mono mono text-text-secondary text-xs">
          Simulate future states and manually fail nodes to observe cascade effects through the dependency graph.
        </div>
      </div>
    </Card>
  );
}

