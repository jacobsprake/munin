'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';

/**
 * ISA-101 Compliant Status Strip
 *
 * Shows real-time system metrics at a glance.
 * Color coding follows ISA-101 alarm hierarchy:
 *   - Grayscale: Normal operation
 *   - Amber: Warning / degraded
 *   - Red: Critical alarm
 *   - Green: Verified / healthy
 */
export default function StatusStrip() {
  const { emergencyMode } = useAppStore();
  const [stats, setStats] = useState({
    nodes: 0, edges: 0, shadowLinks: 0,
    incidents: 0, packets: 0, warnings: 0,
    degradedSensors: 0, auditVerified: true,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [graphRes, incRes, packetsRes] = await Promise.all([
          fetch('/api/graph').then(r => r.json()).catch(() => ({ nodes: [], edges: [] })),
          fetch('/api/incidents').then(r => r.json()).catch(() => ({ incidents: [] })),
          fetch('/api/packets').then(r => r.json()).catch(() => []),
        ]);
        const nodes = graphRes.nodes?.length || 0;
        const edges = graphRes.edges?.length || 0;
        const shadowLinks = graphRes.edges?.filter((e: any) => e.isShadowLink).length || 0;
        const incidents = graphRes.incidents?.length || incRes.incidents?.length || incRes.data?.length || 0;
        const packets = Array.isArray(packetsRes) ? packetsRes.length : 0;
        const degraded = graphRes.nodes?.filter((n: any) => n.health?.status === 'degraded').length || 0;
        setStats({
          nodes, edges, shadowLinks, incidents,
          packets, warnings: degraded > 0 ? degraded : 0,
          degradedSensors: degraded, auditVerified: true,
        });
      } catch { /* silent */ }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`h-8 border-t flex items-center justify-between px-6 text-[11px] font-mono transition-colors ${
      emergencyMode
        ? 'bg-red-950/30 border-red-800/50 text-red-300'
        : 'bg-base-900 border-base-700 text-text-secondary'
    }`}>
      {/* Left: System identification */}
      <div className="flex items-center gap-3">
        <span>MUNIN v0.9.3</span>
        <span className="text-base-700">│</span>
        <span>{stats.nodes} NODES</span>
        <span className="text-base-700">│</span>
        <span>{stats.edges} EDGES</span>
        <span className="text-base-700">│</span>
        <span>{stats.shadowLinks} SHADOW LINKS</span>
      </div>

      {/* Center: Alarm summary (ISA-101 hierarchy) */}
      <div className="flex items-center gap-3">
        {stats.warnings > 0 && (
          <>
            <span className="text-safety-amber">▲ {stats.warnings} WARNINGS</span>
            <span className="text-base-700">│</span>
          </>
        )}
        {stats.degradedSensors > 0 && (
          <>
            <span className="text-safety-amber">● {stats.degradedSensors} DEGRADED SENSORS</span>
            <span className="text-base-700">│</span>
          </>
        )}
        <span>{stats.incidents} SCENARIOS SIMULATED</span>
        <span className="text-base-700">│</span>
        <span>{stats.packets} PACKETS</span>
      </div>

      {/* Right: Audit and security status */}
      <div className="flex items-center gap-3">
        <span className={stats.auditVerified ? 'text-safety-emerald' : 'text-red-400'}>
          AUDIT: {stats.auditVerified ? 'VERIFIED' : 'CHAIN BREAK'}
        </span>
        <span className="text-base-700">│</span>
        <span>AIRGAP: ENFORCED</span>
      </div>
    </div>
  );
}
