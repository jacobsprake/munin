'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { useAppStore } from '@/lib/store';
import { Zap, Droplets, Radio, Building2, Hospital, Shield } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  icon: any;
  priority: 'critical' | 'normal' | 'shed';
  powered: boolean;
}

export default function PrioritySheddingPanel() {
  const { emergencyMode } = useAppStore();
  const [sectors, setSectors] = useState<Sector[]>([
    { id: 'hospital', name: 'Regional Hospital', icon: Hospital, priority: 'critical', powered: true },
    { id: 'defense', name: 'Defense Command', icon: Shield, priority: 'critical', powered: true },
    { id: 'water', name: 'Water Treatment', icon: Droplets, priority: 'normal', powered: true },
    { id: 'power', name: 'Grid Operations', icon: Zap, priority: 'normal', powered: true },
    { id: 'telecom', name: 'Telecom Infrastructure', icon: Radio, priority: 'normal', powered: true },
    { id: 'retail', name: 'Luxury Retail', icon: Building2, priority: 'shed', powered: false },
    { id: 'datacenter', name: 'Data Centers', icon: Building2, priority: 'shed', powered: false },
  ]);

  useEffect(() => {
    if (emergencyMode) {
      // In CMI mode, update priorities
      setSectors(prev => prev.map(sector => {
        if (sector.priority === 'critical') {
          return { ...sector, powered: true };
        } else if (sector.priority === 'shed') {
          return { ...sector, powered: false };
        } else {
          return { ...sector, powered: true }; // Keep normal sectors powered
        }
      }));
    } else {
      // Normal mode - all sectors powered
      setSectors(prev => prev.map(sector => ({ ...sector, powered: true })));
    }
  }, [emergencyMode]);

  return (
    <Card className="p-4 space-y-4">
      <div className="text-label mono text-text-primary mb-4">
        PRIORITY-SHEDDING LOGIC
      </div>

      <div className="space-y-2">
        {sectors.map((sector) => {
          const Icon = sector.icon;
          const isCritical = sector.priority === 'critical';
          const isShed = sector.priority === 'shed' && emergencyMode;

          return (
            <div
              key={sector.id}
              className={`p-3 rounded border transition-all ${
                isCritical && emergencyMode
                  ? 'bg-safety-emerald/20 border-safety-emerald/50'
                  : isShed
                  ? 'bg-base-800/50 border-base-700 opacity-50'
                  : 'bg-base-800 border-base-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${
                    isCritical && emergencyMode
                      ? 'text-safety-emerald'
                      : isShed
                      ? 'text-text-muted'
                      : 'text-text-secondary'
                  }`} />
                  <div>
                    <div className={`text-body-mono mono ${
                      isCritical && emergencyMode
                        ? 'text-safety-emerald font-bold'
                        : isShed
                        ? 'text-text-muted line-through'
                        : 'text-text-primary'
                    }`}>
                      {sector.name}
                    </div>
                    <div className="text-body-mono mono text-text-muted text-xs">
                      {sector.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  sector.powered
                    ? isCritical && emergencyMode
                      ? 'bg-safety-emerald animate-pulse'
                      : 'bg-safety-emerald'
                    : 'bg-slate-500'
                }`} />
              </div>
            </div>
          );
        })}
      </div>

      {emergencyMode && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 rounded">
          <div className="text-body-mono mono text-red-400 text-xs">
            CMI Protocol Active: Non-critical sectors powered down to preserve resources for critical infrastructure.
          </div>
        </div>
      )}
    </Card>
  );
}


