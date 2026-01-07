'use client';

import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'authorize';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  variant = 'secondary',
  onClick,
  disabled,
  className,
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 text-body mono font-medium rounded border transition-colors';
  
  const variants = {
    primary: 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt hover:bg-safety-cobalt/30 glow-cobalt',
    secondary: 'bg-base-800 border-base-700 text-text-primary hover:bg-base-750',
    ghost: 'bg-transparent border-transparent text-text-secondary hover:bg-base-800 hover:text-text-primary',
    danger: 'bg-base-800 border-red-500/50 text-red-400 hover:bg-red-500/10',
    authorize: 'bg-safety-cobalt/20 border-safety-cobalt text-safety-cobalt hover:bg-safety-cobalt/30 glow-cobalt border-2',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], disabled && 'opacity-50 cursor-not-allowed', className)}
    >
      {variant === 'authorize' && <Lock className="w-4 h-4 inline mr-2" strokeWidth={1.5} />}
      {children}
    </button>
  );
}

