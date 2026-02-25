'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ShadowComparison {
  incident_id: string;
  time_saved_seconds: number;
  damage_prevented_estimate: number;
  improvement_ratio: number;
  human_action?: {
    duration_seconds: number;
    description: string;
  };
  munin_prediction?: {
    predicted_duration_seconds: number;
    predicted_action: string;
  };
}

interface ShadowReport {
  shadow_mode_status: string;
  summary: {
    total_incidents_observed: number;
    total_time_saved_seconds: number;
    total_damage_prevented_estimate: number;
    average_improvement_ratio: number;
  };
  comparisons: ShadowComparison[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export function ShadowModeReportPanel() {
  const [report, setReport] = useState<ShadowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterIncidentId, setFilterIncidentId] = useState('');

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterIncidentId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (filterIncidentId) {
        params.append('incident_id', filterIncidentId);
      }

      const response = await fetch(`/api/shadow/report?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Failed to load shadow report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading shadow mode report...</div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">No shadow mode data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Shadow Mode Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Incidents Observed</div>
              <div className="text-2xl font-bold">{report.summary.total_incidents_observed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Time Saved</div>
              <div className="text-2xl font-bold text-emerald-600">
                {formatDuration(report.summary.total_time_saved_seconds)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Damage Prevented</div>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(report.summary.total_damage_prevented_estimate)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Improvement</div>
              <div className="text-2xl font-bold text-emerald-600">
                {report.summary.average_improvement_ratio.toFixed(1)}x
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Filter by incident ID..."
              value={filterIncidentId}
              onChange={(e) => setFilterIncidentId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button onClick={loadReport}>Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparisons */}
      <div className="space-y-4">
        {report.comparisons.map((comparison) => (
          <Card key={comparison.incident_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{comparison.incident_id}</CardTitle>
                <Badge variant="outline" className="text-emerald-600">
                  {comparison.improvement_ratio.toFixed(1)}x faster
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Human Action Timeline */}
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-2">
                    Human Response
                  </div>
                  {comparison.human_action ? (
                    <>
                      <div className="text-lg font-mono">
                        {formatDuration(comparison.human_action.duration_seconds)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {comparison.human_action.description}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No data</div>
                  )}
                </div>

                {/* Munin Prediction Timeline */}
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-2">
                    Munin Prediction
                  </div>
                  {comparison.munin_prediction ? (
                    <>
                      <div className="text-lg font-mono text-emerald-600">
                        {formatDuration(comparison.munin_prediction.predicted_duration_seconds)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {comparison.munin_prediction.predicted_action}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No data</div>
                  )}
                </div>
              </div>

              {/* Delta */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Time Saved</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {formatDuration(comparison.time_saved_seconds)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Damage Prevented</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {formatCurrency(comparison.damage_prevented_estimate)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {report.pagination && report.pagination.total_pages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Page {report.pagination.page} of {report.pagination.total_pages} (
                {report.pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(report.pagination!.total_pages, page + 1))}
                  disabled={page === report.pagination!.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
