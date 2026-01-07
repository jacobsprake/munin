'use client';

import { Node, Edge, EvidenceWindow } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';

interface EvidencePanelProps {
  node?: Node | null;
  edge?: Edge | null;
  evidence?: EvidenceWindow[];
}

export default function EvidencePanel({ node, edge, evidence = [] }: EvidencePanelProps) {
  const { setSelectedNode, setSelectedEdge } = useAppStore();

  const relevantEvidence = edge
    ? evidence.filter((e) => e.edgeId === edge.id)
    : [];

  return (
    <div className="w-96 bg-charcoal-100 border-l border-slate-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-mono font-semibold text-foreground uppercase">
          {node ? 'Node Detail' : edge ? 'Edge Evidence' : 'Sensor Health'}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {node && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">LABEL</div>
              <div className="text-sm font-mono text-foreground">{node.label}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">SECTOR</div>
              <div className="text-sm font-mono text-foreground uppercase">{node.sector}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">KIND</div>
              <div className="text-sm font-mono text-foreground">{node.kind}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">REGION</div>
              <div className="text-sm font-mono text-foreground">{node.region}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">HEALTH</div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    node.health.status === 'ok'
                      ? 'bg-emerald-400'
                      : node.health.status === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-mono text-foreground">
                  {node.health.status.toUpperCase()} ({Math.round(node.health.score * 100)}%)
                </span>
              </div>
            </div>
            {node.lat && node.lon && (
              <div>
                <div className="text-xs text-slate-500 font-mono mb-1">COORDINATES</div>
                <div className="text-sm font-mono text-foreground">
                  {node.lat.toFixed(4)}, {node.lon.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        )}

        {edge && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">CONFIDENCE</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cobalt-500"
                    style={{ width: `${edge.confidenceScore * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono text-foreground">
                  {Math.round(edge.confidenceScore * 100)}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">INFERRED LAG</div>
              <div className="text-sm font-mono text-foreground">{edge.inferredLagSeconds}s</div>
            </div>
            {edge.condition && (
              <div>
                <div className="text-xs text-slate-500 font-mono mb-1">CONDITION</div>
                <div className="text-sm font-mono text-foreground">{edge.condition}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-500 font-mono mb-1">EVIDENCE WINDOWS</div>
              <div className="text-sm font-mono text-slate-400">
                {relevantEvidence.length} supporting windows
              </div>
            </div>
            {relevantEvidence.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {relevantEvidence.map((ev) => (
                  <div key={ev.id} className="p-2 bg-charcoal-50 rounded border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono mb-1">
                      {format(new Date(ev.startTs), 'MMM dd, HH:mm')} -{' '}
                      {format(new Date(ev.endTs), 'HH:mm')}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500">Correlation:</span>
                      <span className="text-xs font-mono text-foreground">
                        {ev.correlation.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Robustness:</span>
                      <span className="text-xs font-mono text-foreground">
                        {Math.round(ev.robustness * 100)}%
                      </span>
                    </div>
                    {ev.notes && (
                      <div className="text-xs text-slate-400 mt-1">{ev.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

