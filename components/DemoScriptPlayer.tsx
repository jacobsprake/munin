'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DemoScriptPlayer as DemoPlayer, getDemoScript } from '@/lib/demoScript';
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';

interface DemoScriptPlayerProps {
  scriptId: string;
  onClose?: () => void;
}

export default function DemoScriptPlayer({ scriptId, onClose }: DemoScriptPlayerProps) {
  const [player, setPlayer] = useState<DemoPlayer | null>(null);
  const [currentStep, setCurrentStep] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [script, setScript] = useState(getDemoScript(scriptId));

  useEffect(() => {
    if (!script) return;

    const demoPlayer = new DemoPlayer(scriptId);
    demoPlayer.setOnStepChange((step) => {
      setCurrentStep(step);
    });
    demoPlayer.setOnComplete(() => {
      setIsPlaying(false);
    });

    setPlayer(demoPlayer);
    setCurrentStep(script.steps[0] || null);
  }, [scriptId, script]);

  const handlePlay = () => {
    if (player) {
      setIsPlaying(true);
      player.play();
    }
  };

  const handlePause = () => {
    if (player) {
      player.pause();
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (player) {
      player.next();
    }
  };

  const handlePrevious = () => {
    if (player) {
      player.previous();
    }
  };

  if (!script) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground">
          Demo script '{scriptId}' not found
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-mono font-semibold text-text-primary">
              DEMO SCRIPT MODE
            </div>
            <div className="text-xs font-mono text-text-muted">{script.name}</div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {currentStep && (
          <div className="mb-4">
            <div className="text-xs font-mono font-semibold text-text-primary mb-1">
              {currentStep.title}
            </div>
            <div className="text-xs font-mono text-text-muted mb-2">
              {currentStep.description}
            </div>
            {currentStep.cue && (
              <div className="p-2 bg-base-800 rounded border border-safety-cobalt/50">
                <div className="text-xs font-mono text-safety-cobalt">
                  💡 {currentStep.cue}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevious}
            disabled={!player || isPlaying}
          >
            <SkipBack className="w-3 h-3" />
          </Button>
          {isPlaying ? (
            <Button variant="secondary" size="sm" onClick={handlePause}>
              <Pause className="w-3 h-3" />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handlePlay}>
              <Play className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNext}
            disabled={!player || isPlaying}
          >
            <SkipForward className="w-3 h-3" />
          </Button>
          <div className="flex-1 text-xs font-mono text-text-muted text-right">
            Step {script.steps.findIndex((s) => s.id === currentStep?.id) + 1} / {script.steps.length}
          </div>
        </div>
      </div>
    </Card>
  );
}
