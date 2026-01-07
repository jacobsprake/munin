'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { AlertTriangle, Zap } from 'lucide-react';

interface ShadowLink {
  id: string;
  source: { id: string; label: string };
  target: { id: string; label: string };
  correlation: number;
  correlationPercent: number;
  lagSeconds: number;
  message: string;
}

export default function ShadowLinkDiscovery() {
  const [isRunning, setIsRunning] = useState(false);
  const [shadowLink, setShadowLink] = useState<ShadowLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTemporalCorrelation = async () => {
    setIsRunning(true);
    setError(null);
    setShadowLink(null);

    try {
      const response = await fetch('/api/shadow-links/discover', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to discover shadow links');
      }

      setShadowLink(data.shadowLink);
    } catch (err: any) {
      setError(err.message || 'Failed to run temporal correlation');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-label mono text-text-primary mb-1">
            SHADOW LINK DISCOVERY
          </div>
          <div className="text-body-mono mono text-text-muted">
            Temporal correlation analysis to detect hidden dependencies
          </div>
        </div>
        <Button
          onClick={runTemporalCorrelation}
          disabled={isRunning}
          variant="primary"
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              RUN TEMPORAL CORRELATION
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-safety-amber/10 border border-safety-amber/30 rounded">
          <div className="flex items-center gap-2 text-safety-amber text-body-mono mono">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {shadowLink && (
        <div className="p-4 bg-safety-cobalt/10 border border-safety-cobalt/30 rounded space-y-3">
          <div className="flex items-center gap-2 text-safety-cobalt text-label mono">
            <AlertTriangle className="w-4 h-4" />
            SHADOW LINK DETECTED
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-label mono text-text-muted mb-1">SOURCE</div>
                <div className="text-body-mono mono text-text-primary">
                  {shadowLink.source.label}
                </div>
              </div>
              <div className="text-text-muted">→</div>
              <div className="flex-1">
                <div className="text-label mono text-text-muted mb-1">TARGET</div>
                <div className="text-body-mono mono text-text-primary">
                  {shadowLink.target.label}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-base-700">
              <div>
                <div className="text-label mono text-text-muted mb-1">CORRELATION</div>
                <div className="text-data-number mono text-safety-cobalt">
                  {shadowLink.correlationPercent}%
                </div>
              </div>
              <div>
                <div className="text-label mono text-text-muted mb-1">LAG</div>
                <div className="text-data-number mono text-text-primary">
                  {shadowLink.lagSeconds.toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-label mono text-text-muted mb-1">STATUS</div>
                <div className="text-body-mono mono text-safety-amber">
                  NOT IN REGISTRY
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-base-700">
              <div className="text-body mono text-text-secondary">
                {shadowLink.message}
              </div>
            </div>

            {/* Correlation Tooltip Info */}
            <div className="mt-3 p-3 bg-base-800 rounded border border-base-700">
              <div className="text-body-mono mono text-text-secondary text-xs">
                <span className="text-safety-cobalt">Correlation {shadowLink.correlation.toFixed(2)}:</span>{' '}
                Physical dependency inferred from 2024 SCADA logs. Dotted red line will appear on graph.
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

