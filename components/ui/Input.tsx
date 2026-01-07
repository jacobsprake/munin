'use client';

import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-label mono text-text-secondary uppercase">
          {label}
        </label>
      )}
      <input
        className={cn(
          'bg-base-800 border border-base-700 text-text-primary text-body px-3 py-2 rounded mono',
          'focus:outline-none focus:border-safety-cobalt focus:ring-1 focus:ring-safety-cobalt/20',
          className
        )}
        {...props}
      />
    </div>
  );
}

