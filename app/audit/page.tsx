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
}

export default function AuditPage() {
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [chainIntact, setChainIntact] = useState(true);
  const [lastVerified, setLastVerified] = useState<Date>(new Date());
  const { warRoomMode } = useAppStore();

  useEffect(() => {
    // Mock audit log data
    const mockLog: AuditLogEntry[] = [
      {
        timestamp: '2026-01-07T01:13:22Z',
        actor: 'OP-0701',
        action: 'AUTHORIZE',
        packetId: 'AH-0701-00042',
        hash: '7c2e8f9a1b3d4e5f6a7b8c9d0e1f2a3b',
        prevHash: '6b1d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
      },
      {
        timestamp: '2026-01-07T01:12:15Z',
        actor: 'OP-0701',
        action: 'CREATE',
        packetId: 'AH-0701-00041',
        hash: '6b1d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
        prevHash: '5a0c6d7e8f9a0b1c2d3e4f5a6b7c8d9',
      },
    ];
    setAuditLog(mockLog);
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
            {auditLog.map((entry, idx) => (
              <div
                key={idx}
                className="bg-base-850 border border-base-700 rounded p-4 font-mono text-body-mono"
              >
                <div className="flex items-center gap-4 text-text-primary">
                  <span className="text-text-muted">{format(new Date(entry.timestamp), 'yyyy-MM-dd HH:mm:ss')}Z</span>
                  <span className="text-text-secondary">|</span>
                  <span className="text-safety-cobalt">{entry.actor}</span>
                  <span className="text-text-secondary">|</span>
                  <span className="text-text-primary">{entry.action}</span>
                  <span className="text-text-secondary">|</span>
                  <span className="text-text-primary">{entry.packetId}</span>
                  <span className="text-text-secondary">|</span>
                  <span className="text-text-muted">{entry.hash.substring(0, 16)}...</span>
                  <span className="text-text-secondary">|</span>
                  <span className="text-text-muted">prev: {entry.prevHash.substring(0, 16)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CommandShell>
  );
}

