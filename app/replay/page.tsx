'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { format } from 'date-fns';
import { Play, GitCompare, Clock } from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  type: string;
  start_ts: string;
  created_at: string;
}

interface TimelineEvent {
  timestamp: string;
  type: string;
  id: string;
  event: string;
}

interface ReplayData {
  incident: Incident;
  packets: any[];
  decisions: any[];
  timeline: TimelineEvent[];
  duration_seconds: number;
}

export default function ReplayPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<ReplayData | null>(null);
  const [compareIncident, setCompareIncident] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/replay');
      const data = await res.json();
      if (data.success) {
        setIncidents(data.incidents || []);
      }
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = async (incidentId: string) => {
    try {
      const url = compareIncident
        ? `/api/replay?incidentId=${incidentId}&compareWith=${compareIncident}`
        : `/api/replay?incidentId=${incidentId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.replay) {
        setSelectedIncident(data.replay);
      }
    } catch (error) {
      console.error('Failed to replay incident:', error);
    }
  };

  const tableRows = incidents.map((incident) => [
    <span key="id" className="text-body-mono mono text-text-primary">{incident.id.slice(0, 20)}...</span>,
    <span key="title" className="text-body mono text-text-primary">{incident.title}</span>,
    <Badge key="type" status="active">{incident.type.toUpperCase()}</Badge>,
    <span key="date" className="text-body-mono mono text-text-secondary">
      {format(new Date(incident.created_at), 'yyyy-MM-dd HH:mm')}
    </span>,
  ]);

  const rightPanelContent = selectedIncident ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">INCIDENT</div>
        <div className="text-body-mono mono text-text-primary">{selectedIncident.incident.title}</div>
      </div>
      <Card>
        <div className="text-label mono text-text-muted mb-2">TIMELINE</div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {selectedIncident.timeline.map((event, i) => (
            <div key={i} className="flex items-start gap-3 text-body-mono mono">
              <div className="text-text-secondary text-xs mt-1">
                {format(new Date(event.timestamp), 'HH:mm:ss')}
              </div>
              <div className="flex-1">
                <div className="text-text-primary">{event.event}</div>
                <div className="text-text-secondary text-xs">{event.type} • {event.id.slice(0, 16)}...</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="text-label mono text-text-muted mb-2">STATISTICS</div>
        <div className="space-y-2 text-body-mono mono">
          <div className="flex justify-between">
            <span className="text-text-secondary">Duration:</span>
            <span className="text-text-primary">{Math.round(selectedIncident.duration_seconds / 60)} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Packets:</span>
            <span className="text-text-primary">{selectedIncident.packets.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Decisions:</span>
            <span className="text-text-primary">{selectedIncident.decisions.length}</span>
          </div>
        </div>
      </Card>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      Select an incident to replay
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Replay Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-base-700 flex items-center gap-3">
          <select
            value={compareIncident || ''}
            onChange={(e) => setCompareIncident(e.target.value || null)}
            className="bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono"
          >
            <option value="">No comparison</option>
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>{inc.title}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-text-muted">Loading incidents...</div>
          ) : incidents.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No incidents found</div>
          ) : (
            <Table
              headers={['ID', 'Title', 'Type', 'Date']}
              rows={tableRows}
              onRowClick={(index) => {
                const incident = incidents[index];
                handleReplay(incident.id);
              }}
              selectedRowIndex={selectedIncident ? incidents.findIndex((i) => i.id === selectedIncident.incident.id) : undefined}
            />
          )}
        </div>
      </div>
    </CommandShell>
  );
}
