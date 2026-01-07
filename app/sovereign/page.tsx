'use client';

import { useState } from 'react';
import CommandShell from '@/components/CommandShell';
import RightPanel from '@/components/RightPanel';
import LocalNodeStatusGrid from '@/components/LocalNodeStatusGrid';
import { useAppStore } from '@/lib/store';
import { Shield, Server, Wifi, WifiOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function SovereignPage() {
  const { deploymentMode, connectivityState, setDeploymentMode, setConnectivityState } = useAppStore();

  const localNodes = [
    { nodeId: 'node_001', region: 'north', lastSyncTs: new Date(Date.now() - 30000), health: 'ok' as const },
    { nodeId: 'node_002', region: 'south', lastSyncTs: new Date(Date.now() - 120000), health: 'warning' as const },
    { nodeId: 'node_003', region: 'east', lastSyncTs: new Date(Date.now() - 60000), health: 'ok' as const },
    { nodeId: 'node_004', region: 'west', lastSyncTs: new Date(Date.now() - 300000), health: 'degraded' as const },
  ];

  const deploymentModes = [
    { id: 'on_prem_ot', label: 'On-Prem OT', description: 'Air-gapped operational network' },
    { id: 'sovereign_cloud', label: 'Sovereign Cloud', description: 'Government-controlled cloud' },
    { id: 'lab_demo', label: 'Lab Demo', description: 'Development and demonstration' },
  ];

  const connectivityStates = [
    { id: 'connected', label: 'Connected', icon: Wifi, color: 'text-safety-emerald' },
    { id: 'degraded', label: 'Degraded', icon: Wifi, color: 'text-safety-amber' },
    { id: 'disconnected', label: 'Disconnected', icon: WifiOff, color: 'text-slate-500' },
  ];

  const rightPanelContent = (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-xs font-mono text-text-muted mb-2 uppercase">Deployment Mode</div>
        <div className="space-y-2">
          {deploymentModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setDeploymentMode(mode.id as any)}
              className={`w-full p-2 rounded border text-left text-xs font-mono transition-colors ${
                deploymentMode === mode.id
                  ? 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt'
                  : 'bg-base-800 border-base-700 text-text-secondary hover:bg-base-750'
              }`}
            >
              <div className="font-semibold">{mode.label}</div>
              <div className="text-text-muted">{mode.description}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-mono text-text-muted mb-2 uppercase">Connectivity State</div>
        <div className="space-y-2">
          {connectivityStates.map((state) => {
            const Icon = state.icon;
            return (
              <button
                key={state.id}
                onClick={() => setConnectivityState(state.id as any)}
                className={`w-full p-2 rounded border text-left text-xs font-mono transition-colors flex items-center gap-2 ${
                  connectivityState === state.id
                    ? 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt'
                    : 'bg-base-800 border-base-700 text-text-secondary hover:bg-base-750'
                }`}
              >
                <Icon className={`w-4 h-4 ${state.color}`} />
                <span>{state.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {connectivityState === 'disconnected' && (
        <div className="p-3 bg-safety-amber/20 border border-safety-amber rounded">
          <div className="text-xs font-mono text-safety-amber mb-1">Offline Mode</div>
          <div className="text-xs font-mono text-text-secondary">
            Graph browsing, simulation replay, and handshake viewing continue to work from cache.
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CommandShell
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Runtime Configuration"
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-base-950">
        <div className="p-6 border-b border-base-700">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-safety-cobalt" />
            <h1 className="text-display-title font-mono text-text-primary">Sovereign Runtime</h1>
          </div>
          <p className="text-body text-text-secondary">
            Air-gapped operation, local node autonomy, and offline capability
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-base-900 rounded border border-base-700">
                <div className="text-xs font-mono text-text-muted mb-1 uppercase">Deployment Mode</div>
                <div className="text-lg font-mono text-text-primary">
                  {deploymentModes.find((m) => m.id === deploymentMode)?.label}
                </div>
              </div>
              <div className="p-4 bg-base-900 rounded border border-base-700">
                <div className="text-xs font-mono text-text-muted mb-1 uppercase">Connectivity</div>
                <div className="flex items-center gap-2">
                  {connectivityState === 'connected' && (
                    <CheckCircle className="w-5 h-5 text-safety-emerald" />
                  )}
                  {connectivityState === 'degraded' && (
                    <AlertTriangle className="w-5 h-5 text-safety-amber" />
                  )}
                  {connectivityState === 'disconnected' && (
                    <WifiOff className="w-5 h-5 text-slate-500" />
                  )}
                  <span className="text-lg font-mono text-text-primary">
                    {connectivityStates.find((s) => s.id === connectivityState)?.label}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-label font-mono text-text-muted mb-3 uppercase">
                Local Nodes
              </div>
              <LocalNodeStatusGrid nodes={localNodes} />
            </div>

            <div className="pt-6 border-t border-base-700">
              <div className="text-label font-mono text-text-muted mb-3 uppercase">
                Offline Capabilities
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-base-900 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-muted mb-2">Graph Browsing</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-safety-emerald" />
                    <span className="text-sm font-mono text-safety-emerald">Available</span>
                  </div>
                  <div className="text-xs font-mono text-text-secondary mt-2">
                    Works from cached graph data
                  </div>
                </div>
                <div className="p-4 bg-base-900 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-muted mb-2">Simulation Replay</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-safety-emerald" />
                    <span className="text-sm font-mono text-safety-emerald">Available</span>
                  </div>
                  <div className="text-xs font-mono text-text-secondary mt-2">
                    Replay from local incident data
                  </div>
                </div>
                <div className="p-4 bg-base-900 rounded border border-base-700">
                  <div className="text-xs font-mono text-text-muted mb-2">Handshake Viewing</div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-safety-emerald" />
                    <span className="text-sm font-mono text-safety-emerald">Available</span>
                  </div>
                  <div className="text-xs font-mono text-text-secondary mt-2">
                    View existing packets from cache
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-base-700">
              <div className="text-label font-mono text-text-muted mb-3 uppercase">
                Signed Updates
              </div>
              <div className="p-4 bg-base-900 rounded border border-base-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-text-secondary">Model Version</span>
                    <span className="text-sm font-mono text-text-primary">prototype_v1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-text-secondary">Config Hash</span>
                    <span className="text-sm font-mono text-text-primary">a19f3c...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-text-secondary">Signature Status</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-safety-emerald" />
                      <span className="text-sm font-mono text-safety-emerald">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CommandShell>
  );
}
