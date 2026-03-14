'use client';

import { diffPackets } from '@/lib/packet/diff';
import type { AuthorisationPacket } from '@/lib/packet/types';
import Card from '@/components/ui/Card';
import { ArrowDown, ArrowUp, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface PacketDiffPanelProps {
  current: AuthorisationPacket;
  previous: AuthorisationPacket;
  onClose?: () => void;
}

/**
 * Government-grade packet diff viewer.
 * Renders structured diff from lib/packet/diff.ts per docs/ux/authorisation_console.md.
 */
export default function PacketDiffPanel({ current, previous, onClose }: PacketDiffPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const diff = diffPackets(previous, current);

  return (
    <Card className="border-safety-cobalt/30 bg-base-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <span className="text-label mono text-text-muted uppercase tracking-wider">
          What Changed (v{previous.version} → v{current.version})
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-base-700">
          {/* Summary bullets */}
          {diff.summary.length > 0 && (
            <div className="space-y-1">
              {diff.summary.map((s, i) => (
                <div key={i} className="text-body-mono mono text-text-secondary flex items-start gap-2">
                  <span className="text-safety-cobalt">•</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Risk delta */}
          <div>
            <div className="text-[11px] font-mono text-text-muted uppercase mb-2">Confidence</div>
            <div className="flex items-center gap-2">
              <span className="text-body-mono mono">
                {(diff.riskDelta.confidenceBefore * 100).toFixed(0)}%
              </span>
              {diff.riskDelta.direction === 'improved' && (
                <ArrowUp className="w-4 h-4 text-safety-emerald" />
              )}
              {diff.riskDelta.direction === 'degraded' && (
                <ArrowDown className="w-4 h-4 text-safety-amber" />
              )}
              {diff.riskDelta.direction === 'unchanged' && (
                <Minus className="w-4 h-4 text-text-muted" />
              )}
              <span className="text-body-mono mono">
                {(diff.riskDelta.confidenceAfter * 100).toFixed(0)}%
              </span>
              <span className={`text-[11px] font-mono ${
                diff.riskDelta.direction === 'improved' ? 'text-safety-emerald' :
                diff.riskDelta.direction === 'degraded' ? 'text-safety-amber' : 'text-text-muted'
              }`}>
                ({diff.riskDelta.direction})
              </span>
            </div>
          </div>

          {/* Constraints added/failed */}
          {(diff.riskDelta.constraintsAdded.length > 0 || diff.riskDelta.failedConstraintsAdded.length > 0 ||
            diff.riskDelta.failedConstraintsRemoved.length > 0) && (
            <div>
              <div className="text-[11px] font-mono text-text-muted uppercase mb-2">Constraints</div>
              <div className="space-y-1">
                {diff.riskDelta.constraintsAdded.map((c, i) => (
                  <div key={`add-${i}`} className="text-body-mono mono text-safety-emerald">
                    + {c}
                  </div>
                ))}
                {diff.riskDelta.failedConstraintsAdded.map((c, i) => (
                  <div key={`fail-${i}`} className="text-body-mono mono text-safety-amber">
                    + FAILED: {c}
                  </div>
                ))}
                {diff.riskDelta.failedConstraintsRemoved.map((c, i) => (
                  <div key={`rem-${i}`} className="text-body-mono mono text-safety-emerald">
                    − No longer failing: {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scope delta */}
          {(diff.scopeDelta.nodesAdded.length > 0 || diff.scopeDelta.nodesRemoved.length > 0) && (
            <div>
              <div className="text-[11px] font-mono text-text-muted uppercase mb-2">Scope</div>
              <div className="space-y-1">
                {diff.scopeDelta.nodesAdded.map((n) => (
                  <div key={n} className="text-body-mono mono text-safety-emerald">+ {n}</div>
                ))}
                {diff.scopeDelta.nodesRemoved.map((n) => (
                  <div key={n} className="text-body-mono mono text-safety-amber">− {n}</div>
                ))}
              </div>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-[11px] font-mono text-text-muted hover:text-text-secondary"
            >
              Hide diff
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
