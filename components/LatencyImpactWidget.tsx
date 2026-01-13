'use client';

import { Clock, AlertCircle } from 'lucide-react';

interface LatencyImpactWidgetProps {
  timeToImpact?: number; // seconds
}

export default function LatencyImpactWidget({ timeToImpact }: LatencyImpactWidgetProps) {
  const beforeMuninLatency = 4 * 60 * 60; // 4 hours in seconds
  const afterMuninLatency = 5; // 5 seconds

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const beforeSucceeds = timeToImpact ? timeToImpact > beforeMuninLatency : false;
  const afterSucceeds = timeToImpact ? timeToImpact > afterMuninLatency : true;

  return (
    <div className="bg-base-900 border border-base-700 rounded p-4 space-y-4">
      <div className="text-xs font-mono text-text-secondary uppercase mb-3">
        Latency Impact Comparison
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-text-secondary">Before Munin</span>
            <span className="text-sm font-mono text-text-primary">{formatTime(beforeMuninLatency)}</span>
          </div>
          <div className="space-y-1 text-xs font-mono text-text-muted pl-4">
            <div>1. Incident detection</div>
            <div>2. Operator notification</div>
            <div>3. Cross-sector coordination calls</div>
            <div>4. Regulatory approval requests</div>
            <div>5. Manual verification</div>
            <div>6. Action authorization</div>
          </div>
          {timeToImpact && (
            <div className={`mt-2 flex items-center gap-2 text-xs font-mono ${
              beforeSucceeds ? 'text-safety-emerald' : 'text-red-500'
            }`}>
              {beforeSucceeds ? '✓' : <AlertCircle className="w-3 h-3" />}
              <span>{beforeSucceeds ? 'Would succeed' : 'Would fail'}</span>
            </div>
          )}
        </div>
        
        <div className="border-t border-base-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-mono text-safety-cobalt">After Munin</span>
            <span className="text-sm font-mono text-safety-cobalt">{formatTime(afterMuninLatency)}</span>
          </div>
          <div className="space-y-1 text-xs font-mono text-text-muted pl-4">
            <div>1. Pre-validated playbook selection</div>
            <div>2. Authoritative handshake generation</div>
            <div>3. Operator signature</div>
          </div>
          {timeToImpact && (
            <div className={`mt-2 flex items-center gap-2 text-xs font-mono ${
              afterSucceeds ? 'text-safety-emerald' : 'text-red-500'
            }`}>
              {afterSucceeds ? '✓' : <AlertCircle className="w-3 h-3" />}
              <span>{afterSucceeds ? 'Would succeed' : 'Would fail'}</span>
            </div>
          )}
        </div>
      </div>
      
      {timeToImpact && (
        <div className="pt-3 border-t border-base-700">
          <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
            <Clock className="w-3 h-3" />
            <span>Time to Impact: {formatTime(timeToImpact)}</span>
          </div>
        </div>
      )}
    </div>
  );
}


