'use client';

import { ReactNode } from 'react';
import { useAppStore } from '@/lib/store';
import TopBar from './TopBar';
import LeftRail from './LeftRail';
import RightPanel from './RightPanel';
import StatusStrip from './StatusStrip';

interface CommandShellProps {
  children: ReactNode;
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
  const { warRoomMode } = useAppStore();

  return (
    <div className="fixed inset-0 flex flex-col bg-base-950 text-text-primary overflow-hidden">
      <TopBar />
      {warRoomMode && (
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
    </div>
  );
}
