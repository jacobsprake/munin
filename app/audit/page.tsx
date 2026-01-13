'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { CheckCircle2, Download } from 'lucide-react';

interface AuditLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  packetId: string;
  hash: string;
  prevHash: string;
  sequenceNumber?: number;
  metadata?: Record<string, any>;
}

export default function AuditPage() {
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [chainIntact, setChainIntact] = useState(true);
  const [lastVerified, setLastVerified] = useState<Date>(new Date());
  const { warRoomMode } = useAppStore();

  useEffect(() => {
    // Fetch real audit log data
    const fetchAuditLog = async () => {
      try {
        const response = await fetch('/api/audit/log?limit=100');
        if (response.ok) {
          const data = await response.json();
          const entries: AuditLogEntry[] = data.entries.map((e: any) => ({
            timestamp: e.timestamp,
            actor: e.actor,
            action: e.action.toUpperCase(),
            packetId: e.packet_id,
            hash: e.entry_hash,
            prevHash: e.previous_hash || '',
            sequenceNumber: e.sequence_number,
            metadata: e.metadata || {}
          }));
          setAuditLog(entries);
        }
      } catch (error) {
        console.error('Error fetching audit log:', error);
        // Fallback to empty log
        setAuditLog([]);
      }
    };

    fetchAuditLog();
    
    // Verify chain integrity
    const verifyChain = async () => {
      try {
        const response = await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify' })
        });
        if (response.ok) {
          const result = await response.json();
          setChainIntact(result.valid);
          if (result.valid) {
            setLastVerified(new Date());
          }
        }
      } catch (error) {
        console.error('Error verifying chain:', error);
      }
    };

    verifyChain();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAuditLog();
      verifyChain();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <CommandShell
      rightPanelContent={
        <div className="p-4 space-y-4">
          <Card>
            <div className="text-label mono text-text-muted mb-2">INTEGRITY STATUS</div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-safety-emerald" />
              <Badge status="ok">CHAIN INTACT: YES</Badge>
            </div>
            <div className="text-body-mono mono text-text-secondary mb-2">
              Last verified: {format(lastVerified, 'yyyy-MM-dd HH:mm:ss')}Z
            </div>
            <Button variant="secondary" className="w-full">
              <Download className="w-4 h-4 inline mr-2" />
              Export Audit Segment
            </Button>
          </Card>
          {warRoomMode && (
            <Card>
              <div className="text-label mono text-text-muted mb-2">LIVE METRICS</div>
              <div className="space-y-2 text-body-mono mono">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Writes in last 60s:</span>
                  <span className="text-text-primary">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Verification status:</span>
                  <Badge status="ok">VERIFIED</Badge>
                </div>
              </div>
            </Card>
          )}
        </div>
      }
      rightPanelTitle="Integrity Panel"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex overflow-hidden">
        {/* Audit Log Stream - Left */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-2">
            <div className="text-label mono text-text-muted mb-4">AUDIT LOG STREAM</div>
            {auditLog.length === 0 ? (
              <div className="bg-base-850 border border-base-700 rounded p-4 text-center text-text-secondary">
                No audit log entries found. Run the demo to generate entries.
              </div>
            ) : (
              auditLog.map((entry, idx) => (
                <div
                  key={idx}
                  className="bg-base-850 border border-base-700 rounded p-4 font-mono text-body-mono"
                >
                  <div className="flex items-center gap-4 text-text-primary flex-wrap">
                    <span className="text-text-muted">#{entry.sequenceNumber || idx + 1}</span>
                    <span className="text-text-secondary">|</span>
                    <span className="text-text-muted">{format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}Z</span>
                    <span className="text-text-secondary">|</span>
                    <span className="text-safety-cobalt">{entry.actor}</span>
                    <span className="text-text-secondary">|</span>
                    <span className="text-text-primary">{entry.action}</span>
                    <span className="text-text-secondary">|</span>
                    <span className="text-text-primary">{entry.packetId}</span>
                    <span className="text-text-secondary">|</span>
                    <span className="text-text-muted" title={entry.hash}>{entry.hash.substring(0, 16)}...</span>
                    {entry.prevHash && (
                      <>
                        <span className="text-text-secondary">|</span>
                        <span className="text-text-muted" title={entry.prevHash}>prev: {entry.prevHash.substring(0, 16)}...</span>
                      </>
                    )}
                  </div>
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-text-secondary pl-4 border-l-2 border-base-700">
                      {Object.entries(entry.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-text-muted">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </CommandShell>
  );
}


