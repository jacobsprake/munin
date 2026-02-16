'use client';

import { ReactNode, useState } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { BookOpen, X } from 'lucide-react';

interface TrainingTip {
  id: string;
  title: string;
  content: string;
  component?: string; // Component ID this tip relates to
}

interface TrainingModeProps {
  enabled: boolean;
  tips?: TrainingTip[];
  children: ReactNode;
  onDisable?: () => void;
}

/**
 * Training Mode Component
 * 
 * Overlays explanations and safe sandboxes for new operators.
 * Provides contextual help and prevents dangerous actions in training mode.
 */
export default function TrainingMode({
  enabled,
  tips = [],
  children,
  onDisable,
}: TrainingModeProps) {
  const [currentTip, setCurrentTip] = useState<TrainingTip | null>(tips[0] || null);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());

  if (!enabled) {
    return <>{children}</>;
  }

  const handleDismissTip = (tipId: string) => {
    setDismissedTips((prev) => new Set([...prev, tipId]));
    const nextTip = tips.find((t) => !dismissedTips.has(t.id) && t.id !== tipId);
    setCurrentTip(nextTip || null);
  };

  return (
    <div className="relative">
      {children}

      {/* Training Mode Banner */}
      <div className="fixed top-0 left-0 right-0 bg-safety-amber/20 border-b border-safety-amber/50 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-safety-amber" />
            <div className="text-xs font-mono font-semibold text-safety-amber">
              TRAINING MODE ACTIVE
            </div>
            <Badge status="warning" className="text-[10px]">
              Safe Sandbox
            </Badge>
          </div>
          {onDisable && (
            <button
              onClick={onDisable}
              className="text-xs font-mono text-text-muted hover:text-text-primary"
            >
              Exit Training Mode
            </button>
          )}
        </div>
      </div>

      {/* Training Tips */}
      {currentTip && !dismissedTips.has(currentTip.id) && (
        <Card className="fixed bottom-4 left-4 w-80 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-mono font-semibold text-text-primary">
                TRAINING TIP
              </div>
              <button
                onClick={() => handleDismissTip(currentTip.id)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-xs font-mono text-text-primary mb-1">
              {currentTip.title}
            </div>
            <div className="text-xs font-mono text-text-muted">
              {currentTip.content}
            </div>
          </div>
        </Card>
      )}

      {/* Safe Sandbox Overlay */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="absolute inset-0 bg-base-900/5 border-4 border-dashed border-safety-amber/30" />
      </div>
    </div>
  );
}

/**
 * Hook to check if training mode is enabled
 */
export function useTrainingMode(): boolean {
  // In a real implementation, would check from context or store
  return false; // Default to false
}
