'use client';

import { HandshakePacket } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';
import { generateSignatureHash } from '@/lib/hash';

interface HandshakePanelProps {
  packet: HandshakePacket;
  onAuthorize: (packetId: string, operatorId: string, passphrase: string) => Promise<void>;
}

export default function HandshakePanel({ packet, onAuthorize }: HandshakePanelProps) {
  const [showSignModal, setShowSignModal] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [passphrase, setPassphrase] = useState('');

  const handleAuthorize = async () => {
    if (!operatorId || !passphrase) return;
    await onAuthorize(packet.id, operatorId, passphrase);
    setShowSignModal(false);
    setOperatorId('');
    setPassphrase('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'executed':
      case 'verified':
        return 'text-emerald-400 border-emerald-700 bg-emerald-900/30';
      case 'ready':
        return 'text-cobalt-400 border-cobalt-700 bg-cobalt-900/30';
      case 'draft':
      case 'closed':
        return 'text-slate-400 border-slate-700 bg-slate-900/30';
      default:
        return 'text-amber-400 border-amber-700 bg-amber-900/30';
    }
  };

  return (
    <div className="w-96 bg-charcoal-100 border-l border-slate-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-mono font-semibold text-foreground uppercase">
            Execution Packet
          </h2>
          <span
            className={`px-2 py-1 rounded text-xs font-mono border ${getStatusColor(packet.status)}`}
          >
            {packet.status.toUpperCase()}
          </span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          {format(new Date(packet.createdTs), 'yyyy-MM-dd HH:mm:ss')}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-mono mb-1">SITUATION SUMMARY</div>
          <div className="text-sm font-mono text-foreground">{packet.situationSummary}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-mono mb-1">PROPOSED ACTION</div>
          <div className="text-sm font-mono text-foreground">{packet.proposedAction}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-mono mb-1">REGULATORY BASIS</div>
          <div className="text-sm font-mono text-foreground">{packet.regulatoryBasis}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-mono mb-1">PLAYBOOK</div>
          <div className="text-sm font-mono text-foreground">{packet.playbookId}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-mono mb-1">UNCERTAINTY</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${packet.uncertainty.overall * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-foreground">
              {Math.round(packet.uncertainty.overall * 100)}%
            </span>
          </div>
          {packet.uncertainty.notes.length > 0 && (
            <div className="mt-2 space-y-1">
              {packet.uncertainty.notes.map((note, idx) => (
                <div key={idx} className="text-xs text-slate-400 font-mono">
                  • {note}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-slate-500 font-mono mb-1">SCOPE</div>
          <div className="text-xs font-mono text-foreground">
            Regions: {packet.scope.regions.join(', ')}
          </div>
          <div className="text-xs font-mono text-foreground mt-1">
            Nodes: {packet.scope.nodeIds.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 font-mono mb-1">APPROVALS</div>
          <div className="space-y-2">
            {packet.approvals.map((approval, idx) => (
              <div
                key={idx}
                className="p-2 bg-charcoal-50 rounded border border-slate-800 text-xs font-mono"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-foreground">{approval.role}</span>
                  {approval.signedTs ? (
                    <span className="text-emerald-400">SIGNED</span>
                  ) : (
                    <span className="text-slate-500">PENDING</span>
                  )}
                </div>
                {approval.signerId && (
                  <div className="text-slate-400">Operator: {approval.signerId}</div>
                )}
                {approval.signedTs && (
                  <div className="text-slate-400">
                    {format(new Date(approval.signedTs), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                )}
                {approval.signatureHash && (
                  <div className="text-slate-500 text-[10px] mt-1 break-all">
                    {approval.signatureHash.substring(0, 32)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {packet.status === 'ready' && (
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowSignModal(true)}
              className="w-full px-4 py-3 bg-cobalt-900/30 border border-cobalt-700 text-cobalt-400 font-mono text-sm rounded hover:bg-cobalt-900/50 transition-colors glow-cobalt"
            >
              CONFIRM & AUTHORIZE
            </button>
          </div>
        )}
      </div>

      {showSignModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-charcoal-100 border border-slate-700 rounded p-6 w-96">
            <h3 className="text-sm font-mono font-semibold text-foreground mb-4 uppercase">
              Authorization Required
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 font-mono mb-1">
                  OPERATOR ID
                </label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full px-3 py-2 bg-charcoal-50 border border-slate-700 text-foreground font-mono text-sm rounded focus:outline-none focus:border-cobalt-500"
                  placeholder="OP-XXXX"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-mono mb-1">
                  PASSPHRASE
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-3 py-2 bg-charcoal-50 border border-slate-700 text-foreground font-mono text-sm rounded focus:outline-none focus:border-cobalt-500"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSignModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 text-slate-400 font-mono text-sm rounded hover:bg-slate-800 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleAuthorize}
                  disabled={!operatorId || !passphrase}
                  className="flex-1 px-4 py-2 bg-cobalt-900/30 border border-cobalt-700 text-cobalt-400 font-mono text-sm rounded hover:bg-cobalt-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-cobalt"
                >
                  AUTHORIZE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

