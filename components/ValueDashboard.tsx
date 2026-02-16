'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { TrendingUp, Clock, DollarSign, Shield } from 'lucide-react';

interface ValueMetrics {
  totalTimeSavedHours: number;
  totalDamagePreventedUSD: number;
  averageImprovementRatio: number;
  incidentsObserved: number;
  shadowModeActive: boolean;
}

export default function ValueDashboard() {
  const [metrics, setMetrics] = useState<ValueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/shadow/report?page=1&limit=1');
      if (response.ok) {
        const data = await response.json();
        setMetrics({
          totalTimeSavedHours: data.summary.total_time_saved_seconds / 3600,
          totalDamagePreventedUSD: data.summary.total_damage_prevented_estimate,
          averageImprovementRatio: data.summary.average_improvement_ratio,
          incidentsObserved: data.summary.total_incidents_observed,
          shadowModeActive: data.shadow_mode_status === 'active'
        });
      }
    } catch (error) {
      console.error('Failed to load value metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground">Loading value metrics...</div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <div className="p-4 text-center text-muted-foreground">No metrics available</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <div className="text-sm font-mono font-semibold text-text-primary mb-4">
          VALUE DASHBOARD - SHADOW MODE METRICS
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Time Saved */}
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-safety-emerald" />
              <div className="text-xs font-mono text-text-muted">Time Saved</div>
            </div>
            <div className="text-lg font-mono font-bold text-safety-emerald">
              {metrics.totalTimeSavedHours.toFixed(1)}h
            </div>
          </div>

          {/* Damage Prevented */}
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-safety-emerald" />
              <div className="text-xs font-mono text-text-muted">Damage Prevented</div>
            </div>
            <div className="text-lg font-mono font-bold text-safety-emerald">
              ${(metrics.totalDamagePreventedUSD / 1000000).toFixed(1)}M
            </div>
          </div>

          {/* Improvement Ratio */}
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-safety-cobalt" />
              <div className="text-xs font-mono text-text-muted">Avg Improvement</div>
            </div>
            <div className="text-lg font-mono font-bold text-safety-cobalt">
              {metrics.averageImprovementRatio.toFixed(1)}x
            </div>
          </div>

          {/* Incidents Observed */}
          <div className="p-3 bg-base-800 rounded border border-base-700">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-safety-amber" />
              <div className="text-xs font-mono text-text-muted">Incidents</div>
            </div>
            <div className="text-lg font-mono font-bold text-safety-amber">
              {metrics.incidentsObserved}
            </div>
          </div>
        </div>

        {metrics.shadowModeActive && (
          <div className="mt-4 p-2 bg-safety-emerald/20 border border-safety-emerald/50 rounded">
            <div className="text-xs font-mono text-safety-emerald">
              ✓ Shadow Mode Active - Collecting value metrics
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
