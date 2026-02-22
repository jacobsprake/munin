'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { loadPackets } from '@/lib/loadData';
import { HandshakePacket, HandshakeApproval } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CheckCircle2, Download, ArrowLeft } from 'lucide-react';
import TEEStatusPanel from '@/components/TEEStatusPanel';
import ComplianceCertificatePanel from '@/components/ComplianceCertificatePanel';

export default function HandshakeDetailPage() {
  const [packet, setPacket] = useState<HandshakePacket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [operatorId, setOperatorId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function fetchPacket() {
      setLoadError(null);
      try {
        const packets = await loadPackets();
        if (cancelled) return;
        const found = packets.find((p) => p.id === params.id);
        if (found) {
          setPacket(found);
          setIsAuthorized(found.status === 'authorized' || found.status === 'executed');
        } else {
          setLoadError('Packet not found');
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load packet');
          console.error('Failed to load packet:', error);
        }
      }
    }
    fetchPacket();
    return () => { cancelled = true; };
  }, [params.id]);

  const handleAuthorize = async () => {
    if (!operatorId || !passphrase || !packet) return;
    try {
      const response = await fetch('/api/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packetId: packet.id, operatorId, passphrase }),
      });
      if (response.ok) {
        const updated = await loadPackets();
        const updatedPacket = updated.find((p) => p.id === packet.id);
        if (updatedPacket) {
          setPacket(updatedPacket);
          setIsAuthorized(true);
          setShowSignModal(false);
        }
      }
    } catch (error) {
      console.error('Failed to authorize:', error);
    }
  };

  if (loadError) {
    return (
      <CommandShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-safety-amber font-mono">{loadError}</div>
          <Button variant="secondary" onClick={() => router.push('/handshakes')}>
            Back to Handshakes
          </Button>
        </div>
      </CommandShell>
    );
  }

  if (!packet) {
    return (
      <CommandShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-muted font-mono">Loading packet...</div>
        </div>
      </CommandShell>
    );
  }

  const rightPanelContent = (
    <div className="p-4 space-y-4">
      <Card>
        <div className="text-label mono text-text-muted mb-2">ALERT SUMMARY</div>
        <div className="text-body mono text-text-primary">{packet.situationSummary}</div>
      </Card>

      {(packet.outcomeConfidence != null || packet.outcomeSummary) && (
        <Card className="border-safety-cobalt/30 bg-safety-cobalt/5">
          <div className="text-label mono text-text-muted mb-1">OUTCOME CONFIDENCE (pre-simulation)</div>
          {packet.outcomeConfidence != null && (
            <div className="text-data-number mono text-safety-cobalt mb-1">
              {Math.round((packet.outcomeConfidence ?? 0) * 100)}%
            </div>
          )}
          {packet.outcomeSummary && (
            <div className="text-body-mono mono text-text-secondary text-sm">{packet.outcomeSummary}</div>
          )}
        </Card>
      )}

      {packet.status === 'ready' && !isAuthorized && (
        <>
          <Button variant="authorize" onClick={() => setShowSignModal(true)} className="w-full">
            Confirm & Authorize
          </Button>
          <div className="bg-base-800 border border-safety-amber/30 rounded p-3">
            <div className="text-label mono text-safety-amber mb-1">ACTUATOR BOUNDARY</div>
            <div className="text-body-mono mono text-text-secondary">
              No direct OT writes. Human authorization required.
            </div>
          </div>
        </>
      )}

      {isAuthorized && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-safety-emerald" />
            <div className="text-label mono text-safety-emerald">AUTHORIZED</div>
          </div>
          {packet.approvals.some((a: HandshakeApproval) => a.signatureHash) && (
            <div className="text-body-mono mono text-text-secondary">
              Signature: {packet.approvals.find((a: HandshakeApproval) => a.signatureHash)?.signatureHash?.substring(0, 32)}...
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => router.push('/simulation')}>
          Return to Simulation
        </Button>
        <Button variant="ghost">
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Execution Panel"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/handshakes')}
              className="flex items-center gap-2 text-body mono text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Handshakes
            </button>
            <div className="flex items-center gap-3">
              <Badge status={isAuthorized ? 'authorized' : packet.status === 'ready' ? 'active' : 'warning'}>
                {packet.status.toUpperCase()}
              </Badge>
              <div className="text-body-mono mono text-text-muted">
                Created: {format(new Date(packet.createdTs), 'yyyy-MM-dd HH:mm:ss')}Z
              </div>
            </div>
          </div>

          <div className="text-display-title mono font-semibold text-text-primary mb-2">
            {packet.id}
          </div>

          {/* Sections */}
          <Card variant="packet">
            <div className="text-label mono text-text-muted mb-2">SITUATION SUMMARY</div>
            <div className="text-body mono text-text-primary">{packet.situationSummary}</div>
          </Card>

          <Card variant="packet" className="border-safety-cobalt/30">
            <div className="text-label mono text-text-muted mb-2">PROPOSED ACTION</div>
            <div className="text-panel-title mono font-semibold text-text-primary">
              {packet.proposedAction}
            </div>
          </Card>

          {(packet.outcomeConfidence != null || packet.outcomeSummary) && (
            <Card variant="packet" className="border-safety-cobalt/30 bg-safety-cobalt/5">
              <div className="text-label mono text-text-muted mb-2">OUTCOME CONFIDENCE (pre-simulated playbook)</div>
              {packet.outcomeConfidence != null && (
                <div className="text-2xl font-mono font-semibold text-safety-cobalt mb-2">
                  {Math.round((packet.outcomeConfidence ?? 0) * 100)}%
                </div>
              )}
              {packet.outcomeSummary && (
                <div className="text-body-mono mono text-text-secondary">{packet.outcomeSummary}</div>
              )}
            </Card>
          )}

          <Card variant="packet">
            <div className="text-label mono text-text-muted mb-2">REGULATORY BASIS</div>
            <div className="text-body-mono mono text-text-primary bg-base-800 p-3 rounded">
              {packet.regulatoryBasis}
            </div>
          </Card>

          {packet.technicalVerification && (
            <Card variant="packet">
              <div className="text-label mono text-text-muted mb-2">TECHNICAL VERIFICATION</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-body-mono mono">
                  <span className="text-text-secondary">Simulated success probability:</span>
                  <span className="text-safety-emerald">{packet.technicalVerification.simulatedSuccessProb.toFixed(2)}</span>
                </div>
                <div className="text-label mono text-text-muted mb-1">Constraints satisfied:</div>
                <ul className="list-disc list-inside text-body mono text-text-primary space-y-1">
                  {packet.technicalVerification.constraintsSatisfied.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          <Card variant="packet">
            <div className="text-label mono text-text-muted mb-2">EVIDENCE BUNDLE</div>
            <div className="flex flex-wrap gap-2">
              {packet.evidenceRefs.map((ref, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-base-800 border border-base-700 rounded text-body-mono mono text-text-secondary cursor-pointer hover:bg-base-750"
                >
                  {ref}
                </span>
              ))}
            </div>
          </Card>

          <Card variant="packet">
            <div className="text-label mono text-text-muted mb-2">PRECONDITIONS + COORDINATION</div>
            <div className="text-body mono text-text-primary">
              Roles required: {packet.approvals.map((a) => a.role).join(', ')}
            </div>
          </Card>

          <Card variant="packet">
            <div className="text-label mono text-text-muted mb-2">VERIFICATION STEPS</div>
            <div className="space-y-2">
              {packet.technicalVerification?.constraintsSatisfied.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-body mono text-text-primary">
                  <div className="w-4 h-4 border border-base-700 rounded" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="packet">
            <div className="text-label mono text-text-muted mb-2">APPROVALS</div>
            <div className="space-y-2">
              {packet.approvals.map((approval: HandshakeApproval, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-base-800 border border-base-700 rounded"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-body mono text-text-primary">{approval.role}</span>
                    {approval.signedTs ? (
                      <Badge status="authorized">SIGNED</Badge>
                    ) : (
                      <Badge status="warning">PENDING</Badge>
                    )}
                  </div>
                  {approval.signerId && (
                    <div className="text-body-mono mono text-text-secondary mb-1">
                      Operator: {approval.signerId}
                    </div>
                  )}
                  {approval.signedTs && (
                    <div className="text-body-mono mono text-text-secondary mb-1">
                      {format(new Date(approval.signedTs), 'yyyy-MM-dd HH:mm:ss')}Z
                    </div>
                  )}
                  {approval.signatureHash && (
                    <div className="text-body-mono mono text-text-muted text-xs break-all">
                      {approval.signatureHash}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Strategic Features Showcase */}
          <div className="pt-6 border-t border-base-700">
            <div className="text-label mono text-text-muted mb-4">STRATEGIC FEATURES</div>
            
            {/* Feature #1: TEE-Hardened Handshakes */}
            <div className="mb-6">
              <TEEStatusPanel packetTEE={packet.tee} />
            </div>

            {/* Feature #4: Legal Certificate (Liability Shield) */}
            {isAuthorized && packet.approvals.some((a) => a.signerId) && (
              <div className="mb-6">
                <ComplianceCertificatePanel
                  packetId={packet.id}
                  playbookId={packet.playbookId}
                  operatorId={packet.approvals.find((a) => a.signerId)?.signerId}
                  operatorRole={packet.approvals.find((a) => a.signerId)?.role}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showSignModal}
        onClose={() => setShowSignModal(false)}
        title="Digital Signature Required"
      >
        <div className="space-y-4">
          <Input
            label="OPERATOR ID"
            type="text"
            value={operatorId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setOperatorId(e.target.value)}
            placeholder="OP-XXXX"
          />
          <Input
            label="PASSPHRASE"
            type="password"
            value={passphrase}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassphrase(e.target.value)}
            placeholder="••••••••"
          />
          <div className="text-body-mono mono text-text-muted text-xs">
            Signature will append to immutable audit log.
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowSignModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="authorize"
              onClick={handleAuthorize}
              disabled={!operatorId || !passphrase}
              className="flex-1"
            >
              Sign & Authorize
            </Button>
          </div>
        </div>
      </Modal>
    </CommandShell>
  );
}

