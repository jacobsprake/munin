'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { Monitor, Clock, Activity, Server } from 'lucide-react';
import SecurityStatusPanel from '@/components/SecurityStatusPanel';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';

export default function TopBar() {
  const { region, mode, deploymentMode, connectivityState, setWarRoomMode, warRoomMode, emergencyMode, setEmergencyMode, setEmergencyLevel } = useAppStore();
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
    <div className={`h-12 border-b flex items-center justify-between px-6 text-label text-text-secondary mono transition-colors ${
      emergencyMode 
        ? 'bg-red-950/50 border-red-500/50' 
        : 'bg-base-900 border-base-700'
    }`}>
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
      <div className="flex items-center gap-6 flex-1 justify-end">
        <GlobalSearch />
        <NotificationBell />
        <SecurityStatusPanel />
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-text-primary">{format(currentTime, 'HH:mm:ss')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-xs font-mono">CMI:</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emergencyMode}
              onChange={async (e) => {
                const newMode = e.target.checked;
                try {
                  const response = await fetch(newMode ? '/api/cmi/activate' : '/api/cmi/deactivate', { method: 'POST' });
                  const data = await response.json();
                  if (data.success) {
                    setEmergencyMode(newMode);
                    if (newMode) {
                      setEmergencyLevel('national_emergency');
                    } else {
                      setEmergencyLevel('peacetime');
                    }
                    window.location.reload();
                  }
                } catch (error) {
                  console.error('Failed to toggle CMI:', error);
                  // Fallback to local state
                  setEmergencyMode(newMode);
                  if (newMode) {
                    setEmergencyLevel('national_emergency');
                  } else {
                    setEmergencyLevel('peacetime');
                  }
                }
              }}
              className="sr-only peer"
            />
            <div className={`w-12 h-6 rounded-full transition-all ${
              emergencyMode 
                ? 'bg-red-600 peer-focus:ring-2 peer-focus:ring-red-500' 
                : 'bg-base-800 peer-focus:ring-2 peer-focus:ring-safety-cobalt'
            } peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
          </label>
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
