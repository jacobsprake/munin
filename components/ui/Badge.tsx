'use client';

import { cn } from '@/lib/utils';

type BadgeStatus = 'ok' | 'warning' | 'active' | 'degraded' | 'disconnected' | 'authorized';

interface BadgeProps {
  status: BadgeStatus;
  children?: React.ReactNode;
  className?: string;
}

export default function Badge({ status, children, className }: BadgeProps) {
  const variants = {
    ok: 'bg-safety-emerald/20 border-safety-emerald text-safety-emerald',
    warning: 'bg-safety-amber/20 border-safety-amber text-safety-amber',
    active: 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt',
    degraded: 'bg-safety-amber/20 border-safety-amber text-safety-amber',
    disconnected: 'bg-safety-amber/20 border-safety-amber text-safety-amber',
    authorized: 'bg-safety-emerald/20 border-safety-emerald text-safety-emerald',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-label mono rounded border',
        variants[status],
        className
      )}
    >
      {children}
    </span>
  );
}


