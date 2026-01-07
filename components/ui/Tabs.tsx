'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  items: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export default function Tabs({ items, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-base-700', className)}>
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onTabChange(item)}
          className={cn(
            'px-4 py-2 text-body mono border-b-2 transition-colors',
            activeTab === item
              ? 'border-safety-cobalt text-safety-cobalt'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

