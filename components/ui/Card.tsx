'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children?: ReactNode;
  className?: string;
  title?: string;
  variant?: 'default' | 'evidence' | 'playbook' | 'node' | 'packet';
}

export function Card({ children, className, title, variant = 'default' }: CardProps) {
  return (
    <div
      className={cn(
        'bg-base-850 border border-base-700 rounded p-4',
        variant === 'evidence' && 'bg-base-800',
        variant === 'playbook' && 'bg-base-800 border-safety-cobalt/30',
        className
      )}
    >
      {title && (
        <h3 className="text-panel-title mono font-semibold text-text-primary mb-3">{title}</h3>
      )}
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn('mb-3', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children?: ReactNode; className?: string }) {
  return <h3 className={cn('text-panel-title mono font-semibold text-text-primary', className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}

export default Card;
