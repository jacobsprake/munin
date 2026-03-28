'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { Monitor, Clock, Activity, Server, LogOut, User } from 'lucide-react';
import SecurityStatusPanel from '@/components/SecurityStatusPanel';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';

export default function TopBar() {
  const { region, mode, deploymentMode, connectivityState, setWarRoomMode, warRoomMode, emergencyMode, setEmergencyMode, setEmergencyLevel } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [operator, setOperator] = useState<{ operatorId: string; role?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('munin_operator');
        if (stored) setOperator(JSON.parse(stored));
      } catch {
        setOperator(null);
      }
    }
  }, []);

  const handleLogout = async () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('munin_token') : null;
    if (token) {
      try {
        await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      } catch {
        // Proceed with client-side clear
      }
    }
    sessionStorage.removeItem('munin_token');
    sessionStorage.removeItem('munin_operator');
    sessionStorage.removeItem('munin_ministry');
    router.replace('/');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const deploymentModeLabels: Record<string, string> = {
    on_prem_ot: 'ON-PREM OT',
    sovereign_cloud: 'SOVEREIGN CLOUD',
    lab_demo: 'LAB DEMO',
    pilot: 'PILOT',
  };

  const connectivityLabels: Record<string, string> = {
    connected: 'CONNECTED',
    degraded: 'DEGRADED',
    disconnected: 'DISCONNECTED',
    air_gapped: 'AIR-GAPPED',
  };

  const connectivityColors: Record<string, string> = {
    connected: 'text-safety-emerald',
    degraded: 'text-safety-amber',
    disconnected: 'text-slate-500',
    air_gapped: 'text-blue-400',
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
        {operator && (
          <div className="flex items-center gap-2 pl-4 border-l border-base-700">
            <User className="w-4 h-4 text-text-muted" />
            <span className="text-xs font-mono text-text-secondary">{operator.operatorId}</span>
            {operator.role && (
              <span className="text-[10px] font-mono text-text-muted uppercase">({operator.role})</span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-base-600 text-xs font-mono text-text-muted hover:border-red-600 hover:text-red-400 transition-colors"
              title="End session"
            >
              <LogOut className="w-3.5 h-3.5" />
              LOGOUT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
