'use client';

import { useEffect, useState } from 'react';
import CommandShell from '@/components/CommandShell';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Server, Database, Zap, Activity } from 'lucide-react';

interface Metrics {
  system_health: {
    nodes: number;
    edges: number;
    incidents: number;
    packets: number;
    decisions: number;
    database_size_mb: number;
  };
  engine_performance: {
    recent_jobs: number;
    average_job_duration_ms: number;
    success_rate: number;
  };
  api_performance: {
    average_latency_ms: number;
    endpoints: Record<string, number>;
  };
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/metrics');
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CommandShell>
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Loading metrics...</div>
          </div>
        ) : !metrics ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted font-mono">Failed to load metrics</div>
          </div>
        ) : (
          <>
            {/* System Health */}
            <div className="mb-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Server className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-primary">SYSTEM HEALTH</div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-body-mono mono text-text-secondary mb-1">Nodes</div>
                    <div className="text-2xl font-mono font-bold text-text-primary">{metrics.system_health.nodes}</div>
                  </div>
                  <div>
                    <div className="text-body-mono mono text-text-secondary mb-1">Edges</div>
                    <div className="text-2xl font-mono font-bold text-text-primary">{metrics.system_health.edges}</div>
                  </div>
                  <div>
                    <div className="text-body-mono mono text-text-secondary mb-1">Database Size</div>
                    <div className="text-2xl font-mono font-bold text-text-primary">{metrics.system_health.database_size_mb.toFixed(1)} MB</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-primary">ENGINE PERFORMANCE</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-body-mono mono text-text-secondary">Avg Job Duration</span>
                    <span className="text-body-mono mono text-text-primary">{metrics.engine_performance.average_job_duration_ms}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body-mono mono text-text-secondary">Success Rate</span>
                    <Badge status={metrics.engine_performance.success_rate > 0.95 ? 'ok' : 'warning'}>
                      {(metrics.engine_performance.success_rate * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body-mono mono text-text-secondary">Recent Jobs</span>
                    <span className="text-body-mono mono text-text-primary">{metrics.engine_performance.recent_jobs}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-text-secondary" />
                  <div className="text-label mono text-text-primary">API PERFORMANCE</div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-body-mono mono text-text-secondary">Avg Latency</span>
                    <span className="text-body-mono mono text-text-primary">{Math.round(metrics.api_performance.average_latency_ms)}ms</span>
                  </div>
                  {Object.entries(metrics.api_performance.endpoints).map(([endpoint, latency]) => (
                    <div key={endpoint} className="flex justify-between">
                      <span className="text-body-mono mono text-text-secondary">{endpoint}</span>
                      <span className="text-body-mono mono text-text-primary">{latency}ms</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Entity Counts */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-text-secondary" />
                <div className="text-label mono text-text-primary">ENTITY COUNTS</div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-body-mono mono text-text-secondary mb-1">Incidents</div>
                  <div className="text-xl font-mono font-bold text-text-primary">{metrics.system_health.incidents}</div>
                </div>
                <div>
                  <div className="text-body-mono mono text-text-secondary mb-1">Packets</div>
                  <div className="text-xl font-mono font-bold text-text-primary">{metrics.system_health.packets}</div>
                </div>
                <div>
                  <div className="text-body-mono mono text-text-secondary mb-1">Decisions</div>
                  <div className="text-xl font-mono font-bold text-text-primary">{metrics.system_health.decisions}</div>
                </div>
                <div>
                  <div className="text-body-mono mono text-text-secondary mb-1">Edges</div>
                  <div className="text-xl font-mono font-bold text-text-primary">{metrics.system_health.edges}</div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </CommandShell>
  );
}
