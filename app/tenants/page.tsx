'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Plus, Users, Building2, Trash2 } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  sector?: string;
  region?: string;
  config?: Record<string, any>;
  created_at: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', sector: '', region: '' });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tenants');
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTenant)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTenant({ name: '', sector: '', region: '' });
        fetchTenants();
      }
    } catch (error) {
      console.error('Failed to create tenant:', error);
    }
  };

  const handleDelete = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchTenants();
        if (selectedTenant?.id === tenantId) {
          setSelectedTenant(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete tenant:', error);
    }
  };

  const tableRows = tenants.map((tenant) => [
    <span key="id" className="text-body-mono mono text-text-primary">{tenant.id.slice(0, 20)}...</span>,
    <span key="name" className="text-body mono text-text-primary">{tenant.name}</span>,
    <Badge key="sector" status="active">{tenant.sector?.toUpperCase() || 'N/A'}</Badge>,
    <span key="region" className="text-body-mono mono text-text-secondary">{tenant.region || 'N/A'}</span>,
  ]);

  const rightPanelContent = selectedTenant ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">TENANT ID</div>
        <div className="text-body-mono mono text-text-primary">{selectedTenant.id}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">NAME</div>
        <div className="text-body mono text-text-primary">{selectedTenant.name}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">SECTOR</div>
        <div className="text-body mono text-text-primary capitalize">{selectedTenant.sector || 'Not specified'}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">REGION</div>
        <div className="text-body mono text-text-primary">{selectedTenant.region || 'Not specified'}</div>
      </div>
      {selectedTenant.config && Object.keys(selectedTenant.config).length > 0 && (
        <Card>
          <div className="text-label mono text-text-muted mb-2">CONFIGURATION</div>
          <pre className="text-body-mono mono text-text-secondary text-xs overflow-auto">
            {JSON.stringify(selectedTenant.config, null, 2)}
          </pre>
        </Card>
      )}
      <Button
        variant="secondary"
        onClick={() => handleDelete(selectedTenant.id)}
        className="w-full"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Tenant
      </Button>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select a tenant to view details
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Tenant Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-base-700 flex items-center justify-between">
          <div className="text-label mono text-text-primary">TENANTS</div>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Tenant
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No tenants found</div>
          ) : (
            <Table
              headers={['ID', 'Name', 'Sector', 'Region']}
              rows={tableRows}
              onRowClick={(index) => {
                const tenant = tenants[index];
                setSelectedTenant(tenant);
              }}
              selectedRowIndex={selectedTenant ? tenants.findIndex((t) => t.id === selectedTenant.id) : undefined}
            />
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full m-4">
            <div className="text-label mono text-text-primary mb-4">CREATE TENANT</div>
            <div className="space-y-4">
              <div>
                <label className="block text-body-mono mono text-text-secondary mb-1">Name *</label>
                <Input
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="Tenant name"
                />
              </div>
              <div>
                <label className="block text-body-mono mono text-text-secondary mb-1">Sector</label>
                <Input
                  value={newTenant.sector}
                  onChange={(e) => setNewTenant({ ...newTenant, sector: e.target.value })}
                  placeholder="e.g., power, water"
                />
              </div>
              <div>
                <label className="block text-body-mono mono text-text-secondary mb-1">Region</label>
                <Input
                  value={newTenant.region}
                  onChange={(e) => setNewTenant({ ...newTenant, region: e.target.value })}
                  placeholder="e.g., north, south"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={handleCreate} disabled={!newTenant.name}>
                  Create
                </Button>
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </CommandShell>
  );
}
