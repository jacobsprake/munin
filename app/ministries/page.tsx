'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { format } from 'date-fns';
import {
  Search,
  Plus,
  RefreshCw,
  Shield,
  CheckCircle2,
} from 'lucide-react';

interface Ministry {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  jurisdiction: string;
  contact_name?: string;
  contact_role?: string;
  public_key?: string;
  key_id?: string;
  quorumPolicy?: { threshold?: number; required?: number };
  created_at: string;
  updated_at: string;
}

const MINISTRY_TYPES = [
  'government',
  'military',
  'regulatory',
  'emergency_services',
  'utility',
] as const;

const WEDGE_MINISTRIES = [
  { name: 'Environment Agency', code: 'EA', type: 'government' as const },
  { name: 'National Grid ESO', code: 'NGESO', type: 'utility' as const },
  { name: 'Ministry of Defence', code: 'MOD', type: 'military' as const },
];

export default function MinistriesPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'government' as (typeof MINISTRY_TYPES)[number],
    jurisdiction: 'UK',
    contactName: '',
    contactRole: '',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMinistries = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ministries');
      const data = await res.json();
      if (data.success) {
        setMinistries(data.ministries || []);
      }
    } catch (error) {
      console.error('Failed to load ministries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMinistries();
  }, []);

  const handleCreateMinistry = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Name and code are required');
      return;
    }
    try {
      const res = await fetch('/api/ministries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          type: formData.type,
          jurisdiction: formData.jurisdiction || 'UK',
          contactName: formData.contactName.trim() || undefined,
          contactRole: formData.contactRole.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          code: '',
          type: 'government',
          jurisdiction: 'UK',
          contactName: '',
          contactRole: '',
        });
        fetchMinistries();
      } else {
        alert(data.error || 'Failed to create ministry');
      }
    } catch (error) {
      console.error('Failed to create ministry:', error);
      alert('Failed to create ministry');
    }
  };

  const handleQuickOnboard = async (m: (typeof WEDGE_MINISTRIES)[0]) => {
    const existing = ministries.find((x) => x.code === m.code);
    if (existing) {
      setSelectedMinistry(existing);
      return;
    }
    try {
      const res = await fetch('/api/ministries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: m.name,
          code: m.code,
          type: m.type,
          jurisdiction: 'UK',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMinistries();
        setSelectedMinistry(data.ministry);
      } else {
        alert(data.error || 'Failed to onboard ministry');
      }
    } catch (error) {
      console.error('Failed to onboard ministry:', error);
      alert('Failed to onboard ministry');
    }
  };

  const handleRotateKey = async (ministryId: string) => {
    try {
      setActionLoading(ministryId);
      const res = await fetch(`/api/ministries/${ministryId}?action=rotate-key`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchMinistries();
        const updated = ministries.find((m) => m.id === ministryId);
        if (updated) setSelectedMinistry({ ...updated, key_id: data.newKeyId });
      } else {
        alert(data.error || 'Failed to rotate key');
      }
    } catch (error) {
      console.error('Failed to rotate key:', error);
      alert('Failed to rotate key');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredMinistries = ministries.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      (m.type || '').toLowerCase().includes(q)
    );
  });

  const tableRows = filteredMinistries.map((m) => [
    <span key="name" className="text-body mono text-text-primary font-medium">
      {m.name}
    </span>,
    <span key="code" className="text-body-mono mono text-safety-cobalt">
      {m.code}
    </span>,
    <span key="type" className="text-body mono text-text-secondary">
      {m.type}
    </span>,
    <Badge
      key="status"
      status={
        m.status === 'active'
          ? 'ok'
          : m.status === 'key_revoked'
            ? 'warning'
            : 'active'
      }
    >
      {m.status}
    </Badge>,
    <span key="key" className="text-body-mono mono text-text-muted">
      {m.key_id ? '✓' : '—'}
    </span>,
    <span key="updated" className="text-body-mono mono text-text-muted">
      {format(new Date(m.updated_at), 'yyyy-MM-dd')}
    </span>,
  ]);

  const rightPanelContent = selectedMinistry ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">MINISTRY</div>
        <div className="text-body mono text-text-primary font-medium">
          {selectedMinistry.name}
        </div>
        <div className="text-body-mono mono text-safety-cobalt mt-1">
          {selectedMinistry.code}
        </div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">TYPE</div>
        <div className="text-body mono text-text-secondary">
          {selectedMinistry.type}
        </div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">JURISDICTION</div>
        <div className="text-body mono text-text-secondary">
          {selectedMinistry.jurisdiction}
        </div>
      </div>
      {selectedMinistry.contact_name && (
        <div>
          <div className="text-label mono text-text-muted mb-1">CONTACT</div>
          <div className="text-body mono text-text-secondary">
            {selectedMinistry.contact_name}
            {selectedMinistry.contact_role && ` — ${selectedMinistry.contact_role}`}
          </div>
        </div>
      )}
      <Card>
        <div className="text-label mono text-text-muted mb-2">KEY MANAGEMENT</div>
        <div className="space-y-2 text-body mono">
          <div className="flex justify-between">
            <span className="text-text-secondary">Key ID:</span>
            <span className="text-text-primary mono text-sm">
              {selectedMinistry.key_id || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Status:</span>
            <Badge
              status={
                selectedMinistry.status === 'active' ? 'ok' : 'warning'
              }
            >
              {selectedMinistry.status}
            </Badge>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => handleRotateKey(selectedMinistry.id)}
              disabled={
                !selectedMinistry.key_id ||
                actionLoading === selectedMinistry.id
              }
            >
              {actionLoading === selectedMinistry.id ? (
                'Rotating...'
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Rotate Key
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
      <div>
        <div className="text-label mono text-text-muted mb-1">CREATED</div>
        <div className="text-body-mono mono text-text-secondary">
          {format(new Date(selectedMinistry.created_at), 'yyyy-MM-dd HH:mm')}
        </div>
      </div>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select a ministry to view details
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Ministry Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Wedge onboarding banner */}
        <div className="mx-4 mt-4 p-4 bg-base-800 border border-base-700 rounded-lg">
          <div className="flex items-center gap-2 text-label mono text-text-muted mb-2">
            <Shield className="w-4 h-4" />
            FLOOD/WATER WEDGE — MINISTRY ONBOARDING
          </div>
          <div className="text-body mono text-text-secondary mb-3">
            Register the three ministries required for M-of-N authorization in the
            initial wedge: Environment Agency, National Grid ESO, Ministry of
            Defence.
          </div>
          <div className="flex flex-wrap gap-2">
            {WEDGE_MINISTRIES.map((m) => {
              const exists = ministries.some((x) => x.code === m.code);
              return (
                <Button
                  key={m.code}
                  variant={exists ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleQuickOnboard(m)}
                >
                  {exists ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {m.code} ✓
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      Add {m.code}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-base-700 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-base-800 border border-base-700 rounded px-3 py-2">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search ministries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-body text-text-primary placeholder:text-text-muted focus:outline-none mono"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Ministry
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-text-muted">
              Loading ministries...
            </div>
          ) : filteredMinistries.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              No ministries registered. Use the wedge onboarding above or Register
              Ministry to add one.
            </div>
          ) : (
            <Table
              headers={[
                'Name',
                'Code',
                'Type',
                'Status',
                'Key',
                'Updated',
              ]}
              rows={tableRows}
              onRowClick={(index) => {
                setSelectedMinistry(filteredMinistries[index]);
              }}
              selectedRowIndex={
                selectedMinistry
                  ? filteredMinistries.findIndex(
                      (m) => m.id === selectedMinistry.id
                    )
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-base-900 border border-base-700 rounded-lg p-6 w-full max-w-md">
            <div className="text-display-title mono text-text-primary mb-4">
              Register Ministry
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-label mono text-text-muted block mb-1">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Environment Agency"
                />
              </div>
              <div>
                <label className="text-label mono text-text-muted block mb-1">
                  Code *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. EA"
                />
              </div>
              <div>
                <label className="text-label mono text-text-muted block mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      type: e.target.value as (typeof MINISTRY_TYPES)[number],
                    }))
                  }
                  className="w-full bg-base-800 border border-base-700 text-text-primary px-3 py-2 rounded mono"
                >
                  {MINISTRY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-label mono text-text-muted block mb-1">
                  Jurisdiction
                </label>
                <Input
                  value={formData.jurisdiction}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, jurisdiction: e.target.value }))
                  }
                  placeholder="UK"
                />
              </div>
              <div>
                <label className="text-label mono text-text-muted block mb-1">
                  Contact Name
                </label>
                <Input
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, contactName: e.target.value }))
                  }
                  placeholder="Director of Operations"
                />
              </div>
              <div>
                <label className="text-label mono text-text-muted block mb-1">
                  Contact Role
                </label>
                <Input
                  value={formData.contactRole}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, contactRole: e.target.value }))
                  }
                  placeholder="Chief Flood Officer"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleCreateMinistry}
              >
                Register
              </Button>
            </div>
          </div>
        </div>
      )}
    </CommandShell>
  );
}
