'use client';

import { CheckCircle, Shield, AlertTriangle } from 'lucide-react';

interface AuditIntegrityIndicatorProps {
  verified: boolean;
  lastAuditHash: string;
  previousAuditHash?: string;
}

export default function AuditIntegrityIndicator({
  verified,
  lastAuditHash,
  previousAuditHash,
}: AuditIntegrityIndicatorProps) {
  return (
    <div className="p-3 bg-base-900 rounded border border-base-700">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono text-text-muted uppercase">Audit Integrity</div>
        {verified ? (
          <div className="flex items-center gap-1 text-safety-emerald">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs font-mono">VERIFIED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-safety-amber">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-mono">PENDING</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div>
          <div className="text-xs font-mono text-text-muted mb-1">Last Audit Hash</div>
          <div className="text-xs font-mono text-text-primary break-all">
            {lastAuditHash.substring(0, 32)}...
          </div>
        </div>
        {previousAuditHash && (
          <div>
            <div className="text-xs font-mono text-text-muted mb-1">Previous Hash</div>
            <div className="text-xs font-mono text-text-secondary break-all">
              {previousAuditHash.substring(0, 32)}...
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-base-700">
        <div className="text-xs font-mono text-text-muted">
          Append-only log verified
        </div>
      </div>
    </div>
  );
}


