'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Shield, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ReadinessMetrics {
  overall_score: number;
  time_to_authorize_avg: number;
  time_to_task_avg: number;
  time_to_stabilize_avg: number;
  scenario_success_rate: number;
  cascade_containment_rate: number;
  sector_breakdown: Record<string, number>;
  trend_data: Array<{ date: string; score: number }>;
}

export default function ReadinessPage() {
  const [metrics, setMetrics] = useState<ReadinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchReadiness();
    const interval = setInterval(fetchReadiness, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/readiness');
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch readiness metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-safety-emerald';
    if (score >= 60) return 'text-safety-amber';
    return 'text-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'ok';
    if (score >= 60) return 'active';
    return 'warning';
  };

  const getTrend = () => {
    if (!metrics || metrics.trend_data.length < 2) return null;
    const recent = metrics.trend_data.slice(-2);
    const diff = recent[1].score - recent[0].score;
    return diff;
  };

  const trend = getTrend();

  const rightPanelContent = metrics ? (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-label mono text-text-muted mb-1">LAST UPDATED</div>
        <div className="text-body-mono mono text-text-primary">
          {lastUpdated ? format(lastUpdated, 'yyyy-MM-dd HH:mm:ss') : 'Never'}
        </div>
      </div>
      <Card>
        <div className="text-label mono text-text-muted mb-2">TREND ANALYSIS</div>
        <div className="space-y-2">
          {metrics.trend_data.slice(-7).map((point, i) => (
            <div key={i} className="flex items-center justify-between text-body-mono mono">
              <span className="text-text-secondary">{format(new Date(point.date), 'MMM dd')}</span>
              <span className={getScoreColor(point.score)}>{point.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="text-label mono text-text-muted mb-2">SECTOR BREAKDOWN</div>
        <div className="space-y-2">
          {Object.entries(metrics.sector_breakdown).map(([sector, score]) => (
            <div key={sector} className="flex items-center justify-between">
              <span className="text-body mono text-text-secondary capitalize">{sector}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-base-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${score >= 80 ? 'bg-safety-emerald' : score >= 60 ? 'bg-safety-amber' : 'bg-red-400'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className={`text-body-mono mono ${getScoreColor(score)}`}>{score.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  ) : (
    <div className="p-4 text-text-muted text-body text-center py-8">
      No readiness data available
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Readiness Details"
      rightPanelCollapsed={false}
    >
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Loading readiness metrics...</div>
          </div>
        ) : !metrics ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Failed to load readiness metrics</div>
          </div>
        ) : (
          <>
            {/* Overall Score */}
            <div className="mb-8">
              <Card className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-label mono text-text-muted mb-2">NATO-STYLE READINESS INDEX</div>
                    <div className="text-6xl font-mono font-bold text-text-primary">
                      {metrics.overall_score.toFixed(1)}
                    </div>
                    <div className="text-body mono text-text-secondary mt-2">Overall Readiness Score</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge status={getScoreBadge(metrics.overall_score)}>
                      {metrics.overall_score >= 80 ? 'EXCELLENT' : metrics.overall_score >= 60 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
                    </Badge>
                    {trend !== null && (
                      <div className={`flex items-center gap-1 text-body-mono mono ${trend >= 0 ? 'text-safety-emerald' : 'text-red-400'}`}>
                        {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full h-4 bg-base-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreColor(metrics.overall_score).replace('text-', 'bg-')}`}
                    style={{ width: `${metrics.overall_score}%` }}
                  />
                </div>
              </Card>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-muted">TIME-TO-AUTHORIZE</div>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {Math.round(metrics.time_to_authorize_avg)}s
                </div>
                <div className="text-body-mono mono text-text-secondary mt-1">
                  Target: &lt; 120s
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-muted">SCENARIO SUCCESS RATE</div>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {(metrics.scenario_success_rate * 100).toFixed(1)}%
                </div>
                <div className="text-body-mono mono text-text-secondary mt-1">
                  Scenarios contained
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-muted">CASCADE CONTAINMENT</div>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {(metrics.cascade_containment_rate * 100).toFixed(1)}%
                </div>
                <div className="text-body-mono mono text-text-secondary mt-1">
                  Cascades stopped early
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-muted">TIME-TO-STABILIZE</div>
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {metrics.time_to_stabilize_avg.toFixed(1)}h
                </div>
                <div className="text-body-mono mono text-text-secondary mt-1">
                  Average recovery time
                </div>
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <div className="text-label mono text-text-muted mb-4">7-DAY TREND</div>
              <div className="h-32 flex items-end gap-2">
                {metrics.trend_data.slice(-7).map((point, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t ${getScoreColor(point.score).replace('text-', 'bg-')}`}
                      style={{ height: `${point.score}%` }}
                    />
                    <div className="text-xs mono text-text-muted">
                      {format(new Date(point.date), 'MM/dd')}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </CommandShell>
  );
}
