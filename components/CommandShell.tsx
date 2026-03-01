'use client';

import { ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import TopBar from './TopBar';
import LeftRail from './LeftRail';
import RightPanel from './RightPanel';
import StatusStrip from './StatusStrip';

interface CommandShellProps {
  children?: ReactNode;
  rightPanelContent?: ReactNode;
  rightPanelTitle?: string;
  rightPanelCollapsed?: boolean;
  onRightPanelToggle?: () => void;
}

export default function CommandShell({
  children,
  rightPanelContent,
  rightPanelTitle,
  rightPanelCollapsed = false,
  onRightPanelToggle,
}: CommandShellProps) {
  const { warRoomMode, emergencyMode, emergencyLevel } = useAppStore();

  return (
    <div className={`fixed inset-0 flex flex-col text-text-primary overflow-hidden transition-colors ${
      emergencyMode 
        ? 'bg-black'
        : 'bg-base-950'
    }`}>
      {/* Classification Banner — Top (government standard) */}
      <div className={`h-6 flex items-center justify-center text-[10px] font-mono font-bold tracking-[0.15em] uppercase ${
        emergencyMode
          ? 'bg-red-800 border-b border-red-600 text-red-200'
          : 'bg-emerald-900/80 border-b border-emerald-700/50 text-emerald-300/90'
      }`}>
        {emergencyMode
          ? 'SECRET — NATIONAL EMERGENCY PROTOCOL ACTIVE — RESTRICTED ACCESS'
          : 'OFFICIAL — Sovereign Infrastructure Orchestration Platform'
        }
      </div>
      <TopBar />
      {emergencyMode && (
        <div className="h-8 bg-red-950 border-b border-red-600 flex items-center px-6 text-label text-red-400 mono">
          <div className="flex gap-4">
            <span className="text-red-500 animate-pulse">●</span>
            <span>CMI PROTOCOL ACTIVE — STATE OF EMERGENCY | LEVEL: {emergencyLevel.toUpperCase()} | MINISTRY OF DEFENSE AUTHORIZATION REQUIRED</span>
          </div>
        </div>
      )}
      {warRoomMode && !emergencyMode && (
        <div className="h-8 bg-base-900 border-b border-base-700 flex items-center px-6 text-label text-text-secondary mono">
          <div className="flex gap-4">
            <span className="text-safety-amber animate-pulse">●</span>
            <span>INCIDENT: FLOOD EVENT — Basin East | SEVERITY: HIGH | T+00:45</span>
          </div>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <LeftRail />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
          <RightPanel
            title={rightPanelTitle}
            onToggle={onRightPanelToggle}
            collapsed={rightPanelCollapsed}
          >
            {rightPanelContent}
          </RightPanel>
        </div>
      </div>
      <StatusStrip />
      {/* Classification Banner — Bottom (government standard) */}
      <div className={`h-6 flex items-center justify-center text-[10px] font-mono font-bold tracking-[0.15em] uppercase ${
        emergencyMode
          ? 'bg-red-800 border-t border-red-600 text-red-200'
          : 'bg-emerald-900/80 border-t border-emerald-700/50 text-emerald-300/90'
      }`}>
        {emergencyMode
          ? 'SECRET — NATIONAL EMERGENCY PROTOCOL ACTIVE — RESTRICTED ACCESS'
          : 'OFFICIAL — Sovereign Infrastructure Orchestration Platform'
        }
      </div>
    </div>
  );
}
