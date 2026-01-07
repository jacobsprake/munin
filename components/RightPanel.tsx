'use client';

import { ReactNode } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface RightPanelProps {
  title?: string;
  children?: ReactNode;
  onToggle?: () => void;
  collapsed?: boolean;
}

export default function RightPanel({ title, children, onToggle, collapsed }: RightPanelProps) {
  if (collapsed && onToggle) {
    return (
      <button
        onClick={onToggle}
        className="w-8 bg-base-900 border-l border-base-700 flex items-center justify-center hover:bg-base-800 transition-colors"
        title="Expand panel"
      >
        <ChevronLeft className="w-4 h-4 text-text-secondary" />
      </button>
    );
  }

  return (
    <div className="w-[440px] bg-base-900 border-l border-base-700 flex flex-col overflow-hidden">
      {title && (
        <div className="h-12 border-b border-base-700 flex items-center justify-between px-4">
          <h2 className="text-panel-title mono font-semibold text-text-primary">{title}</h2>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-base-800 rounded transition-colors"
              title="Collapse panel"
            >
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </button>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {children || (
          <div className="p-4 text-text-muted text-body text-center py-8">
            Select a node or edge to view details
          </div>
        )}
      </div>
    </div>
  );
}
