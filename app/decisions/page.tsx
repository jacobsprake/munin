'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Search, Filter, CheckCircle2, Clock, XCircle, Play } from 'lucide-react';

interface Decision {
  decision_id: string;
  incident_id: string;
  playbook_id: string;
  step_id?: string;
  status: 'PENDING' | 'AUTHORIZED' | 'REJECTED' | 'EXECUTED';
  policy_json: {
    threshold: number;
    required: number;
    signers: string[];
  };
  created_at: string;
  authorized_at?: string;
  previous_decision_hash?: string;
  signature_count: number;
}

interface DecisionWithSignatures extends Decision {
  signatures?: Array<{
    id: string;
    signer_id: string;
    signed_at: string;
    key_id: string;
  }>;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<DecisionWithSignatures | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchDecisions() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        const res = await fetch(`/api/decisions?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setDecisions(data.decisions || []);
        }
      } catch (error) {
        console.error('Failed to load decisions:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDecisions();
    const interval = setInterval(fetchDecisions, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleSelectDecision = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/decisions?id=${decisionId}`);
      const data = await res.json();
      if (data.success && data.decision) {
        setSelectedDecision(data.decision);
      }
    } catch (error) {
      console.error('Failed to load decision details:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'ok' | 'active' | 'warning' | 'authorized'> = {
      AUTHORIZED: 'authorized',
      EXECUTED: 'authorized',
      PENDING: 'active',
      REJECTED: 'warning',
    };
    return statusMap[status] || 'warning';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AUTHORIZED':
      case 'EXECUTED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'PENDING':
        return <Clock className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    if (searchQuery && !d.decision_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !d.incident_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !d.playbook_id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getSignatureProgress = (decision: Decision) => {
    const { signature_count, policy_json } = decision;
    return `${signature_count}/${policy_json.threshold}`;
  };

  const tableRows = filteredDecisions.map((decision) => [
    <span key="id" className="text-body-mono mono text-text-primary">{decision.decision_id.slice(0, 12)}...</span>,
    <span key="incident" className="text-body mono text-text-secondary">{decision.incident_id}</span>,
    <span key="playbook" className="text-body mono text-text-secondary">{decision.playbook_id}</span>,
    <Badge key="status" status={getStatusBadge(decision.status)}>
      <span className="flex items-center gap-1">
        {getStatusIcon(decision.status)}
        {decision.status}
      </span>
    </Badge>,
    <span key="signatures" className="text-body-mono mono text-text-secondary">
      {getSignatureProgress(decision)}
    </span>,
    <span key="timestamp" className="text-body-mono mono text-text-secondary">
      {format(new Date(decision.created_at), 'yyyy-MM-dd HH:mm')}
    </span>,
  ]);

  const rightPanelContent = selectedDecision ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">DECISION ID</div>
        <div className="text-body-mono mono text-text-primary">{selectedDecision.decision_id}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">INCIDENT ID</div>
        <div className="text-body mono text-text-primary">{selectedDecision.incident_id}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">PLAYBOOK</div>
        <div className="text-body mono text-text-primary">{selectedDecision.playbook_id}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">STATUS</div>
        <Badge status={getStatusBadge(selectedDecision.status)}>
          <span className="flex items-center gap-1">
            {getStatusIcon(selectedDecision.status)}
            {selectedDecision.status}
          </span>
        </Badge>
      </div>
      <Card>
        <div className="text-label mono text-text-muted mb-2">SIGNATURE PROGRESS</div>
        <div className="space-y-2">
          <div className="flex justify-between text-body mono">
            <span className="text-text-secondary">Signatures:</span>
            <span className="text-text-primary">
              {selectedDecision.signature_count || 0} / {selectedDecision.policy_json.threshold}
            </span>
          </div>
          <div className="flex justify-between text-body mono">
            <span className="text-text-secondary">Required:</span>
            <span className="text-text-primary">{selectedDecision.policy_json.required}</span>
          </div>
          <div className="w-full bg-base-800 rounded h-2 mt-2">
            <div
              className="bg-safety-emerald h-2 rounded"
              style={{
                width: `${Math.min(100, ((selectedDecision.signature_count || 0) / selectedDecision.policy_json.threshold) * 100)}%`
              }}
            />
          </div>
        </div>
      </Card>
      {selectedDecision.signatures && selectedDecision.signatures.length > 0 && (
        <Card>
          <div className="text-label mono text-text-muted mb-2">SIGNATURES</div>
          <div className="space-y-2">
            {selectedDecision.signatures.map((sig) => (
              <div key={sig.id} className="flex justify-between text-body mono">
                <span className="text-text-secondary">{sig.signer_id}</span>
                <span className="text-text-muted">
                  {format(new Date(sig.signed_at), 'HH:mm:ss')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => router.push(`/simulation?incident=${selectedDecision.incident_id}`)}
        >
          View Incident
        </Button>
        {selectedDecision.status === 'PENDING' && (
          <Button
            variant="primary"
            onClick={() => router.push(`/decisions/${selectedDecision.decision_id}/sign`)}
          >
            Sign Decision
          </Button>
        )}
      </div>
      <Card>
        <div className="text-label mono text-text-muted mb-2">POLICY</div>
        <div className="space-y-1 text-body mono text-text-secondary">
          <div>Threshold: {selectedDecision.policy_json.threshold}</div>
          <div>Required: {selectedDecision.policy_json.required}</div>
          <div>Signers: {selectedDecision.policy_json.signers.join(', ')}</div>
        </div>
      </Card>
      {selectedDecision.authorized_at && (
        <div>
          <div className="text-label mono text-text-muted mb-1">AUTHORIZED AT</div>
          <div className="text-body-mono mono text-text-primary">
            {format(new Date(selectedDecision.authorized_at), 'yyyy-MM-dd HH:mm:ss')}
          </div>
        </div>
      )}
      <div>
        <div className="text-label mono text-text-muted mb-1">CREATED AT</div>
        <div className="text-body-mono mono text-text-primary">
          {format(new Date(selectedDecision.created_at), 'yyyy-MM-dd HH:mm:ss')}
        </div>
      </div>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select a decision to view details
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Decision Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-base-700 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-base-800 border border-base-700 rounded px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search decisions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-body text-text-primary placeholder:text-text-muted focus:outline-none mono"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXECUTED">Executed</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading decisions...</div>
          ) : filteredDecisions.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No decisions found</div>
          ) : (
            <Table
              headers={['Decision ID', 'Incident', 'Playbook', 'Status', 'Signatures', 'Created']}
              rows={tableRows}
              onRowClick={(index) => {
                const decision = filteredDecisions[index];
                handleSelectDecision(decision.decision_id);
              }}
              selectedRowIndex={selectedDecision ? filteredDecisions.findIndex((d) => d.decision_id === selectedDecision.decision_id) : undefined}
            />
          )}
        </div>
      </div>
    </CommandShell>
  );
}
