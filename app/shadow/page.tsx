'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { TrendingUp, Clock, DollarSign, CheckCircle2, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ShadowReport {
  shadow_mode_period: {
    start_date: string;
    end_date: string;
    total_incidents: number;
  };
  performance_comparison: {
    human_average_response_time_seconds: number;
    munin_average_response_time_seconds: number;
    average_improvement_ratio: number;
    total_time_saved_seconds: number;
    total_time_saved_hours: number;
  };
  cost_savings: {
    estimated_damage_prevented_usd: number;
    incidents_handled: number;
    average_savings_per_incident: number;
  };
  detailed_comparisons: Array<{
    incident_id: string;
    human_response_time_seconds: number;
    munin_response_time_seconds: number;
    time_saved_seconds: number;
    improvement_ratio: number;
  }>;
  correlation_score: number;
  near_miss_count: number;
  production_readiness: {
    correlation_threshold_met: boolean;
    near_miss_threshold_met: boolean;
    recommendation: string;
  };
}

export default function ShadowPage() {
  const [report, setReport] = useState<ShadowReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shadow/report');
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Failed to load shadow report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/shadow/report');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shadow-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const rightPanelContent = report ? (
    <div className="p-4 space-y-4">
      <Card>
        <div className="text-label mono text-text-muted mb-2">PRODUCTION READINESS</div>
        <Badge status={report.production_readiness.recommendation === 'READY_FOR_PRODUCTION' ? 'ok' : 'warning'}>
          {report.production_readiness.recommendation.replace(/_/g, ' ')}
        </Badge>
        <div className="mt-2 space-y-1 text-body-mono mono text-text-secondary">
          <div>Correlation: {(report.correlation_score * 100).toFixed(3)}%</div>
          <div>Near-misses: {report.near_miss_count}</div>
        </div>
      </Card>
      <Card>
        <div className="text-label mono text-text-muted mb-2">SHADOW MODE PERIOD</div>
        <div className="space-y-1 text-body-mono mono text-text-secondary">
          <div>Start: {format(new Date(report.shadow_mode_period.start_date), 'yyyy-MM-dd')}</div>
          <div>End: {format(new Date(report.shadow_mode_period.end_date), 'yyyy-MM-dd')}</div>
          <div>Incidents: {report.shadow_mode_period.total_incidents}</div>
        </div>
      </Card>
      <Button variant="secondary" onClick={handleExport} className="w-full">
        <Download className="w-4 h-4 mr-2" />
        Export Report
      </Button>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      No shadow report available
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Shadow Report Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Loading shadow mode report...</div>
          </div>
        ) : !report ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Failed to load shadow report</div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-muted">TIME SAVED</div>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {report.performance_comparison.total_time_saved_hours}h
                </div>
                <div className="text-body-mono mono text-text-secondary mt-1">
                  {report.performance_comparison.total_time_saved_seconds}s total
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-muted">IMPROVEMENT</div>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {report.performance_comparison.average_improvement_ratio.toFixed(1)}x
                </div>
                <div className="text-body-mono mono text-text-secondary mt-1">
                  Faster than human response
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-muted">DAMAGE PREVENTED</div>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  ${(report.cost_savings.estimated_damage_prevented_usd / 1000).toFixed(0)}k
                </div>
                <div className="text-body-mono mono text-text-secondary mt-1">
                  Estimated savings
                </div>
              </Card>
            </div>

            {/* Performance Comparison */}
            <Card className="mb-6">
              <div className="text-label mono text-text-muted mb-4">PERFORMANCE COMPARISON</div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-body-mono mono text-text-secondary mb-1">Human Average</div>
                  <div className="text-2xl font-mono font-bold text-text-primary">
                    {Math.round(report.performance_comparison.human_average_response_time_seconds / 60)} min
                  </div>
                </div>
                <div>
                  <div className="text-body-mono mono text-text-secondary mb-1">Munin Average</div>
                  <div className="text-2xl font-mono font-bold text-safety-emerald">
                    {Math.round(report.performance_comparison.munin_average_response_time_seconds / 60)} min
                  </div>
                </div>
              </div>
            </Card>

            {/* Detailed Comparisons */}
            <Card>
              <div className="text-label mono text-text-muted mb-4">DETAILED COMPARISONS</div>
              <div className="overflow-x-auto">
                <Table
                  headers={['Incident', 'Human Time', 'Munin Time', 'Time Saved', 'Improvement']}
                  rows={report.detailed_comparisons.slice(0, 20).map(c => [
                    <span key="incident" className="text-body-mono mono text-text-primary">{c.incident_id.slice(0, 20)}...</span>,
                    <span key="human" className="text-body-mono mono text-text-secondary">{Math.round(c.human_response_time_seconds / 60)}m</span>,
                    <span key="munin" className="text-body-mono mono text-safety-emerald">{Math.round(c.munin_response_time_seconds / 60)}m</span>,
                    <span key="saved" className="text-body-mono mono text-text-primary">{Math.round(c.time_saved_seconds / 60)}m</span>,
                    <span key="ratio" className="text-body-mono mono text-safety-emerald">{c.improvement_ratio.toFixed(1)}x</span>,
                  ])}
                />
              </div>
            </Card>
          </>
        )}
      </div>
    </CommandShell>
  );
}
