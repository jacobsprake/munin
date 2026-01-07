'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { Monitor, Clock, Activity, Server } from 'lucide-react';

export default function TopBar() {
  const { region, mode, deploymentMode, connectivityState, setWarRoomMode, warRoomMode } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const deploymentModeLabels = {
    on_prem_ot: 'ON-PREM OT',
    sovereign_cloud: 'SOVEREIGN CLOUD',
    lab_demo: 'LAB DEMO',
  };

  const connectivityLabels = {
    connected: 'CONNECTED',
    degraded: 'DEGRADED',
    disconnected: 'DISCONNECTED',
  };

  const connectivityColors = {
    connected: 'text-safety-emerald',
    degraded: 'text-safety-amber',
    disconnected: 'text-slate-500',
  };

  return (
    <div className="h-12 bg-base-900 border-b border-base-700 flex items-center justify-between px-6 text-label text-text-secondary mono">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          <span className="text-text-muted">REGION:</span>
          <span className="text-text-primary uppercase">{region}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-text-muted">MODE:</span>
          <span className="text-text-primary uppercase">{mode}</span>
        </div>
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4" />
          <span className="text-text-muted">DEPLOY:</span>
          <span className="text-text-primary">{deploymentModeLabels[deploymentMode]}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectivityState === 'connected' ? 'bg-safety-emerald' :
            connectivityState === 'degraded' ? 'bg-safety-amber' :
            'bg-slate-500'
          }`} />
          <span className={connectivityColors[connectivityState]}>
            {connectivityLabels[connectivityState]}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-text-primary">{format(currentTime, 'HH:mm:ss')}</span>
        </div>
        <button
          onClick={() => setWarRoomMode(!warRoomMode)}
          className={`px-3 py-1 rounded border text-xs font-mono transition-colors ${
            warRoomMode
              ? 'bg-safety-amber/20 border-safety-amber text-safety-amber'
              : 'bg-base-800 border-base-700 text-text-secondary hover:border-base-600'
          }`}
        >
          WAR ROOM
        </button>
      </div>
    </div>
  );
}
