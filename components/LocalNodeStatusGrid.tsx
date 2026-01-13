'use client';

import { LocalNode } from '@/lib/types';
import { format } from 'date-fns';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface LocalNodeStatusGridProps {
  nodes: LocalNode[];
}

export default function LocalNodeStatusGrid({ nodes }: LocalNodeStatusGridProps) {
  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-safety-emerald" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-safety-amber" />;
      case 'degraded':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div
          key={node.nodeId}
          className="p-3 bg-base-900 rounded border border-base-700 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm font-mono text-text-primary">{node.nodeId}</div>
              <div className="text-xs font-mono text-text-muted">{node.region}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-mono text-text-muted">Last Sync</div>
              <div className="text-xs font-mono text-text-secondary">
                {format(new Date(node.lastSyncTs), 'HH:mm:ss')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getHealthIcon(node.health)}
              <span className="text-xs font-mono text-text-primary uppercase">{node.health}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


