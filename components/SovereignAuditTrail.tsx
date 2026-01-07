'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface AuditBlock {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  prevHash: string;
  rootHash: string;
  packetId?: string;
}

export default function SovereignAuditTrail() {
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Mock audit trail data - in production, this would come from the Merkle tree ledger
    const mockBlocks: AuditBlock[] = [
      {
        id: 'block-001',
        timestamp: new Date().toISOString(),
        action: 'AUTHORIZE',
        actor: 'OP-0701',
        prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
        rootHash: '7c2e8f9a1b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
        packetId: 'AH-0701-00042',
      },
      {
        id: 'block-002',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        action: 'CREATE',
        actor: 'OP-0701',
        prevHash: '6b1d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
        rootHash: '6b1d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
        packetId: 'AH-0701-00041',
      },
      {
        id: 'block-003',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        action: 'VERIFY',
        actor: 'SYSTEM',
        prevHash: '5a0c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
        rootHash: '5a0c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
      },
    ];
    setBlocks(mockBlocks);
  }, []);

  return (
    <Card className={`p-4 transition-all ${isExpanded ? 'w-96' : 'w-80'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-safety-cobalt" />
          <div className="text-label mono text-text-primary">
            SOVEREIGN AUDIT TRAIL
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-base-800 rounded transition-colors"
        >
          <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className="p-3 bg-base-800 rounded border border-base-700 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-label mono text-text-primary">
                BLOCK #{blocks.length - idx}
              </div>
              <div className="text-body-mono mono text-text-muted text-xs">
                {format(new Date(block.timestamp), 'HH:mm:ss')}
              </div>
            </div>

            <div className="space-y-1 text-body-mono mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Action:</span>
                <span className="text-text-primary">{block.action}</span>
                {block.packetId && (
                  <span className="text-safety-cobalt">({block.packetId})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Actor:</span>
                <span className="text-text-primary">{block.actor}</span>
              </div>
            </div>

            {isExpanded && (
              <>
                <div className="pt-2 border-t border-base-700 space-y-1">
                  <div className="text-body-mono mono text-xs">
                    <div className="text-text-muted mb-1">Prev_Hash:</div>
                    <div className="text-text-secondary font-mono break-all">
                      {block.prevHash.substring(0, 32)}...
                    </div>
                  </div>
                  <div className="text-body-mono mono text-xs">
                    <div className="text-text-muted mb-1">Root_Hash:</div>
                    <div className="text-safety-cobalt font-mono break-all">
                      {block.rootHash}
                    </div>
                  </div>
                </div>
                {idx < blocks.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-4 bg-base-700" />
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-base-700">
        <div className="text-body-mono mono text-text-muted text-xs">
          Immutable append-only ledger. Each block cryptographically linked to previous.
        </div>
      </div>
    </Card>
  );
}

