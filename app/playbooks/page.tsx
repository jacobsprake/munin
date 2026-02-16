'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Edit, Plus, FileText, Save, X } from 'lucide-react';
import yaml from 'js-yaml';

interface Playbook {
  id: string;
  title: string;
  type: string;
  version: string;
  description: string;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const fetchPlaybooks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/playbooks');
      const data = await res.json();
      if (data.success) {
        setPlaybooks(data.playbooks || []);
      }
    } catch (error) {
      console.error('Failed to load playbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlaybook = async (playbookId: string) => {
    try {
      const res = await fetch(`/api/playbooks?id=${playbookId}`);
      const data = await res.json();
      if (data.success && data.playbook) {
        setSelectedPlaybook(data.playbook);
        setEditingContent(yaml.dump(data.playbook));
      }
    } catch (error) {
      console.error('Failed to load playbook:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedPlaybook) return;
    try {
      const res = await fetch('/api/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPlaybook.id,
          content: editingContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        fetchPlaybooks();
        handleSelectPlaybook(selectedPlaybook.id);
      } else {
        alert(data.error || 'Failed to save playbook');
      }
    } catch (error) {
      console.error('Failed to save playbook:', error);
      alert('Failed to save playbook');
    }
  };

  const tableRows = playbooks.map((playbook) => [
    <span key="id" className="text-body-mono mono text-text-primary">{playbook.id}</span>,
    <span key="title" className="text-body mono text-text-primary">{playbook.title}</span>,
    <Badge key="type" status="active">{playbook.type.toUpperCase()}</Badge>,
    <span key="version" className="text-body-mono mono text-text-secondary">{playbook.version}</span>,
  ]);

  const rightPanelContent = selectedPlaybook ? (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div>
        <div className="text-label mono text-text-muted mb-1">PLAYBOOK ID</div>
        <div className="text-body-mono mono text-text-primary">{selectedPlaybook.id}</div>
      </div>
      <div>
        <div className="text-label mono text-text-muted mb-1">TITLE</div>
        <div className="text-body mono text-text-primary">{selectedPlaybook.title}</div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-label mono text-text-muted">CONTENT</div>
          {!isEditing ? (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="primary" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="secondary" onClick={() => {
                setIsEditing(false);
                if (selectedPlaybook) {
                  handleSelectPlaybook(selectedPlaybook.id);
                }
              }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
        {isEditing ? (
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            className="flex-1 w-full bg-base-800 border border-base-700 text-text-primary text-body-mono mono p-3 rounded font-mono text-xs resize-none"
            spellCheck={false}
          />
        ) : (
          <div className="flex-1 overflow-auto bg-base-800 border border-base-700 rounded p-3">
            <pre className="text-body-mono mono text-text-primary text-xs whitespace-pre-wrap">
              {yaml.dump(selectedPlaybook)}
            </pre>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select a playbook to view/edit
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Playbook Editor"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-base-700 flex items-center justify-between">
          <div className="text-label mono text-text-primary">PLAYBOOKS</div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading playbooks...</div>
          ) : playbooks.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No playbooks found</div>
          ) : (
            <Table
              headers={['ID', 'Title', 'Type', 'Version']}
              rows={tableRows}
              onRowClick={(index) => {
                const playbook = playbooks[index];
                handleSelectPlaybook(playbook.id);
              }}
              selectedRowIndex={selectedPlaybook ? playbooks.findIndex((p) => p.id === selectedPlaybook.id) : undefined}
            />
          )}
        </div>
      </div>
    </CommandShell>
  );
}
