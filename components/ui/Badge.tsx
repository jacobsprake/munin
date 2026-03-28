'use client';

import { cn } from '@/lib/utils';

type BadgeStatus = 'ok' | 'warning' | 'active' | 'degraded' | 'disconnected' | 'authorized' | 'error' | 'unknown';

export interface BadgeProps {
  status?: BadgeStatus;
  variant?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function Badge({ status, children, className }: BadgeProps) {
  const variants: Record<BadgeStatus, string> = {
    ok: 'bg-safety-emerald/20 border-safety-emerald text-safety-emerald',
    warning: 'bg-safety-amber/20 border-safety-amber text-safety-amber',
    active: 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt',
    degraded: 'bg-safety-amber/20 border-safety-amber text-safety-amber',
    disconnected: 'bg-safety-amber/20 border-safety-amber text-safety-amber',
    authorized: 'bg-safety-emerald/20 border-safety-emerald text-safety-emerald',
    error: 'bg-red-900/30 border-red-600 text-red-400',
    unknown: 'bg-base-800 border-base-600 text-text-secondary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-label mono rounded border',
        status ? variants[status] : '',
        className
      )}
    >
      {children}
    </span>
  );
}

export { Badge };
